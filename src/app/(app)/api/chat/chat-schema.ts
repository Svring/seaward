// import { z } from 'zod';

// export const chatTaskAnalysisSchema = z.object({
//   taskType: z.enum(['direct', 'browser', 'codebase', 'mixed']),
//   interpretation: z.string().describe('The interpretation of the user prompt, if the task type is direct, this should be a direct answer to the user prompt, otherwise it should be a description of the task to be performed.'),
// });

// export type ChatTaskAnalysis = z.infer<typeof chatTaskAnalysisSchema>;