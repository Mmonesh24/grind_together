import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

import User from './src/models/User.js';

const reset = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const hash = await bcrypt.hash('grind123', 12);
        
        const result = await User.updateMany(
            { email: { $in: ['moneshtvm@gmail.com', 'monesh24developer@gmail.com', 'monesh2310658@ssn.edu.in'] } },
            { $set: { passwordHash: hash } }
        );
        
        console.log(`✅ Reset ${result.modifiedCount} users to password: grind123`);
        console.log(`New Hash: ${hash}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

reset();
