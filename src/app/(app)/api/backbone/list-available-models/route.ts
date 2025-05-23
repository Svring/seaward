import { NextResponse } from 'next/server';
import { z } from 'zod';
import { availableModels } from '@/providers/backbone-provider/backbone-schema';

export async function GET() {
  const data: z.infer<typeof availableModels> = {
    models: [
      'claude-opus-4-20250514',
      'gemini-2.5-pro-preview-05-06',
      'o3',
    ],
  };
  return NextResponse.json(data);
}

// Ensures the route is treated as dynamic.
export const dynamic = 'force-dynamic';
