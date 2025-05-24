import { buildSystemPrompt, getClaudeModel } from '@/providers/backbone-provider/backbone-provider';
import { browserAgentTool } from '@/providers/tools-provider/browser-agent-tool';
import { codebaseAgentTool } from '@/providers/tools-provider/codebase-agent-tool';
import { askConfirmationTool } from '@/providers/tools-provider/ask-confirmaion-tool';
import { codebaseEditorCommandTool, codebaseFindFilesTool, codebaseNpmScriptTool } from '@/providers/tools-provider/codebase-tool';
import { streamText, UIMessage, appendClientMessage, convertToModelMessages } from 'ai';
import { User } from '@/payload-types';
import { getUserProjectById } from '@/database/actions/user-projects-actions';
import { saveSessionMessages, convertResponseMessagesToUIMessage } from '@/database/actions/project-sessions-actions';

export async function POST(req: Request) {
  const reqBody = await req.json();
  const startTime = Date.now();

  // console.log("reqBody", JSON.stringify(reqBody, null, 2));

  const { messages, user, projectId, projectSessionId }: { messages: UIMessage[], user: User, projectId: string, projectSessionId: string } = reqBody;

  let customInfo = '';
  let project = null;
  if (!projectId) {
    console.warn('No projectId provided, skipping project-related logic.');
    customInfo = `The current active user's id is ${user.id}. No project context is available.`;
  } else {
    project = await getUserProjectById(projectId);
    customInfo = `
      The current active user's id is ${user.id}
      The current active user's project is:
      - Project Public Address: ${project?.public_address}
      You should now dedicated to operate on the project, you could pass the project's public address to the browserAgentTool to browse the project's website or to the codebaseAgentTool to modify the project's codebase.
    `;
  }

  // console.log("customInfo", customInfo);

  const result = streamText({
    model: getClaudeModel('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(customInfo),
    messages: convertToModelMessages(messages),
    tools: {
      browserAgentTool,
      // codebaseAgentTool,
      codebaseFindFilesTool,
      codebaseEditorCommandTool,
      codebaseNpmScriptTool,
      // askConfirmationTool,
    },
    toolCallStreaming: true,
    onError: async (error) => {
      console.log("error", error);
    },
    async onFinish({ response }) {
      if (!projectSessionId) {
        console.warn('No projectSessionId provided, skipping saveSessionMessages.');
        return;
      }
      const newUIMessage = await convertResponseMessagesToUIMessage(response.messages);
      if (newUIMessage) {
        await saveSessionMessages(projectSessionId, appendClientMessage({ messages, message: newUIMessage }));
      } else {
        console.log("No parts generated from response.messages to save.");
      }
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }): any => {
      if (part.type === 'finish-step') {
        return {
          model: part.response.modelId, // update with the actual model id
          duration: Date.now() - startTime,
        };
      }
      // when the message is finished, send additional information:
      if (part.type === 'finish') {
        return {
          totalTokens: part.totalUsage.totalTokens,
        };
      }
    },
  });
}