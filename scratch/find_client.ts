import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
    role: String,
    email: String,
    fullName: String,
});

async function findClient() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI not found');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const client = await User.findOne({ role: 'client' });
        if (client) {
            console.log(`Client Found: ${client.email}`);
        } else {
            console.log('No client found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findClient();
