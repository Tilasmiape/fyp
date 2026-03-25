import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    fullName: string;
    email: string;
    password: string;
    role: 'client' | 'choreographer' | 'super-admin';
    status: 'active' | 'suspended';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    gender?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    bio?: string;
    location?: string;
    profileImage?: string;
    danceStyles?: string[];
    pricePerSession?: number;
    availabilities?: {
        date: string; // YYYY-MM-DD format
        timeSlots: {
            time: string;
            duration: number; // in minutes
        }[];
    }[];
    danceVideos?: {
        id: string;
        url: string;
        title: string;
        description?: string;
        uploadedAt: Date;
        status: 'pending' | 'approved' | 'rejected';
        rejectionReason?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        fullName: {
            type: String,
            required: [true, 'Please provide a full name'],
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
        },
        role: {
            type: String,
            enum: ['client', 'choreographer', 'super-admin'],
            default: 'client',
        },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: undefined,
    },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
            required: false,
        },
        dateOfBirth: {
            type: String,
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true,
        },
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot be more than 500 characters'],
        },
        location: {
            type: String,
            maxlength: [120, 'Location cannot be more than 120 characters'],
            trim: true,
        },
        profileImage: {
            type: String,
        },
        danceStyles: {
            type: [String],
            default: [],
        },
        pricePerSession: {
            type: Number,
            default: 0,
        },
        availabilities: {
            type: [
                {
                    date: { type: String, required: true }, // YYYY-MM-DD format
                    timeSlots: {
                        type: [
                            {
                                time: { type: String, required: true },
                                duration: { type: Number, required: true, min: 15, max: 180 }, // 15 minutes to 3 hours
                            },
                        ],
                        default: [],
                    },
                },
            ],
            default: [],
        },
        danceVideos: {
            type: [
                {
                    id: { type: String, required: true },
                    url: { type: String, required: true },
                    title: { type: String, required: true, trim: true },
                    description: { type: String, default: '', trim: true },
                    uploadedAt: { type: Date, default: Date.now },
                    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
                    rejectionReason: { type: String, default: '', trim: true },
                },
            ],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
