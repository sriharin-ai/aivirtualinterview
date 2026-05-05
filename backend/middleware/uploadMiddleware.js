import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/");
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname);
        const sessionId = req.params.id || 'unknown';
        cb(null, `${sessionId}-${Date.now()}${ext}`);
    },
});

const audioFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype === "application/octet-stream") {
        cb(null, true);
    } else {
        cb(new Error("Not an audio file"), false);
    }
};

const resumeFilter = (req, file, cb) => {
    const allowed = ["application/pdf", "text/plain", "application/octet-stream"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".pdf") || file.originalname.endsWith(".txt")) {
        cb(null, true);
    } else {
        cb(new Error("Resume must be a PDF or text file"), false);
    }
};

const audioUpload = multer({
    storage,
    fileFilter: audioFilter,
    limits: { fileSize: 1024 * 1024 * 10 },
});

const resumeStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/");
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `resume-${Date.now()}${ext}`);
    },
});

const resumeUpload = multer({
    storage: resumeStorage,
    fileFilter: resumeFilter,
    limits: { fileSize: 1024 * 1024 * 5 },
});

const uploadSingleAudio = audioUpload.single("audioFile");
const uploadResume = resumeUpload.single("resumeFile");

export { uploadSingleAudio, uploadResume };
