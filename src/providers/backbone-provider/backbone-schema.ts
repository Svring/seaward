import { z } from 'zod';

export const availableModels = z.object({
  models: z.array(z.string()),
});
