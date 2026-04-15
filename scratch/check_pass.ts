import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: String,
});

async function findPassword() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('MONGO_URI not found');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const user = await User.findOne({ email: 'a@gmail.com' });
        if (user) {
            console.log(`User: ${user.email}, Password: ${user.password}, Role: ${user.role}`);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findPassword();
