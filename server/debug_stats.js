import mongoose from 'mongoose';
import DailyLog from './src/models/DailyLog.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grindtogether');
        console.log('--- DB STATS DEBUG ---');

        const todayMid = new Date();
        todayMid.setHours(0, 0, 0, 0);
        console.log('Midnight reference (Today):', todayMid.toISOString());

        const tomorrowMid = new Date(todayMid);
        tomorrowMid.setDate(tomorrowMid.getDate() + 1);

        const logsCount = await DailyLog.countDocuments({ date: { $gte: todayMid, $lt: tomorrowMid } });
        console.log('Total Logs for today (range):', logsCount);

        const directLogsCount = await DailyLog.countDocuments({ date: todayMid });
        console.log('Total Logs for today (direct match):', directLogsCount);

        const users = await User.find({ role: 'trainee' });
        console.log(`--- Trainees (Count: ${users.length}) ---`);
        for(const u of users) {
          const l = await DailyLog.findOne({ userId: u._id, date: { $gte: todayMid, $lt: tomorrowMid } });
          console.log(`Trainee: ${u.email}, Branch: "${u.profile?.gymBranch}", Logged Today: ${!!l}`);
        }

        const allLogs = await DailyLog.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'email');
        console.log(`--- Recent Logs (Count: ${allLogs.length}) ---`);
        for(const l of allLogs) {
          console.log(`User: ${l.userId?.email}, LogDate: ${l.date.toISOString()}, CreatedAt: ${l.createdAt.toISOString()}`);
        }

        await mongoose.disconnect();
        console.log('--- DEBUG DONE ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
