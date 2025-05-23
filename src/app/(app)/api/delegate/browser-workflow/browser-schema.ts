import { z } from 'zod';

// Schemas for the Request Body (BrowserContextFlowRequest)

export const UserMetadataSchema = z.object({
  website_url: z.string().url(),
  // last_active_timestamp is typically handled by the server, 
  // but if sent from client, it should be a string (e.g., ISO date string)
  last_active_timestamp: z.string().datetime().optional(), 
});

export const BrowserContextConfigSchema = z.object({
  window_width: z.number().int().positive().optional(),
  window_height: z.number().int().positive().optional(),
  locale: z.string().optional(),
  user_agent: z.string().optional(),
  allowed_domains: z.array(z.string()).optional(),
  maximum_wait_page_load_time: z.number().int().positive().optional(),
  highlight_elements: z.boolean().optional(),
  keep_alive: z.boolean().optional(),
  save_recording_path: z.string().optional(),
});

export const BrowserAgentRequestSchema = z.object({
  userId: z.string(),
  prompt: z.string(),
  contextConfig: BrowserContextConfigSchema,
  metadata: UserMetadataSchema,
});

// Schemas for the Response Body (BrowserContextFlowResponse -> AgentHistoryList)

// Based on AgentHistory.model_dump and AgentOutput structure
// We'll use z.any() for very complex or less defined parts initially

export const AgentActionSchema = z.object({
  // Action structure is generic here, depends on specific actions from your Python code
  // Example: action_type: z.string(), value: z.any(), ...
}).passthrough(); // Allows any fields for individual actions

export const AgentOutputSchema = z.object({
  current_state: z.record(z.any()), // Represents model_dump of current_state
  action: z.array(AgentActionSchema),
});

export const ActionResultSchema = z.object({
  // Structure based on what ActionResult.model_dump() would produce
}).passthrough(); // Allows any fields for individual action results

export const BrowserStateHistorySchema = z.record(z.any()); // Represents state.to_dict()

export const StepMetadataSchema = z.record(z.any()).nullable(); // Represents metadata.model_dump() or null

export const AgentHistorySchema = z.object({
  model_output: AgentOutputSchema.nullable(),
  result: z.array(ActionResultSchema),
  state: BrowserStateHistorySchema,
  metadata: StepMetadataSchema,
});

export const BrowserAgentResponseSchema = z.object({
    final_result: z.string(),
});

// Infer TypeScript types from Zod schemas if needed
export type UserMetadata = z.infer<typeof UserMetadataSchema>;
export type BrowserContextConfig = z.infer<typeof BrowserContextConfigSchema>;
export type BrowserAgentRequest = z.infer<typeof BrowserAgentRequestSchema>;

export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type ActionResult = z.infer<typeof ActionResultSchema>;
export type BrowserStateHistory = z.infer<typeof BrowserStateHistorySchema>;
export type StepMetadata = z.infer<typeof StepMetadataSchema>;
export type AgentHistory = z.infer<typeof AgentHistorySchema>;
export type BrowserAgentResponse = z.infer<typeof BrowserAgentResponseSchema>;
