import { tool } from "ai";
import { z } from "zod";

export const askConfirmationTool = tool({
  description: "Ask user for confirmation, the user will respond with 'approve' or 'reject'",
  parameters: z.object({
    proposition: z.string().describe("The proposition to ask the user for confirmation"),
  }),
});