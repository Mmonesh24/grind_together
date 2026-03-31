import { z } from 'zod';

export const createChallengeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  targetType: z.enum(['cardio_km', 'workout_days', 'calories']),
  targetValue: z.number().positive('Target must be positive'),
  gymBranch: z.string().optional().default(''),
  startDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
});
