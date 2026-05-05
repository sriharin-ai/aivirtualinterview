import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const organizationSchema = new mongoose.Schema({
    name:          { type: String, required: true, trim: true },
    type:          { type: String, enum: ['college', 'corporate'], required: true },
    country:       { type: String, default: '' },
    orgCode:       { type: String, required: true, unique: true, trim: true, uppercase: true },
    adminUsername: { type: String, required: true, unique: true, trim: true },
    adminPassword: { type: String, required: true },
    contactEmail:  { type: String, default: '' },
    plan:          { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
    isActive:      { type: Boolean, default: true },
    description:   { type: String, default: '' },
    maxUsers:      { type: Number, default: 100 },
    digestConfig:  {
        enabled:    { type: Boolean, default: false },
        emails:     [{ type: String }],
        dayOfWeek:  { type: Number, default: 1, min: 0, max: 6 },
        hour:       { type: Number, default: 8,  min: 0, max: 23 },
    },
    departments: [{ type: String, trim: true }],
    batches: [{
        name:        { type: String, required: true, trim: true },
        targetScore: { type: Number, default: null },
        targetDate:  { type: String, default: null },
    }],
}, { timestamps: true });

organizationSchema.pre('save', async function (next) {
    if (!this.isModified('adminPassword')) return next();
    const salt = await bcrypt.genSalt(10);
    this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
    next();
});

organizationSchema.methods.matchPassword = async function (entered) {
    return bcrypt.compare(entered, this.adminPassword);
};

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
