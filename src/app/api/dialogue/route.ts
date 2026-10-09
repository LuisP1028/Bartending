import { NextRequest, NextResponse } from 'next/server';
import {
  generateDialogueCompletion,
  DialogueError,
  type DialoguePayload,
} from '@/lib/hfDialogueService';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DialoguePayload;
    if (!body || !body.type || !body.characterId) {
      return NextResponse.json(
        { error: 'Missing required dialogue payload fields: type and characterId', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const result = await generateDialogueCompletion(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof DialogueError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
        { status: error.statusCode }
      );
    }

    const err = error as { message?: string; code?: string; statusCode?: number; details?: string };
    const statusCode = err?.statusCode || 500;
    const code = err?.code || 'INTERNAL_ERROR';
    return NextResponse.json(
      {
        error: err?.message || 'Dialogue generation error',
        code,
        details: err?.details,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
