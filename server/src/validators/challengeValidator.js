import { z } from 'zod';

export const createChallengeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
  mediaUrl: z.string().optional().default(''),
  challengeType: z.enum(['automatic', 'manual']).default('manual'),
  targetType: z.enum(['cardio_km', 'workout_days', 'calories', 'manual']).default('manual'),
  targetValue: z.number().default(1),
  gymBranch: z.string().optional().default(''),
  startDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
});
