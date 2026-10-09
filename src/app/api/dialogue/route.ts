import { NextRequest, NextResponse } from 'next/server';
import {
  generateDialogueCompletion,
  DialogueError,
  type DialoguePayload,
} from '@/lib/hfDialogueService';
import { PersonaNotFoundError } from '@/data/characterDialogue';

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

    if (error instanceof PersonaNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        },
        { status: error.statusCode }
      );
    }

    const message = error instanceof Error ? error.message : 'Dialogue generation error';
    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
