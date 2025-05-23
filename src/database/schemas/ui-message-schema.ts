import { z } from 'zod';

// Based on ToolInvocation
const ToolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.any(),
});

const ToolResultSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.any(),
  result: z.any(),
  // isError is not explicitly in the provided ToolResult<string, any, any> but often part of tool results
  isError: z.boolean().optional(), 
});

const ToolInvocationSchema = z.union([
  z.object({
    state: z.literal('partial-call'),
    step: z.number().optional(),
  }).merge(ToolCallSchema),
  z.object({
    state: z.literal('call'),
    step: z.number().optional(),
  }).merge(ToolCallSchema),
  z.object({
    state: z.literal('result'),
    step: z.number().optional(),
  }).merge(ToolResultSchema),
]);

// Based on TextUIPart
const TextUIPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

// Based on ReasoningUIPart
const ReasoningUIPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string(),
  providerMetadata: z.record(z.any()).optional(),
});

// Based on ToolInvocationUIPart
const ToolInvocationUIPartSchema = z.object({
  type: z.literal('tool-invocation'),
  toolInvocation: ToolInvocationSchema,
});

// Based on SourceUrlUIPart
const SourceUrlUIPartSchema = z.object({
  type: z.literal('source-url'),
  sourceId: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  providerMetadata: z.record(z.any()).optional(),
});

// Based on FileUIPart
const FileUIPartSchema = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(), // Can be a URL or Data URL, so basic string validation
});

// Based on StepStartUIPart
const StepStartUIPartSchema = z.object({
  type: z.literal('step-start'),
});

// Schemas with literal types for the discriminated union
const KnownLiteralUIPartSchema = z.discriminatedUnion('type', [
  TextUIPartSchema,
  ReasoningUIPartSchema,
  ToolInvocationUIPartSchema,
  SourceUrlUIPartSchema,
  FileUIPartSchema,
  StepStartUIPartSchema,
]);

// Based on DataUIPart (generic version)
// This schema allows any object for `data` and `type` must start with "data-".
const GenericDataUIPartSchema = z.object({
  type: z.string().refine(val => val.startsWith('data-'), {
    message: "Type must start with 'data-'",
  }),
  id: z.string().optional(),
  data: z.record(z.unknown()), // Represents UIDataTypes
});


// Based on UIMessagePart
// Changed to z.union to correctly handle GenericDataUIPartSchema alongside discriminated literals
const UIMessagePartSchema = z.union([
  KnownLiteralUIPartSchema,
  GenericDataUIPartSchema,
]);

// Based on UIMessage
// METADATA and DATA_PARTS are generic in the TS definition.
// For Zod, we can use z.any() or a more specific schema if known.
export const UIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['system', 'user', 'assistant']),
  metadata: z.record(z.unknown()).optional(), // Represents METADATA
  parts: z.array(UIMessagePartSchema),
});

// Example of how you might define a specific DataUIPart if you knew the structure:
// const SpecificDataSchema = z.object({ myKey: z.string() });
// const SpecificDataUIPartSchema = z.object({
//   type: z.literal('data-specificType'),
//   id: z.string().optional(),
//   data: SpecificDataSchema,
// });
// And then you would add SpecificDataUIPartSchema to the UIMessagePartSchema union.
