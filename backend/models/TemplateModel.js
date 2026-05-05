import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
    name:          { type: String, required: true, unique: true, trim: true },
    description:   { type: String, default: '' },
    role:          { type: String, required: true },
    level:         { type: String, required: true },
    interviewType: { type: String, enum: ['oral-only', 'coding-mix'], default: 'coding-mix' },
    skills:        { type: [String], default: [] },
    easyCount:     { type: Number, default: 2 },
    mediumCount:   { type: Number, default: 3 },
    hardCount:     { type: Number, default: 2 },
    codingCount:   { type: Number, default: 2 },
    oralCount:     { type: Number, default: 3 },
    isActive:      { type: Boolean, default: true },
}, { timestamps: true });

const Template = mongoose.model('Template', templateSchema);
export default Template;
