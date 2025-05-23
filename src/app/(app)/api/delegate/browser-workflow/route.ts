import { NextResponse } from 'next/server';
import { BrowserAgentRequestSchema, BrowserAgentResponseSchema } from './browser-schema';

export async function POST(req: Request) {
  const body = await req.json();
  const validationResult = BrowserAgentRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        message: "Invalid request body",
        errors: validationResult.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const { userId, contextConfig, metadata, prompt } = validationResult.data;

  // Check if environment variable is set
  if (!process.env.SEAWEED_ENGINE_URL) {
    return NextResponse.json(
      { error: "Server configuration error: SEAWEED_ENGINE_URL is not set" },
      { status: 500 }
    );
  }

  const engineUrl = `${process.env.SEAWEED_ENGINE_URL}/browser/context_flow`;

  const response = await fetch(engineUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      context_config: contextConfig,
      metadata: metadata,
      prompt: prompt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json(
      { error: `Engine API request failed: ${response.status} ${errorBody}` },
      { status: response.status }
    );
  }

  const responseText = await response.text();
  console.log('[BROWSER_WORKFLOW] Response:', responseText);

  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
    
    // Handle case where the response might be a JSON string that needs to be parsed again
    if (typeof responseData === 'string' && responseData.startsWith('{') && responseData.endsWith('}')) {
      try {
        responseData = JSON.parse(responseData);
        console.log('[BROWSER_WORKFLOW] Parsed nested JSON response');
      } catch (e) {
        console.error('[BROWSER_WORKFLOW] Error parsing nested JSON:', e);
      }
    }
    
    console.log('[BROWSER_WORKFLOW] Response data:', responseData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BROWSER_WORKFLOW] JSON parse error:', errorMessage);
    return NextResponse.json(
      { error: `Failed to parse JSON response: ${errorMessage}` },
      { status: 502 }
    );
  }

  // Validate against schema
  const validationResponse = BrowserAgentResponseSchema.safeParse(responseData);
  if (!validationResponse.success) {
    console.error('[BROWSER_WORKFLOW] Validation error:', validationResponse.error.format());
    return NextResponse.json(
      {
        message: "Invalid response body from engine",
        errors: validationResponse.error.flatten().fieldErrors
      },
      { status: 502 }
    );
  }

  // Return the validated data directly (not re-stringified)
  return NextResponse.json(validationResponse.data);
}
