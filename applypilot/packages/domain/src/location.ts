import { z } from 'zod';

export const LocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  raw: z.string().default(''),
  isRemote: z.boolean().default(false),
  timezone: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;
