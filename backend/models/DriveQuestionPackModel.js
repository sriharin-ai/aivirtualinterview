import mongoose from 'mongoose';

const driveQuestionPackSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
    },
    interviewRole: {
        type: String,
        default: '',
    },
    interviewLevel: {
        type: String,
        default: '',
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionBank',
    }],
}, { timestamps: true });

const DriveQuestionPack = mongoose.model('DriveQuestionPack', driveQuestionPackSchema);
export default DriveQuestionPack;
