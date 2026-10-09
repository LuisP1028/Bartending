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

/** FS98 — browser-loadable URLs via disk-serving API (runtime join art). */
function runtimeAssetUrls(characterId: string, walkFrameCount: number) {
  const base = `/api/patrons/assets/${characterId}`;
  const walks = Array.from({ length: walkFrameCount }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `${base}/walk_${n}.png`;
  });
  return {
    sitSrc: `${base}/sit.png`,
    talkSrc: `${base}/talk.png`,
    walkFrames: walks,
  };
}

/**
 * FS94/FS98 — Built-ins (static /assets) + ready runtime joiners (API assets).
 */
export async function GET() {
  try {
    const root = resolveAppRoot(process.cwd());
    const builtIns = Object.values(CHARACTERS);
    const runtime = readRuntimePatrons(root).filter(
      (r) => !CHARACTERS[r.id] && isPatronPackReady(root, r.id)
    );
    const extras: CharacterDef[] = runtime.map((r) => {
      const walkN = r.walkFrameCount ?? 2;
      const urls = runtimeAssetUrls(r.id, walkN);
      return buildCharacterDef({
        id: r.id,
        displayName: r.displayName,
        personality: r.personality,
        walkFrameCount: walkN,
        walkFrameMs: r.walkFrameMs ?? 120,
        assetsOverride: {
          sitSrc: urls.sitSrc,
          talkSrc: urls.talkSrc,
          walkFrames: urls.walkFrames,
        },
      });
    });

    const characters = [...builtIns, ...extras];
    return NextResponse.json({
      ok: true,
      storage: 'runtime-only',
      note: 'Joiners live on Space disk only; not written to git. GCS later.',
      characters: characters.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        personality: c.personality,
        walkFrameCount: c.assets.walkFrames.length,
        walkFrameMs: c.assets.walkFrameMs,
        sitSrc: c.assets.sitSrc,
        walkFrames: c.assets.walkFrames,
        talkSrc: c.assets.talkSrc ?? null,
      })),
      runtimeCount: extras.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
