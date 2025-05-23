import { tool } from "ai";
import { z } from "zod";

export const browserAgentTool = tool({
  description: "Specialized agent for tasks that require interacting with a web browser, such as searching for information, summarizing webpages, or performing browser-based actions as delegated by the main assistant.",
  parameters: z.object({
    user_id: z.string().describe("The user ID"),
    prompt: z.string().describe("The prompt to browse the web"),
    url: z.string().describe("The URL of the current project's public address"),
  }),
  execute: async ({ user_id, prompt, url }) => {
    console.log("browserAgentTool calling", user_id, prompt, url);
    const response = await fetch(`${process.env.SEAWEED_ENGINE_URL!}/browser/full_flow`, {
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
