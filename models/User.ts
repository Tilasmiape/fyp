import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    fullName: string;
    email: string;
    password: string;
    role: 'client' | 'choreographer' | 'super-admin';
    gender?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    bio?: string;
    profileImage?: string;
    danceStyles?: string[];
    pricePerSession?: number;
    danceVideos?: {
        id: string;
        url: string;
        title: string;
        description?: string;
        uploadedAt: Date;
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
        danceVideos: {
            type: [
                {
                    id: { type: String, required: true },
                    url: { type: String, required: true },
                    title: { type: String, required: true, trim: true },
                    description: { type: String, default: '', trim: true },
                    uploadedAt: { type: Date, default: Date.now },
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
