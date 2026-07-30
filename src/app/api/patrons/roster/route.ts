import { NextResponse } from 'next/server';
import {
  CHARACTERS,
  buildCharacterDef,
  type CharacterDef,
} from '@/data/characters';
import { isPatronPackReady, resolveAppRoot } from '@/lib/patronPackReady';
import { readRuntimePatrons } from '@/lib/runtimePatronStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * FS94/FS97 — Built-ins always; runtime joiners only with real ready pack on disk.
 * Double-filters so ghosts never leave this API (FS96 missed live).
 */
export async function GET() {
  try {
    const root = resolveAppRoot(process.cwd());
    const builtIns = Object.values(CHARACTERS);
    const runtime = readRuntimePatrons(root).filter(
      (r) => !CHARACTERS[r.id] && isPatronPackReady(root, r.id)
    );
    const extras: CharacterDef[] = runtime.map((r) =>
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
