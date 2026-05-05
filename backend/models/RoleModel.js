import mongoose from 'mongoose';

const levelConfigSchema = new mongoose.Schema({
    level: { type: String, required: true },
    easyCount:   { type: Number, default: 2 },
    mediumCount: { type: Number, default: 3 },
    hardCount:   { type: Number, default: 2 },
    codingCount: { type: Number, default: 2 },
    oralCount:   { type: Number, default: 3 },
}, { _id: false });

const roleSchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    levels:      { type: [String], default: ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff'] },
    levelConfigs:{ type: [levelConfigSchema], default: [] },
    hasCoding:   { type: Boolean, default: true },
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
