import mongoose from 'mongoose';

const driveEnrollmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    driveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlacementDrive',
        required: true,
        index: true,
    },
    enrolledAt: {
        type: Date,
        default: Date.now,
    },
    bestScore: {
        type: Number,
        default: null,
    },
    sessionsCompleted: {
        type: Number,
        default: 0,
    },
    certificateIssued: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

driveEnrollmentSchema.index({ userId: 1, driveId: 1 }, { unique: true });

const DriveEnrollment = mongoose.model('DriveEnrollment', driveEnrollmentSchema);
export default DriveEnrollment;
