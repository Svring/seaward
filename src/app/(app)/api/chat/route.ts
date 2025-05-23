// import { getSealosModel, buildSystemPrompt } from '@/providers/backbone-provider/backbone-provider';
// import { convertToModelMessages, streamText, UIMessage, generateObject, createUIMessageStreamResponse, createUIMessageStream, streamObject } from 'ai';
// import { chatTaskAnalysisSchema, ChatTaskAnalysis } from './chat-schema';

// // Analyze the task type based on user messages
// async function analyzeTask(messages: UIMessage[], customInfo: string | undefined): Promise<ChatTaskAnalysis> {
//   const { object: taskAnalysis } = await generateObject({
//     model: getSealosModel('gpt-4o'),
//     system: buildSystemPrompt(customInfo || ''),
//     schema: chatTaskAnalysisSchema,
//     messages: convertToModelMessages(messages),
//   });

//   return taskAnalysis;
// }

// // Handle direct task type
// async function handleDirectTask(writer: any, interpretation: string) {
//   writer.write({
//     type: 'text',
//     text: interpretation,
//   });
// }

// // Handle browser task type
// async function handleBrowserTask(writer: any, interpretation: string) {
//   const browserRequestBody = {
//     userId: '123',
//     prompt: interpretation,
//     contextConfig: {
//       window_width: 1920,
//       window_height: 1080,
//       locale: "en-US",
//       user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
//       allowed_domains: [],
//       maximum_wait_page_load_time: 10,
//       highlight_elements: true,
//       keep_alive: true,
//       save_recording_path: "recordings/user1",
//     },
//     metadata: {
//       website_url: 'https://gdtakheltbne.sealosbja.site',
//     },
//   };

//   const browserFlowResponse = await fetch('http://localhost:3000/api/delegate/browser-workflow', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(browserRequestBody),
//   });

//   const responseText = await browserFlowResponse.text();

//   if (!browserFlowResponse.ok) {
//     writer.write({
//       type: 'text',
//       text: `Sorry, I couldn't complete the browser operation. The service returned an error: ${responseText}`,
//     });
//     return;
//   }

//   console.log('[CHAT_ROUTE] Browser flow response:', responseText);

//   let responseContent = JSON.parse(responseText);

//   // Handle case where the response is a JSON string that needs to be parsed again
//   if (typeof responseContent === 'string' && responseContent.startsWith('{') && responseContent.endsWith('}')) {
//     try {
//       responseContent = JSON.parse(responseContent);
//     } catch (e) {
//       console.error('[CHAT_ROUTE] Error parsing nested JSON:', e);
//     }
//   }

//   writer.write({
//     type: 'text',
//     text: responseContent?.final_result || 'The browser agent returned an empty response.',
//   });
// }

// // Handle codebase task type
// async function handleCodebaseTask(writer: any, interpretation: string) {
//   const codebaseRequestBody = {
//     userId: 'user_123_abc',
//     project: {
//       project_address: 'https://gdtakheltbne.sealosbja.site',
//       metadata: {
//         description: 'My cool project',
//         version: '1.0.2',
//         tags: ['python', 'fastapi', 'ai']
//       }
//     },
//     prompt: interpretation,
//   };

//   const codebaseFlowResponse = await fetch('http://localhost:3000/api/delegate/codebase-workflow', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(codebaseRequestBody),
//   });

//   const responseText = await codebaseFlowResponse.text();
//   console.log('[CHAT_ROUTE] Codebase flow response:', responseText);

//   if (!codebaseFlowResponse.ok) {
//     writer.write({
//       type: 'text',
//       text: `Sorry, I couldn't complete the codebase operation. The service returned an error: ${responseText}`,
//     });
//     return;
//   }

//   const message = responseText || 'The codebase agent returned an empty response.';
//   writer.write({
//     type: 'text',
//     text: message,
//   });
// }

// // Handle mixed task type
// async function handleMixedTask(writer: any, interpretation: string) {
//   const mixedRequestBody = {
//     userId: 'user_123_abc',
//     project: {
//       project_address: 'https://gdtakheltbne.sealosbja.site',
//       metadata: {
//         description: 'My cool project',
//         version: '1.0.2',
//         tags: ['python', 'fastapi', 'ai']
//       }
//     },
//     browser: {
//       contextConfig: {
//         window_width: 1920,
//         window_height: 1080,
//         locale: "en-US",
//         user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
//         allowed_domains: [],
//         maximum_wait_page_load_time: 10,
//         highlight_elements: true,
//         keep_alive: true,
//         save_recording_path: "recordings/user1",
//       },
//       metadata: {
//         website_url: 'https://www.bing.com',
//       }
//     },
//     prompt: interpretation,
//   };

//   const mixedFlowResponse = await fetch('http://localhost:3000/api/delegate/mixed-workflow', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(mixedRequestBody),
//   });

//   const responseText = await mixedFlowResponse.text();
//   console.log('[CHAT_ROUTE] Mixed flow response:', responseText);

//   if (!mixedFlowResponse.ok) {
//     writer.write({
//       type: 'text',
//       text: `Sorry, I couldn't complete the mixed operation. The service returned an error: ${responseText}`,
//     });
//     return;
//   }

//   let responseContent = responseText || 'The mixed agent returned an empty response.';

//   if (responseText && responseText.trim().startsWith('{')) {
//     try {
//       const responseJson = JSON.parse(responseText);
//       responseContent = `I've completed the mixed workflow task:\n\n${JSON.stringify(responseJson, null, 2)}`;
//     } catch {
//       // If parsing fails, use the raw text
//     }
//   }

//   writer.write({
//     type: 'text',
//     text: responseContent,
//   });
// }

// // Process task based on its type
// async function processTask(writer: any, taskAnalysis: ChatTaskAnalysis) {
//   const { taskType, interpretation } = taskAnalysis;

//   switch (taskType) {
//     case 'direct':
//       await handleDirectTask(writer, interpretation);
//       break;
//     case 'browser':
//       await handleBrowserTask(writer, interpretation);
//       break;
//     case 'codebase':
//       await handleCodebaseTask(writer, interpretation);
//       break;
//     case 'mixed':
//       await handleMixedTask(writer, interpretation);
//       break;
//     default:
//       writer.write({
//         type: 'text',
//         text: `I'm not sure how to handle this task type: ${taskType}. Here's what I understood: ${interpretation}`,
//       });
//   }
// }

// export async function POST(req: Request) {
//   const { messages, customInfo }: { messages: UIMessage[], customInfo: string | undefined } = await req.json();

//   const response = createUIMessageStreamResponse({
//     status: 200,
//     statusText: 'OK',
//     headers: {
//       'Content-Type': 'text/event-stream',
//     },
//     stream: createUIMessageStream({
//       execute: async writer => {
//         // Step 1: Analyze the task
//         const taskAnalysis = await analyzeTask(messages, customInfo);

//         // Step 2: Process the task based on its type
//         await processTask(writer, taskAnalysis);
//       },
//     }),
//   });

//   return response;
// }