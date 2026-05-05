import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true, trim: true },
    category:    { type: String, default: 'General' },
    roles:       { type: [String], default: [] },
    description: { type: String, default: '' },
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });

const Skill = mongoose.model('Skill', skillSchema);
export default Skill;
