/**
 * FS98 — Serve join/stock nested patron PNGs from disk at runtime.
 * Next static /assets can miss files written after boot; this always reads FS.
 */

import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { resolveAppRoot } from '@/lib/patronPackReady';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set([
  'sit.png',
  'talk.png',
  'walk_01.png',
  'walk_02.png',
  'walk_03.png',
  'walk_04.png',
  'source.jpg',
  'source.jpeg',
  'source.png',
  'source.webp',
]);

type Ctx = { params: Promise<{ characterId: string; file: string }> };

export async function HEAD(req: Request, ctx: Ctx) {
  const res = await GET(req, ctx);
  // Drop body for HEAD
  return new NextResponse(null, {
    status: res.status,
    headers: res.headers,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { characterId, file } = await ctx.params;
    const id = String(characterId || '').trim();
    const name = String(file || '').trim().toLowerCase();

    if (
      !id ||
      id.includes('..') ||
      id.includes('/') ||
      id.includes('\\') ||
      !/^[a-z0-9_]+$/i.test(id)
    ) {
      return NextResponse.json({ error: 'invalid characterId' }, { status: 400 });
    }
    if (!ALLOWED.has(name)) {
      return NextResponse.json({ error: 'file not allowed' }, { status: 400 });
    }

    const root = resolveAppRoot(process.cwd());
    // Nested pack path (join + caesar/trump style)
    const nested = path.join(root, 'public', 'assets', 'patrons', id, name);
    // Flat elder-style fallback for walk/sit names if ever requested nested
    const flat = path.join(
      root,
      'public',
      'assets',
      'patrons',
      name.startsWith(id) ? name : `${id}_${name}`
    );

    let filePath = nested;
    if (!fs.existsSync(nested) || !fs.statSync(nested).isFile()) {
      if (fs.existsSync(flat) && fs.statSync(flat).isFile()) {
        filePath = flat;
      } else {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
    }

    const buf = fs.readFileSync(filePath);
    if (buf.length < 8) {
      return NextResponse.json({ error: 'empty' }, { status: 404 });
    }
    // Reject LFS pointer text
    const head = buf.subarray(0, 80).toString('utf8');
    if (head.includes('git-lfs') || head.startsWith('version https://git-lfs')) {
      return NextResponse.json({ error: 'lfs pointer' }, { status: 404 });
    }

    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isWebp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF';
    const type = isPng
      ? 'image/png'
      : isJpeg
        ? 'image/jpeg'
        : isWebp
          ? 'image/webp'
          : 'application/octet-stream';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
