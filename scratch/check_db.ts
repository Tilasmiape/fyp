import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
    role: String,
    status: String,
    approvalStatus: String,
    fullName: String,
});

async function checkChoreographers() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI not found');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const choreographers = await User.find({ role: 'choreographer' });
        console.log(`Total choreographers: ${choreographers.length}`);

        choreographers.forEach(c => {
            console.log(`- ${c.fullName}: Status=${c.status}, ApprovalStatus=${c.approvalStatus}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkChoreographers();
