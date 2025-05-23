import { NextResponse } from 'next/server';
import { CodebaseAgentRequestSchema } from './codebase-schema';

export async function POST(req: Request) {
  const body = await req.json(); // Errors here will be handled by Next.js default error handling
  const validationResult = CodebaseAgentRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        message: 'Invalid request body',
        errors: validationResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { userId, project, prompt } = validationResult.data;

  // Check if environment variable is set
  if (!process.env.SEAWEED_ENGINE_URL) {
    return NextResponse.json(
      { error: "Server configuration error: SEAWEED_ENGINE_URL is not set" },
      { status: 500 }
    );
  }

  const engineUrl = `${process.env.SEAWEED_ENGINE_URL}/codebase/basic_flow`;

  const response = await fetch(
    engineUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        project: {
          project_address: project.project_address,
          metadata: project.metadata,
        },
        prompt: prompt,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `API request to ${engineUrl} failed:`,
      response.status,
      errorBody
    );
    return NextResponse.json(
      { error: `API request failed: ${response.status} ${errorBody}` },
      { status: response.status }
    );
  }

  const responseText = await response.text(); // Fetch as text
  console.log('[CODEBASE_WORKFLOW] Response:', responseText);

  // Return the plain text response
  return new NextResponse(responseText, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
