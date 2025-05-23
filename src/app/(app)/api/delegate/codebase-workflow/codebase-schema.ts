import { z } from 'zod';

// Schema for UserProject, based on aim/providers/codebase/codebase_models.py
export const UserProjectSchema = z.object({
  project_address: z.string().url({ message: "Invalid project address URL" }),
  metadata: z.record(z.any()).optional(), // Corresponds to Optional[Dict[str, Any]]
  // last_active_timestamp is handled server-side in the Python model
});

// Schema for the request to the codebase-agent Next.js route
// Based on CodebaseBasicFlowRequest from aim/api/api_server.py
export const CodebaseAgentRequestSchema = z.object({
  userId: z.string(),
  project: UserProjectSchema,
  prompt: z.string(),
});

// Schema for the response from the codebase-agent Next.js route
// Based on CodebaseBasicFlowResponse from aim/api/api_server.py
export const CodebaseAgentResponseSchema = z.object({
  code: z.string(),
  // If the Python endpoint can return an error structure, 
  // you might want to model that here as part of a discriminated union or an optional error field.
  // For now, assuming it only returns { code: string } on success.
});

// Infer TypeScript types from Zod schemas
export type UserProject = z.infer<typeof UserProjectSchema>;
export type CodebaseAgentRequest = z.infer<typeof CodebaseAgentRequestSchema>;
export type CodebaseAgentResponse = z.infer<typeof CodebaseAgentResponseSchema>; 