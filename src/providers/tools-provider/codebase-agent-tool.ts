import { tool } from "ai";
import { z } from "zod";

export const codebaseAgentTool = tool({
  description: "Specialized agent for tasks that involve reading, writing, or modifying code in the user's projects, such as refactoring functions, adding features, or performing codebase operations as delegated by the main assistant.",
  parameters: z.object({
    user_id: z.string().describe("The user ID"),
    prompt: z.string().describe("The prompt to modify the codebase"),
    url: z.string().describe("The URL of the current project's public address"),
  }),
  execute: async ({ user_id, prompt, url }) => {
    const response = await fetch(`${process.env.SEAWEED_ENGINE_URL!}/codebase/full_flow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, prompt, url }),
    });
    const data = await response.json();
    return data;
  },
});