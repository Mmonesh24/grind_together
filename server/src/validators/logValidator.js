import { z } from 'zod';

export const createLogSchema = z.object({
  checklist: z
    .object({
      water: z.boolean().optional().default(false),
      protein: z.boolean().optional().default(false),
      workout: z.boolean().optional().default(false),
    })
    .optional(),
  metrics: z
    .object({
      caloriesBurned: z.number().min(0).optional().default(0),
      calorieGoal: z.number().min(0).optional().default(0),
      cardioDistanceKm: z.number().min(0).optional().default(0),
      cardioTimeMin: z.number().min(0).optional().default(0),
      muscleSplit: z
        .enum(['Push', 'Pull', 'Legs', 'Full Body', 'Upper', 'Lower', 'Rest', ''])
        .optional()
        .default(''),
      weightKg: z.number().min(0).optional().default(0),
    })
    .optional(),
  notes: z.string().optional().default(''),
});
