import mongoose from 'mongoose';

const questionBankSchema = new mongoose.Schema({
    questionText:  { type: String, required: true },
    questionType:  { type: String, enum: ['coding', 'oral'], required: true },
    difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    role:          { type: String, required: true },
    level:         { type: String, required: true },
    skills:        { type: [String], default: [] },
    idealAnswer:   { type: String, default: '' },
    isActive:      { type: Boolean, default: true },
    source:        { type: String, enum: ['ai-generated', 'manual'], default: 'ai-generated' },
    usageCount:    { type: Number, default: 0 },
}, { timestamps: true });

const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);
export default QuestionBank;
