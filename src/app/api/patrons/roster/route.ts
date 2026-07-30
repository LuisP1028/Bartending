import { NextResponse } from 'next/server';
import {
  CHARACTERS,
  buildCharacterDef,
  type CharacterDef,
} from '@/data/characters';
import { readRuntimePatrons } from '@/lib/runtimePatronStore';

export const runtime = 'nodejs';

function repoRoot() {
  return process.cwd();
}

/**
 * FS94/FS96 — Built-in patrons + ready-pack join-generated runtime patrons.
 * readRuntimePatrons already drops ghosts (missing sit/talk/walks).
 */
export async function GET() {
  try {
    const builtIns = Object.values(CHARACTERS);
    // Ready-pack filtered (and pruned on disk when incomplete)
    const runtime = readRuntimePatrons(repoRoot());
    const extras: CharacterDef[] = runtime
      .filter((r) => !CHARACTERS[r.id])
      .map((r) =>
        buildCharacterDef({
          id: r.id,
          displayName: r.displayName,
          personality: r.personality,
          walkFrameCount: r.walkFrameCount ?? 2,
          walkFrameMs: r.walkFrameMs ?? 120,
        })
      );

    const characters = [...builtIns, ...extras];
    return NextResponse.json({
      ok: true,
      characters: characters.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        personality: c.personality,
        walkFrameCount: c.assets.walkFrames.length,
        walkFrameMs: c.assets.walkFrameMs,
        sitSrc: c.assets.sitSrc,
        walkFrames: c.assets.walkFrames,
      })),
      runtimeCount: extras.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
