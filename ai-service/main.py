import uvicorn
import os
import io
import json
import tempfile
import whisper
import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional
from openai import OpenAI
from pydub import AudioSegment

load_dotenv()

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8000))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct")

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

# Load Whisper model once at startup
print("Loading Whisper model...")
whisper_model = whisper.load_model("base.en")
print("Whisper model loaded.")

app = FastAPI(title="AI Interviewer Microservice", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    role: str = "MERN Stack Developer"
    level: str = "Junior"
    count: int = 5
    interview_type: str = "coding-mix"
    skills: Optional[list[str]] = None
    resume_context: Optional[str] = None
    coding_count: Optional[int] = None
    oral_count: Optional[int] = None
    easy_count: Optional[int] = None
    medium_count: Optional[int] = None
    hard_count: Optional[int] = None


class QuestionResponse(BaseModel):
    questions: list[str]
    model_used: str


class EvaluationRequest(BaseModel):
    question: str
    question_type: str
    role: str
    level: str
    user_answer: Optional[str] = None
    user_code: Optional[str] = None


class EvaluationResponse(BaseModel):
    technicalScore: int
    confidenceScore: int
    aiFeedback: str
    idealAnswer: str


@app.get("/")
async def root():
    return {"message": "AI Interviewer Microservice running!", "model": OPENROUTER_MODEL, "transcription": "local-whisper"}


@app.post("/generate-questions", response_model=QuestionResponse)
async def generate_questions(request: QuestionRequest):
    try:
        if request.coding_count is not None:
            coding_count = request.coding_count
        elif request.interview_type == "coding-mix":
            coding_count = int(request.count * 0.2)
        else:
            coding_count = 0

        oral_count = request.oral_count if request.oral_count is not None else (request.count - coding_count)

        if coding_count > 0:
            instruction = (
                f"The first {coding_count} questions MUST be coding/implementation challenges "
                f"requiring the candidate to write actual code or an algorithm. "
                f"The remaining {oral_count} questions MUST be conceptual oral questions — no coding required."
            )
        else:
            instruction = (
                "All questions MUST be conceptual oral/behavioural questions. "
                "Do NOT generate any coding challenges, implementation tasks, or requests to write code."
            )

        easy_count   = request.easy_count   if request.easy_count   is not None else round(request.count * 0.34)
        medium_count = request.medium_count if request.medium_count is not None else round(request.count * 0.33)
        hard_count   = request.hard_count   if request.hard_count   is not None else (request.count - easy_count - medium_count)

        difficulty_instruction = (
            f"Order the questions by difficulty: the first {easy_count} MUST be easy/warm-up questions, "
            f"the next {medium_count} MUST be medium-difficulty questions, "
            f"and the last {hard_count} MUST be challenging/hard questions."
        )

        skills_context = ""
        if request.skills:
            skills_list = ", ".join(request.skills)
            skills_context = f" The candidate has listed these skills: {skills_list}. Prioritise questions that test these specific skills."

        resume_context = ""
        if request.resume_context:
            trimmed = request.resume_context[:2000]
            resume_context = f" Candidate resume context: {trimmed}. Use this to personalise questions to their background and experience."

        system_prompt = (
            "You are a professional technical interviewer. "
            "Task: Generate interview questions. No conversational text, no numbering, no bullet points. "
            f"Crucial: {instruction} "
            f"{difficulty_instruction} "
            "Output exactly one question per line with no extra formatting."
        )

        user_prompt = (
            f"Generate exactly {request.count} unique interview questions for a {request.level} level {request.role}."
            f"{skills_context}{resume_context}"
        )

        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
        )

        raw_text = response.choices[0].message.content.strip()
        questions = [q.strip() for q in raw_text.split("\n") if q.strip()]
        return QuestionResponse(questions=questions[: request.count], model_used=OPENROUTER_MODEL)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_audio_path = None
    try:
        audio_bytes = await file.read()
        audio_in_memory = io.BytesIO(audio_bytes)
        audio_segment = AudioSegment.from_file(audio_in_memory)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            temp_audio_path = tmp.name
            audio_segment.export(temp_audio_path, format="mp3")

        result = whisper_model.transcribe(temp_audio_path)
        return {"transcription": result["text"].strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest):
    try:
        if request.question_type == "oral":
            assessment_instruction = (
                "This is a conceptual oral question. Focus purely on the candidate's verbal explanation. "
                "Ignore any code blocks. "
                "CRITICAL: If the transcript is empty, nonsense, or irrelevant to the question, SCORE 0."
            )
        else:
            assessment_instruction = (
                "This is a coding challenge question. Evaluate the code logic and efficiency. "
                "Use the transcription only for insight into their thought process. "
                "CRITICAL: If the code is empty, just random comments, or random characters, SCORE 0."
            )

        system_prompt = (
            "You are a strict technical interviewer. "
            "Do NOT hallucinate positive reviews for bad input. "
            "RULE 1: If the answer is gibberish, irrelevant, or missing, return technicalScore:0 and confidenceScore:0. "
            "RULE 2: For idealAnswer, provide a clean Markdown string. Do NOT return a nested JSON object. "
            f"Context: {assessment_instruction} "
            "Respond ONLY with a valid JSON object with these exact keys: "
            "technicalScore (0-100), confidenceScore (0-100), aiFeedback (string), idealAnswer (string)."
        )

        user_prompt = (
            f"Role: {request.role}\n"
            f"Question: {request.question}\n"
            f"Level: {request.level}\n"
            f"Verbal Answer: {request.user_answer or 'No verbal answer provided'}\n"
            f"Code Answer: {request.user_code or 'No code provided'}\n"
        )

        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        response_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if model wraps JSON in them
        if response_text.startswith("```"):
            response_text = response_text.strip("`").strip()
            if response_text.startswith("json"):
                response_text = response_text[4:].strip()

        evaluation_data = json.loads(response_text)

        if "idealAnswer" in evaluation_data and not isinstance(evaluation_data["idealAnswer"], str):
            evaluation_data["idealAnswer"] = json.dumps(evaluation_data["idealAnswer"])

        return EvaluationResponse(**evaluation_data)

    except Exception as e:
        print(f"Evaluation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
