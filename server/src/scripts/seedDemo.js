import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import DailyLog from '../models/DailyLog.js';
import DailyPlan from '../models/DailyPlan.js';
import Challenge from '../models/Challenge.js';
import IndianMeal from '../models/IndianMeal.js';

const USERS = [
  {
    name: 'Monesh M',
    email: 'moneshtvm@gmail.com',
    role: 'trainee',
    password: 'grind123',
    branch: 'Central',
    goal: 'Build Muscle',
    weight: 75,
  },
  {
    name: 'Monishkumar',
    email: 'monesh24developer@gmail.com',
    role: 'trainee',
    password: 'grind123',
    branch: 'Uptown',
    goal: 'Lose Weight',
    weight: 88,
  },
  {
    name: 'Paveethiran SK',
    email: 'monesh2310658@ssn.edu.in',
    role: 'trainer',
    password: 'grind123',
    branch: 'Central',
  }
];

const seedDemo = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in .env');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB for Demo Seeding...');

    // 1. Clear existing demo users and their data
    const emails = USERS.map(u => u.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    const userIds = existingUsers.map(u => u._id);

    await DailyLog.deleteMany({ userId: { $in: userIds } });
    await DailyPlan.deleteMany({ user_id: { $in: userIds } });
    await Challenge.deleteMany({ creatorId: { $in: userIds } });
    await User.deleteMany({ email: { $in: emails } });
    console.log('🗑️ Cleared existing demo data for these users.');

    // 2. Create Users
    const passwordHash = await bcrypt.hash('grind123', 12);
    const createdUsers = [];

    for (const u of USERS) {
      const user = await User.create({
        email: u.email,
        passwordHash,
        role: u.role,
        profile: {
          name: u.name,
          gymBranch: u.branch,
          onboardingComplete: true,
          startingStats: {
            weight: u.weight || 0,
            fitnessGoal: u.goal || '',
            activity_level: 'high',
          }
        },
        gamification: {
          totalPoints: Math.floor(Math.random() * 500) + 100,
          currentStreak: Math.floor(Math.random() * 10) + 2,
        }
      });
      createdUsers.push(user);
    }
    console.log(`✨ Created ${createdUsers.length} Demo Users.`);

    const monesh = createdUsers.find(u => u.profile.name === 'Monesh M');
    const monish = createdUsers.find(u => u.profile.name === 'Monishkumar');
    const pavee = createdUsers.find(u => u.profile.name === 'Paveethiran SK');

    // 3. Generate 7 Days of History (DailyLogs)
    const trainees = [monesh, monish];
    for (const trainee of trainees) {
      const history = [];
      const startWeight = trainee.profile.startingStats.weight;
      
      for (let i = 7; i >= 1; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        // Simulated weight variation
        const weight = trainee.profile.startingStats.fitnessGoal === 'Lose Weight' 
          ? startWeight - (0.1 * (7 - i)) 
          : startWeight + (0.05 * (7 - i));

        history.push({
          userId: trainee._id,
          date,
          checklist: { 
            water: true, 
            protein: true, 
            workout: i % 2 === 0,
            breakfast: true, lunch: true, dinner: true, snacks: true 
          },
          metrics: {
            caloriesBurned: Math.floor(Math.random() * 400) + 300,
            weightKg: Number(weight.toFixed(1)),
            muscleSplit: i % 2 === 0 ? 'Push' : 'Pull',
            cardioDistanceKm: Math.floor(Math.random() * 5) + 2,
            cardioTimeMin: Math.floor(Math.random() * 30) + 15,
          },
          notes: `Day ${7-i+1} of training. Feeling strong!`
        });
      }
      await DailyLog.insertMany(history);
      console.log(`📈 Generated 7 days history for ${trainee.profile.name}.`);
    }

    // 4. Create Today's Daily Plan
    const meals = await IndianMeal.find().limit(10);
    for (const trainee of trainees) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Pick 4 random meals
        const planMeals = meals.sort(() => 0.5 - Math.random()).slice(0, 4).map(m => ({
            name: m.name,
            mealType: m.mealType,
            calories: m.calories,
            protein: m.protein,
            completed: Math.random() > 0.5
        }));

        await DailyPlan.create({
            user_id: trainee._id,
            date: today,
            goal: trainee.profile.startingStats.fitnessGoal === 'Lose Weight' ? 'weight_loss' : 'muscle_gain',
            exercises: [
                { name: 'Pushups', muscle_group: 'Chest', sets: 3, reps: '15', completed: true },
                { name: 'Squats', muscle_group: 'Legs', sets: 3, reps: '20', completed: false }
            ],
            meals: planMeals,
            calories_target: 2500,
            protein_target: 150,
            waterTarget: 3.5,
            waterConsumed: 2.1,
            calories_consumed: planMeals.reduce((sum, m) => sum + (m.completed ? m.calories : 0), 0)
        });
        console.log(`🎯 Created Today's Daily Plan for ${trainee.profile.name}.`);
    }

    // 5. Create a Challenge by Trainer
    const challenge = await Challenge.create({
        creatorId: pavee._id,
        title: '30-Day Lean Muscle Transformation',
        description: 'Consistent lifting and clean eating for 30 days to build lean mass.',
        targetValue: 30,
        targetType: 'workout_days',
        gymBranch: 'Central',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        participants: [
            { userId: monesh._id, currentProgress: 12 },
            { userId: monish._id, currentProgress: 8 }
        ]
    });
    console.log(`🏆 Created Challenge: ${challenge.title} by ${pavee.profile.name}.`);

    console.log('--- DEMO SEEDING COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  }
};

seedDemo();
