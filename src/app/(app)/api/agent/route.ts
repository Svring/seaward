import { getSealosModel, buildSystemPrompt, getClaudeModel } from '@/providers/backbone-provider/backbone-provider';
import { browserAgentTool } from '@/providers/tools-provider/browser-agent-tool';
import { codebaseAgentTool } from '@/providers/tools-provider/codebase-agent-tool';
import { codebaseEditorCommandTool, codebaseFindFilesTool, codebaseNpmScriptTool } from '@/providers/tools-provider/codebase-tool';
import { streamText, UIMessage, appendClientMessage, modelMessageSchema, convertToModelMessages, AssistantModelMessage, ToolModelMessage, UIMessagePart, ToolInvocation, TextPart, ToolCallPart, FilePart, ToolResultPart, generateId } from 'ai';
import { UserProject, User } from '@/payload-types';
import { getUserProjectById } from '@/database/actions/user-projects-actions';
import { saveSessionMessages } from '@/database/actions/project-sessions-actions';

export async function POST(req: Request) {
  const reqBody = await req.json();
  const startTime = Date.now();

  console.log("reqBody", reqBody);

  const { messages, user, projectId, projectSessionId }: { messages: UIMessage[], user: User, projectId: string, projectSessionId: string } = reqBody;

  const project = await getUserProjectById(projectId);

  const customInfo = `
    The current active user's id is ${user.id}
    The current active user's project is:
    - Project Public Address: ${project?.public_address}
    You should now dedicated to operate on the project, you could pass the project's public address to the browserAgentTool to browse the project's website or to the codebaseAgentTool to modify the project's codebase.
  `;

  console.log("customInfo", customInfo);

  const result = streamText({
    model: getClaudeModel('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(customInfo),
    messages: convertToModelMessages(messages),
    tools: {
      browserAgentTool,
      codebaseAgentTool,
      codebaseFindFilesTool,
      codebaseEditorCommandTool,
      codebaseNpmScriptTool,
    },
    onError: async (error) => {
      console.log("error", error);
    },
    async onFinish({ response }) {
      const partsForNewMessage: UIMessagePart<any>[] = [];
      let finalRole: 'assistant' = 'assistant';

      for (const msg of response.messages as (AssistantModelMessage | ToolModelMessage)[]) {
        if (msg.role === 'assistant') {
          finalRole = 'assistant';
          if (typeof msg.content === 'string') {
            partsForNewMessage.push({ type: 'text', text: msg.content });
          } else {
            for (const part of msg.content) {
              if (part.type === 'text') {
                partsForNewMessage.push({ type: 'text', text: (part as TextPart).text });
              } else if (part.type === 'tool-call') {
                const toolCallPart = part as ToolCallPart;
                partsForNewMessage.push({
                  type: 'tool-invocation',
                  toolInvocation: {
                    toolCallId: toolCallPart.toolCallId,
                    toolName: toolCallPart.toolName,
                    args: toolCallPart.args,
                    state: 'call',
                  } as ToolInvocation,
                });
              } else if (part.type === 'reasoning') {
                 // Assuming part is compatible with { text: string } for reasoning
                 partsForNewMessage.push({ type: 'reasoning', text: (part as { type: 'reasoning', text: string }).text });
              } else if (part.type === 'file') {
                const filePart = part as FilePart;
                if (typeof filePart.data === 'string' || filePart.data instanceof URL) {
                     partsForNewMessage.push({
                        type: 'file',
                        mediaType: filePart.mediaType,
                        filename: filePart.filename,
                        url: filePart.data.toString(),
                     });
                } else {
                    console.warn(`Unhandled FilePart data type in assistant message: ${typeof filePart.data}`);
                }
              }
            }
          }
        } else if (msg.role === 'tool') {
          for (const part of msg.content) {
            const toolResultPart = part as ToolResultPart;
            partsForNewMessage.push({
              type: 'tool-invocation',
              toolInvocation: {
                toolCallId: toolResultPart.toolCallId,
                toolName: toolResultPart.toolName,
                args: (toolResultPart as any).args ?? {},
                result: toolResultPart.result,
                isError: toolResultPart.isError,
                state: 'result',
              } as ToolInvocation,
            });
          }
        }
      }

      if (partsForNewMessage.length > 0) {
        const newUIMessage: UIMessage = {
          id: generateId(),
          role: finalRole,
          parts: partsForNewMessage,
        };
        await saveSessionMessages(projectSessionId, appendClientMessage({messages, message: newUIMessage}));
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