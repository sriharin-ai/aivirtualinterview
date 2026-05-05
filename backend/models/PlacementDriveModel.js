import mongoose from 'mongoose';

const placementDriveSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
    },
    companyName: {
        type: String,
        required: true,
        trim: true,
    },
    jobRole: {
        type: String,
        required: true,
        trim: true,
    },
    visitDate: {
        type: Date,
        required: true,
    },
    eligibleDepartments: {
        type: [String],
        default: [],
    },
    eligibleBatches: {
        type: [String],
        default: [],
    },
    minScore: {
        type: Number,
        default: 60,
        min: 0,
        max: 100,
    },
    interviewRole: {
        type: String,
        default: '',
    },
    interviewLevel: {
        type: String,
        default: 'Mid-Level',
    },
    description: {
        type: String,
        default: '',
    },
    questionPackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DriveQuestionPack',
        default: null,
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open',
    },
}, { timestamps: true });

const PlacementDrive = mongoose.model('PlacementDrive', placementDriveSchema);
export default PlacementDrive;
