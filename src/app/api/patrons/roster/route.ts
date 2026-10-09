import { NextResponse } from 'next/server';
import { CHARACTERS, buildCharacterDef, type CharacterDef } from '@/data/characters';
import { readRuntimePatronsDb } from '@/lib/runtimePatronStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const builtIns = Object.values(CHARACTERS);

  try {
    const runtimeRows = await readRuntimePatronsDb();
    const extras: CharacterDef[] = runtimeRows
      .filter((r) => !CHARACTERS[r.id] && r.sitUrl && r.talkUrl && r.walk01Url && r.walk02Url)
      .map((r) =>
        buildCharacterDef({
          id: r.id,
          displayName: r.displayName,
          personality: r.personality,
          walkFrameCount: r.walkFrameCount || 2,
          walkFrameMs: r.walkFrameMs || 120,
          assetsOverride: {
            sitSrc: r.sitUrl!,
            talkSrc: r.talkUrl!,
            walkFrames: [r.walk01Url!, r.walk02Url!],
          },
        })
      );

    const characters = [...builtIns, ...extras];

    return NextResponse.json({
      ok: true,
      storage: 'gcs-postgres',
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
  } catch (dbError: unknown) {
    console.error('[roster] PostgreSQL query failed, activating stock patron resilience fallback:', dbError);
    return NextResponse.json({
      ok: true,
      storage: 'stock-fallback',
      fallback: true,
      characters: builtIns.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        personality: c.personality,
        walkFrameCount: c.assets.walkFrames.length,
        walkFrameMs: c.assets.walkFrameMs,
        sitSrc: c.assets.sitSrc,
        walkFrames: c.assets.walkFrames,
        talkSrc: c.assets.talkSrc ?? null,
      })),
      runtimeCount: 0,
    });
  }
}
