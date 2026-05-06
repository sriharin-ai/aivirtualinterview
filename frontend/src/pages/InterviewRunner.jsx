// frontend/src/pages/InterviewRunner.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById, submitAnswer, endSession } from '../features/sessions/sessionSlice';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import EvalNotification from '../components/EvalNotification';

const SUPPORTED_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'R Language', value: 'r' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Solidity', value: 'solidity' },
  { label: 'Shell', value: 'shell' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Plain Text', value: 'plaintext' },
];

const ROLE_LANGUAGE_MAP = {
  "MERN Stack Developer": "javascript",
  "MEAN Stack Developer": "typescript",
  "Full Stack Python": "python",
  "Full Stack Java": "java",
  "Frontend Developer": "javascript",
  "Backend Developer": "javascript",
  "Data Scientist": "python",
  "Data Analyst": "python",
  "Machine Learning Engineer": "python",
  "DevOps Engineer": "shell",
  "Cloud Engineer (AWS/Azure/GCP)": "yaml",
  "Cybersecurity Engineer": "python",
  "Blockchain Developer": "solidity",
  "Mobile Developer (iOS/Android)": "swift",
  "Game Developer": "csharp",
  "QA Automation Engineer": "python",
  "UI/UX Designer": "css",
  "Product Manager": "markdown"
};
function InterviewRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeSession, isLoading, message } = useSelector(state => state.sessions);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tipsDismissed, setTipsDismissed] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(false);

  // If submittedLocal[0] is true, we lock Question 0 immediately.
  const [submittedLocal, setSubmittedLocal] = useState({});

  const [drafts, setDrafts] = useState(() => {
    const saved = localStorage.getItem(`drafts_${sessionId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [evalQueue, setEvalQueue] = useState([]);
  const prevEvaluatedRef = useRef({});

  const questionStartTimeRef = useRef(Date.now());
  const questionAccumulatedRef = useRef({});

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    sessionTimerRef.current = setInterval(() => setElapsedTime(s => s + 1), 1000);
    return () => clearInterval(sessionTimerRef.current);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (activeSession?.role) {
      const detectedLang =
        ROLE_LANGUAGE_MAP[activeSession.role] || "plaintext";

      setSelectedLanguage(detectedLang);
    }
  }, [activeSession?.role]);


  useEffect(() => {
    localStorage.setItem(`drafts_${sessionId}`, JSON.stringify(drafts));
  }, [drafts, sessionId]);

  useEffect(() => {
    dispatch(getSessionById(sessionId));
  }, [dispatch, sessionId]);

  useEffect(() => {
    if (!activeSession?.questions) return;
    const newlyEvaluated = [];
    activeSession.questions.forEach((q, i) => {
      if (q.isEvaluated && !prevEvaluatedRef.current[i]) {
        newlyEvaluated.push({ question: q, index: i, id: `${i}-${Date.now()}` });
      }
      prevEvaluatedRef.current[i] = q.isEvaluated;
    });
    if (newlyEvaluated.length > 0) {
      setEvalQueue(prev => [...prev, ...newlyEvaluated]);
    }
  }, [activeSession?.questions]);

  const currentQuestion = activeSession?.questions?.[currentQuestionIndex];


  // 1. Is it submitted in Redux? (Backend confirmed)
  const isReduxSubmitted = currentQuestion?.isSubmitted === true;

  // 2. Did I just click submit locally? (Optimistic update)
  const isLocallySubmitted = submittedLocal[currentQuestionIndex] === true;

  // 3. Lock if EITHER is true
  const isQuestionLocked = isReduxSubmitted || isLocallySubmitted;

  // 4. Show "Analyzing..." status if Locked AND not yet evaluated
  const isProcessing = isQuestionLocked && !currentQuestion?.isEvaluated;


  const pauseQuestionTimer = (idx) => {
    const elapsed = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    questionAccumulatedRef.current[idx] = (questionAccumulatedRef.current[idx] || 0) + elapsed;
  };

  const resumeQuestionTimer = () => {
    questionStartTimeRef.current = Date.now();
  };

  const getTotalTimeSpent = (idx) => {
    const accumulated = questionAccumulatedRef.current[idx] || 0;
    if (idx === currentQuestionIndex) {
      const sinceStart = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      return accumulated + sinceStart;
    }
    return accumulated;
  };

  const getRunningAverage = () => {
    const evaluated = questions.filter(q => q.isEvaluated && q.technicalScore != null);
    if (evaluated.length === 0) return null;
    const sum = evaluated.reduce((acc, q) => acc + q.technicalScore, 0);
    return Math.round(sum / evaluated.length);
  };

  const getNextAdaptiveQuestion = () => {
    const avg = getRunningAverage();
    const unanswered = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => i !== currentQuestionIndex && !q.isSubmitted && !submittedLocal[i]);

    if (unanswered.length === 0) return null;

    let targetDifficulty;
    if (avg === null || (avg >= 40 && avg < 70)) {
      targetDifficulty = 'medium';
    } else if (avg >= 70) {
      targetDifficulty = 'hard';
    } else {
      targetDifficulty = 'easy';
    }

    const getDiff = (q, i) =>
      q.difficulty || (i / questions.length < 0.34 ? 'easy' : i / questions.length < 0.67 ? 'medium' : 'hard');

    const match = unanswered.find(({ q, i }) => getDiff(q, i) === targetDifficulty);
    if (match) return { index: match.i, reason: targetDifficulty, avg };

    return { index: unanswered[0].i, reason: 'next', avg };
  };

  const handleNavigation = (index) => {
    if (index >= 0 && index < activeSession?.questions.length) {
      if (isRecording) stopRecording();
      pauseQuestionTimer(currentQuestionIndex);
      resumeQuestionTimer();
      setCurrentQuestionIndex(index);
      setRecordingTime(0);
    }
  };

  const handleAdaptiveNext = () => {
    const next = getNextAdaptiveQuestion();
    if (next) handleNavigation(next.index);
    else handleNavigation(currentQuestionIndex + 1);
  };

  const updateDraftCode = (newCode) => {
    if (isQuestionLocked) return;
    setDrafts(prev => ({
      ...prev,
      [currentQuestionIndex]: { ...prev[currentQuestionIndex], code: newCode }
    }));
  };

  const startRecording = async () => {
    if (isQuestionLocked) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setDrafts(prev => ({
          ...prev,
          [currentQuestionIndex]: { ...prev[currentQuestionIndex], audioBlob: blob }
        }));
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      toast.error("Microphone denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      clearInterval(timerIntervalRef.current);
      setIsRecording(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (isQuestionLocked) return;
    if (isRecording) stopRecording();

    const draft = drafts[currentQuestionIndex];
    const code = draft?.code || '';
    const audio = draft?.audioBlob;

    if (!code && !audio) {
      toast.warning("Please provide code or an audio answer.");
      return;
    }

    // ✅ 1. OPTIMISTIC UPDATE: Lock UI instantly
    setSubmittedLocal(prev => ({ ...prev, [currentQuestionIndex]: true }));

    const timeSpentSecs = getTotalTimeSpent(currentQuestionIndex);

    const formData = new FormData();
    formData.append('questionIndex', currentQuestionIndex);
    formData.append('timeSpent', timeSpentSecs);
    if (code) formData.append('code', code);
    if (audio) formData.append('audioFile', audio, 'answer.webm');

    // ✅ 2. Send Request
    dispatch(submitAnswer({ sessionId, formData }))
      .unwrap()
      .catch((err) => {
        // If backend fails, UNLOCK so user can try again
        setSubmittedLocal(prev => ({ ...prev, [currentQuestionIndex]: false }));
        toast.error("Submission failed. Please try again.");
      });
  };

  const handleFinishInterview = () => {
    if (!window.confirm("Are you sure you want to finish?")) return;

    dispatch(endSession(sessionId))
      .unwrap()
      .then((result) => {
        localStorage.removeItem(`drafts_${sessionId}`);
        if (result?.justQualifiedDrive) {
          const { companyName, jobRole, bestScore } = result.justQualifiedDrive;
          toast.success(
            `🎉 You qualified for ${companyName}! Your score of ${bestScore}% met the minimum. A certificate is waiting for you.`,
            { autoClose: 8000 }
          );
        }
        navigate(`/review/${sessionId}`);
      })
      .catch(err => toast.error("Could not finish session. Ai is working on it."));
  };

  if (!activeSession) return <div className="text-center py-20 text-slate-400">Loading...</div>;

  const currentDraft = drafts[currentQuestionIndex] || {};
  const questions = activeSession?.questions || [];
  const totalQuestions = questions.length;
  const evaluatedCount = questions.filter(q => q.isEvaluated).length;
  const analyzingCount = questions.filter((q, i) => (q.isSubmitted || submittedLocal[i]) && !q.isEvaluated).length;
  const remainingCount = totalQuestions - evaluatedCount - analyzingCount;
  const progressPercent = totalQuestions > 0 ? Math.round((evaluatedCount / totalQuestions) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      {/* ── Live Eval Notifications ── */}
      {evalQueue.length > 0 && (
        <EvalNotification
          key={evalQueue[0].id}
          question={evalQueue[0].question}
          questionIndex={evalQueue[0].index}
          onNavigate={handleNavigation}
          onDismiss={() => setEvalQueue(prev => prev.slice(1))}
        />
      )}
      {/* ── Progress Header ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-lg font-black text-slate-900">{activeSession.role}</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium uppercase tracking-widest">{activeSession.level} · {activeSession.interviewType}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs">⏱</span>
              <span className="font-mono text-sm font-bold text-slate-700">{formatTime(elapsedTime)}</span>
            </div>
            <button
              onClick={handleFinishInterview}
              disabled={isLoading}
              className="bg-rose-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 text-sm"
            >
              {isLoading ? "Finalizing..." : "Finish Interview"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-slate-500">
              Question <span className="text-slate-900">{currentQuestionIndex + 1}</span> of <span className="text-slate-900">{totalQuestions}</span>
            </span>
            <span className="text-xs font-bold text-emerald-600">{progressPercent}% complete</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          {/* Question dots */}
          <div className="flex gap-1.5 flex-1 flex-wrap">
            {questions.map((q, i) => {
              const nextAdaptive = adaptiveMode ? getNextAdaptiveQuestion() : null;
              const isNextAdaptive = nextAdaptive && nextAdaptive.index === i;
              return (
                <button
                  key={i}
                  onClick={() => handleNavigation(i)}
                  title={`Q${i + 1}: ${q.isEvaluated ? 'Evaluated' : (q.isSubmitted || submittedLocal[i]) ? 'Analyzing…' : isNextAdaptive ? 'Suggested next (adaptive)' : 'Not answered'}`}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all border-2 ${
                    i === currentQuestionIndex
                      ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-md shadow-blue-200'
                      : q.isEvaluated
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : (q.isSubmitted || submittedLocal[i])
                      ? 'bg-amber-400 text-white border-amber-400 animate-pulse'
                      : isNextAdaptive
                      ? 'bg-purple-500 text-white border-purple-500 scale-105 shadow-md shadow-purple-200 animate-pulse'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">{evaluatedCount} done</span>
            </div>
            {analyzingCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-slate-500 font-medium">{analyzingCount} analyzing</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-xs text-slate-500 font-medium">{remainingCount} left</span>
            </div>
            {/* Adaptive toggle */}
            <button
              onClick={() => setAdaptiveMode(m => !m)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                adaptiveMode
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-purple-300 hover:text-purple-500'
              }`}
              title="Toggle adaptive question ordering based on your live score"
            >
              ⚡ Adaptive
            </button>
          </div>
        </div>

        {/* Adaptive hint banner */}
        {adaptiveMode && (() => {
          const next = getNextAdaptiveQuestion();
          if (!next) return null;
          const avg = next.avg;
          const diffLabel = { easy: 'easier', medium: 'medium', hard: 'harder' }[next.reason] || 'next';
          const diffColor = { easy: 'text-emerald-600', medium: 'text-amber-600', hard: 'text-rose-600' }[next.reason] || 'text-slate-600';
          return (
            <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
              <span className="text-purple-500 text-xs">⚡</span>
              <span className="text-xs text-purple-700 font-medium">
                Adaptive mode is active
                {avg !== null ? (
                  <> — avg score <span className="font-black">{avg}</span>, suggesting a <span className={`font-black ${diffColor}`}>{diffLabel}</span> question next (Q{next.index + 1})</>
                ) : (
                  <> — answer a question to get a personalised recommendation</>
                )}
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── Tips Panel — shown only on Q1, dismissed after first read ── */}
      {currentQuestionIndex === 0 && !tipsDismissed && (
        <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <span className="text-xs font-black text-white uppercase tracking-widest">Tips Before You Start</span>
            </div>
            <button
              onClick={() => setTipsDismissed(true)}
              className="text-slate-500 hover:text-white text-lg leading-none transition-colors px-1"
              title="Dismiss"
            >✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700">
            {[
              { icon: '🎙️', title: 'Speak clearly', body: 'Talk through your reasoning out loud — confidence in delivery affects your confidence score.' },
              { icon: '🧠', title: 'Think before coding', body: 'Outline your approach first. Interviewers value structured thinking over speed.' },
              { icon: '✍️', title: 'Write clean code', body: 'Use meaningful variable names and add brief comments to show intent.' },
              { icon: '🔄', title: 'Attempt every question', body: 'A partial answer is better than none. Move on if stuck and come back later.' },
            ].map((tip, i) => (
              <div key={i} className="bg-slate-800/80 px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{tip.icon}</span>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">{tip.title}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 flex justify-end">
            <button
              onClick={() => setTipsDismissed(true)}
              className="text-[10px] font-black text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors"
            >
              Got it, let's go →
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl mb-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Question {currentQuestionIndex + 1}</span>
          {currentQuestion?.questionType === 'coding' ? (
            <span className="inline-flex items-center gap-1.5 bg-violet-500/20 border border-violet-400/30 text-violet-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              <span>⌨️</span> Coding Challenge
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              <span>🎙️</span> Verbal / Oral
            </span>
          )}
          {(() => {
            const d = currentQuestion?.difficulty ||
              (currentQuestionIndex / questions.length < 0.34 ? 'easy' : currentQuestionIndex / questions.length < 0.67 ? 'medium' : 'hard');
            const cfg = {
              easy:   { label: 'Easy',   icon: '🟢', cls: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' },
              medium: { label: 'Medium', icon: '🟡', cls: 'bg-amber-500/20 border-amber-400/30 text-amber-300' },
              hard:   { label: 'Hard',   icon: '🔴', cls: 'bg-rose-500/20 border-rose-400/30 text-rose-300' },
            }[d];
            return (
              <span className={`inline-flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${cfg.cls}`}>
                <span>{cfg.icon}</span> {cfg.label}
              </span>
            );
          })()}
        </div>
        <h2 className="text-2xl mt-2 font-medium leading-relaxed">{currentQuestion?.questionText}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Verbal Answer</h3>

          {!isRecording && !currentDraft.audioBlob ? (
            <button
              onClick={startRecording}
              disabled={isQuestionLocked}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              🎤
            </button>
          ) : isRecording ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center animate-pulse text-white text-3xl cursor-pointer" onClick={stopRecording}>
                ⏹
              </div>
              <p className="mt-4 font-mono text-rose-500 font-bold">{recordingTime}s</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-emerald-500 font-bold text-lg mb-2">Audio Captured ✅</div>
              {!isQuestionLocked && (
                <button onClick={() => setDrafts(prev => ({ ...prev, [currentQuestionIndex]: { ...prev[currentQuestionIndex], audioBlob: null } }))} className="text-xs text-slate-400 underline hover:text-rose-500">
                  Delete & Re-record
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[400px]">
          <div className="flex justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase py-2">Code Editor</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isQuestionLocked}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {SUPPORTED_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <MonacoEditor
            height="100%"
            language={selectedLanguage}
            theme="vs-dark"
            value={currentDraft.code || ''}
            onChange={updateDraftCode}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              readOnly: isQuestionLocked,
              domReadOnly: isQuestionLocked
            }}
          />
        </div>
      </div>

      {currentQuestion?.isEvaluated && (
        <div className="mt-6 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Score bar */}
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Technical Score */}
            <div className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Technical Score</p>
              <div className="flex items-end gap-3">
                <span className={`text-4xl font-black leading-none ${
                  currentQuestion.technicalScore >= 70 ? 'text-emerald-600' :
                  currentQuestion.technicalScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {currentQuestion.technicalScore}
                </span>
                <span className="text-slate-400 text-sm font-bold mb-1">/100</span>
              </div>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    currentQuestion.technicalScore >= 70 ? 'bg-emerald-500' :
                    currentQuestion.technicalScore >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${currentQuestion.technicalScore}%` }}
                />
              </div>
              <p className={`text-[10px] font-bold mt-1.5 ${
                currentQuestion.technicalScore >= 70 ? 'text-emerald-500' :
                currentQuestion.technicalScore >= 40 ? 'text-amber-500' : 'text-rose-500'
              }`}>
                {currentQuestion.technicalScore >= 70 ? 'Strong' : currentQuestion.technicalScore >= 40 ? 'Needs Work' : 'Insufficient'}
              </p>
            </div>

            {/* Confidence Score */}
            <div className="p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Confidence Score</p>
              <div className="flex items-end gap-3">
                <span className={`text-4xl font-black leading-none ${
                  currentQuestion.confidenceScore >= 70 ? 'text-blue-600' :
                  currentQuestion.confidenceScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {currentQuestion.confidenceScore}
                </span>
                <span className="text-slate-400 text-sm font-bold mb-1">/100</span>
              </div>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    currentQuestion.confidenceScore >= 70 ? 'bg-blue-500' :
                    currentQuestion.confidenceScore >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${currentQuestion.confidenceScore}%` }}
                />
              </div>
              <p className={`text-[10px] font-bold mt-1.5 ${
                currentQuestion.confidenceScore >= 70 ? 'text-blue-500' :
                currentQuestion.confidenceScore >= 40 ? 'text-amber-500' : 'text-rose-500'
              }`}>
                {currentQuestion.confidenceScore >= 70 ? 'Confident' : currentQuestion.confidenceScore >= 40 ? 'Uncertain' : 'Low Confidence'}
              </p>
            </div>
          </div>

          {/* AI Feedback text */}
          <div className="px-5 pb-5 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">💡 AI Feedback</p>
            <p className="text-slate-600 text-sm leading-relaxed">{currentQuestion.aiFeedback}</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 px-6 md:px-12 flex justify-between items-center z-50">
        <button
          onClick={() => handleNavigation(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          className="text-slate-500 font-bold text-sm hover:text-slate-800 disabled:opacity-30"
        >
          ← Previous
        </button>

        <div className="flex flex-col items-center">
          {/* ✅ STATUS BAR: Shows if Locked but not Evaluated yet */}
          {isProcessing && message && (
            <div className="mb-2 text-xs font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse border border-blue-100">
              🤖 {message}...
            </div>
          )}

          <button
            onClick={handleSubmitAnswer}
            disabled={isQuestionLocked}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isProcessing ? 'bg-slate-400 cursor-wait' :
              currentQuestion?.isEvaluated ? 'bg-emerald-500' :
                isQuestionLocked ? 'bg-slate-400' :
                  'bg-slate-900 hover:bg-slate-800 active:scale-95'
              }`}
          >
            {isProcessing ? "Analyzing..." : currentQuestion?.isEvaluated ? "Answer Submitted" : isQuestionLocked ? "Submitted" : "Submit Answer"}
          </button>
        </div>

        {adaptiveMode ? (
          <button
            onClick={handleAdaptiveNext}
            disabled={!getNextAdaptiveQuestion()}
            className="flex flex-col items-end text-purple-600 font-bold text-sm hover:text-purple-800 disabled:opacity-30"
          >
            <span>Next ⚡</span>
            {(() => {
              const next = getNextAdaptiveQuestion();
              if (!next) return null;
              const label = { easy: 'easier', medium: 'medium', hard: 'harder' }[next.reason] || 'next';
              return <span className="text-[10px] font-medium text-purple-400 normal-case tracking-normal">→ Q{next.index + 1} ({label})</span>;
            })()}
          </button>
        ) : (
          <button
            onClick={() => handleNavigation(currentQuestionIndex + 1)}
            disabled={currentQuestionIndex === activeSession.questions.length - 1}
            className="text-slate-500 font-bold text-sm hover:text-slate-800 disabled:opacity-30"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

export default InterviewRunner;