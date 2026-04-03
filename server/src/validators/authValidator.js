import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['trainee', 'trainer']).optional().default('trainee'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const onboardingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gymBranch: z.string().min(1, 'Gym branch is required'),
  weight: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  fitnessGoal: z.enum(['Lose Weight', 'Build Muscle', 'Get Fit', 'Endurance']).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  avatar: z.string().optional(),
  gymBranch: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  fitnessGoal: z.string().optional(),
  activity_level: z.enum(['low', 'medium', 'high']).optional(),
  calorieGoal: z.number().min(0).optional(),
});
