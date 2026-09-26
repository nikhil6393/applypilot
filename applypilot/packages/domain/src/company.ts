import { z } from 'zod';

export const CompanySchema = z.object({
  name: z.string().min(1, 'Company name cannot be empty'),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  domain: z.string().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'unknown']).default('unknown'),
  industry: z.string().optional(),
  description: z.string().optional(),
});

export type Company = z.infer<typeof CompanySchema>;
