'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { POV_VIEWBOX } from '@/data/hotspotGeometry';
import {
  clampStagePoint,
  clonePatronLayout,
  getDefaultPatronLayout,
  stagePointToPct,
  type PatronLayout,
  type StagePoint,
} from '@/data/patronLayout';
import {
  CHARACTER_ELDER,
  listCharacters,
  requireCharacter,
} from '@/data/characters';
import {
  loadPatronLayouts,
  resolvePatronLayout,
  savePatronLayouts,
} from '@/lib/patronLayoutStorage';
import { resolveBarSeatAnchor } from '@/lib/patronSeats';
import type { PatronSeatInput } from '@/components/PatronLayer';

type HandleKind = 'spawn' | 'sit' | `wp-${number}`;

type PatronPlacementEditorProps = {
  seats: PatronSeatInput[];
  onLayoutChange?: (layouts: Record<string, PatronLayout>) => void;
  onOpenChange?: (open: boolean) => void;
  /** Notifies stage which character is selected for walk/sit. */
  onCharacterChange?: (characterId: string) => void;
  defaultOpen?: boolean;
};

/**
 * Stage tool: author patron path, walk/sit size, and **live sit position**.
 * Characters come from the shared registry (identity + assets + personality).
 */
export default function PatronPlacementEditor({
  seats,
  onLayoutChange,
  onOpenChange,
  onCharacterChange,
  defaultOpen = false,
}: PatronPlacementEditorProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedHandle, setSelectedHandle] = useState<HandleKind>('sit');
  const [layouts, setLayouts] = useState<Record<string, PatronLayout>>({});
  const [patronId, setPatronId] = useState(CHARACTER_ELDER.id);
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{
    kind: HandleKind;
    startClientX: number;
    startClientY: number;
    origin: StagePoint;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const setEditorOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        onOpenChange?.(resolved);
        return resolved;
      });
    },
    [onOpenChange]
  );

  useEffect(() => {
    const loaded = loadPatronLayouts();
    setLayouts(loaded);
    onLayoutChange?.(loaded);
  }, [onLayoutChange]);

  useEffect(() => {
    onCharacterChange?.(patronId);
  }, [patronId, onCharacterChange]);

  const layout = useMemo(
    () => resolvePatronLayout(patronId, layouts),
    [patronId, layouts]
  );

  const character = useMemo(() => requireCharacter(patronId), [patronId]);

  const updateLayout = useCallback(
    (next: PatronLayout | ((prev: PatronLayout) => PatronLayout)) => {
      setLayouts((prev) => {
        const current = resolvePatronLayout(patronId, prev);
        const resolved = typeof next === 'function' ? next(current) : next;
        const merged = { ...prev, [patronId]: clonePatronLayout(resolved) };
        savePatronLayouts(merged);
        onLayoutChange?.(merged);
        return merged;
      });
    },
    [patronId, onLayoutChange]
  );

  const sitAnchor = useMemo(() => {
    const seatId =
      layout.preferredSeatId &&
      seats.some((s) => s.zoneId === layout.preferredSeatId)
        ? layout.preferredSeatId
        : seats[0]?.zoneId ?? null;
    if (!seatId) {
      return {
        x: layout.spawn.x + 200,
        y: layout.spawn.y,
      };
    }
    const seat = seats.find((s) => s.zoneId === seatId);
    if (!seat) return { x: layout.spawn.x + 200, y: layout.spawn.y };
    const a = resolveBarSeatAnchor(seat.zoneId, seat.d);
    if (!a) return { x: layout.spawn.x + 200, y: layout.spawn.y };
    return {
      x: (a.leftPct / 100) * POV_VIEWBOX.width + layout.sitOffset.x,
      y: (a.topPct / 100) * POV_VIEWBOX.height + layout.sitOffset.y,
    };
  }, [layout, seats]);

  const pathPoints = useMemo(() => {
    if (layout.lockHorizontalWalk) {
      const y = layout.spawn.y;
      const wps = layout.waypoints.map((p) => ({ x: p.x, y }));
      const walkEnd = { x: sitAnchor.x, y };
      return [layout.spawn, ...wps, walkEnd];
    }
    return [layout.spawn, ...layout.waypoints, sitAnchor];
  }, [layout.spawn, layout.waypoints, layout.lockHorizontalWalk, sitAnchor]);

  const clientToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const onPointerDownHandle = (e: React.PointerEvent, kind: HandleKind) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedHandle(kind);
    let origin: StagePoint = layout.spawn;
    if (kind === 'sit') {
      origin = { ...layout.sitOffset };
    } else if (kind.startsWith('wp-')) {
      const idx = parseInt(kind.slice(3), 10);
      origin = { ...layout.waypoints[idx] };
    }
    dragRef.current = {
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origin,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const start = clientToViewBox(drag.startClientX, drag.startClientY);
    const now = clientToViewBox(e.clientX, e.clientY);
    const ddx = now.x - start.x;
    const ddy = now.y - start.y;

    updateLayout((prev) => {
      if (drag.kind === 'spawn') {
        return {
          ...prev,
          spawn: clampStagePoint({
            x: drag.origin.x + ddx,
            y: drag.origin.y + ddy,
          }),
        };
      }
      if (drag.kind === 'sit') {
        return {
          ...prev,
          sitOffset: {
            x: drag.origin.x + ddx,
            y: drag.origin.y + ddy,
          },
        };
      }
      if (drag.kind.startsWith('wp-')) {
        const idx = parseInt(drag.kind.slice(3), 10);
        const waypoints = prev.waypoints.map((p, i) => {
          if (i !== idx) return p;
          return clampStagePoint({
            x: drag.origin.x + ddx,
            y: prev.lockHorizontalWalk ? prev.spawn.y : drag.origin.y + ddy,
          });
        });
        return { ...prev, waypoints };
      }
      return prev;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  // Arrow keys nudge **selected** handle (spawn / sit / waypoint)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditorOpen(false);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      let ddx = 0;
      let ddy = 0;
      if (e.key === 'ArrowLeft') ddx = -step;
      else if (e.key === 'ArrowRight') ddx = step;
      else if (e.key === 'ArrowUp') ddy = -step;
      else if (e.key === 'ArrowDown') ddy = step;
      else return;
      e.preventDefault();

      updateLayout((prev) => {
        if (selectedHandle === 'spawn') {
          return {
            ...prev,
            spawn: clampStagePoint({
              x: prev.spawn.x + ddx,
              y: prev.spawn.y + ddy,
            }),
          };
        }
        if (selectedHandle === 'sit') {
          return {
            ...prev,
            sitOffset: {
              x: prev.sitOffset.x + ddx,
              y: prev.sitOffset.y + ddy,
            },
          };
        }
        if (selectedHandle.startsWith('wp-')) {
          const idx = parseInt(selectedHandle.slice(3), 10);
          const waypoints = prev.waypoints.map((p, i) => {
            if (i !== idx) return p;
            return clampStagePoint({
              x: p.x + ddx,
              y: prev.lockHorizontalWalk ? prev.spawn.y : p.y + ddy,
            });
          });
          return { ...prev, waypoints };
        }
        return prev;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selectedHandle, updateLayout, setEditorOpen]);

  const exportSnippet = useMemo(() => JSON.stringify(layout, null, 2), [layout]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportSnippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const resetLayout = () => {
    updateLayout(getDefaultPatronLayout(patronId));
  };

  const addWaypoint = () => {
    updateLayout((prev) => {
      const mid = {
        x: (prev.spawn.x + sitAnchor.x) / 2,
        y: prev.lockHorizontalWalk
          ? prev.spawn.y
          : (prev.spawn.y + sitAnchor.y) / 2,
      };
      return { ...prev, waypoints: [...prev.waypoints, clampStagePoint(mid)] };
    });
  };

  const removeLastWaypoint = () => {
    updateLayout((prev) => ({
      ...prev,
      waypoints: prev.waypoints.slice(0, -1),
    }));
  };

  const pathD = pathPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const spawnPct = stagePointToPct(layout.spawn);
  const sitPct = stagePointToPct(sitAnchor);
  const focusLabel =
    selectedHandle === 'spawn'
      ? 'SPAWN'
      : selectedHandle === 'sit'
        ? 'SIT'
        : selectedHandle.startsWith('wp-')
          ? `WAYPOINT ${selectedHandle.slice(3)}`
          : selectedHandle;

  return (
    <>
      <button
        type="button"
        className={`patron-edit-toggle${open ? ' patron-edit-toggle--on' : ''}`}
        onClick={() => setEditorOpen((v) => !v)}
        title="Patron path / size / sit editor"
      >
        {open ? 'PATRON EDIT: ON' : 'PATRON EDIT'}
      </button>

      {open && (
        <>
          {/* Live previews: selected character assets at authored sizes */}
          <div className="patron-edit-previews" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pov-patron-sprite pov-patron-sprite--walk pov-patron-sprite--edit-ghost"
              src={character.assets.walkFrames[0]}
              alt=""
              draggable={false}
              style={{
                left: `${spawnPct.leftPct}%`,
                top: `${spawnPct.topPct}%`,
                width: `${layout.walkDisplayWidthPct}%`,
                transform: 'translate(-50%, -100%)',
                opacity: selectedHandle === 'spawn' ? 0.65 : 0.35,
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pov-patron-sprite pov-patron-sprite--sit pov-patron-sprite--edit-sit"
              src={character.assets.sitSrc}
              alt=""
              draggable={false}
              style={{
                left: `${sitPct.leftPct}%`,
                top: `${sitPct.topPct}%`,
                width: `${layout.sitDisplayWidthPct}%`,
                transform: 'translate(-50%, -100%)',
                opacity: selectedHandle === 'sit' ? 1 : 0.85,
              }}
            />
          </div>

          <svg
            ref={svgRef}
            className="patron-edit-overlay"
            viewBox={`0 0 ${POV_VIEWBOX.width} ${POV_VIEWBOX.height}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <path d={pathD} className="patron-edit-path" fill="none" />
            <circle
              cx={layout.spawn.x}
              cy={layout.spawn.y}
              r={selectedHandle === 'spawn' ? 12 : 10}
              className={`patron-edit-handle patron-edit-handle--spawn${
                selectedHandle === 'spawn' ? ' patron-edit-handle--selected' : ''
              }`}
              onPointerDown={(e) => onPointerDownHandle(e, 'spawn')}
            />
            <text
              x={layout.spawn.x}
              y={layout.spawn.y - 14}
              className="patron-edit-label-svg"
              textAnchor="middle"
            >
              SPAWN
            </text>
            {layout.waypoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={selectedHandle === `wp-${i}` ? 10 : 8}
                className={`patron-edit-handle patron-edit-handle--wp${
                  selectedHandle === `wp-${i}` ? ' patron-edit-handle--selected' : ''
                }`}
                onPointerDown={(e) => onPointerDownHandle(e, `wp-${i}`)}
              />
            ))}
            <circle
              cx={sitAnchor.x}
              cy={sitAnchor.y}
              r={selectedHandle === 'sit' ? 12 : 10}
              className={`patron-edit-handle patron-edit-handle--sit${
                selectedHandle === 'sit' ? ' patron-edit-handle--selected' : ''
              }`}
              onPointerDown={(e) => onPointerDownHandle(e, 'sit')}
            />
            <text
              x={sitAnchor.x}
              y={sitAnchor.y - 14}
              className="patron-edit-label-svg"
              textAnchor="middle"
            >
              SIT
            </text>
          </svg>

          <div className="patron-edit-panel">
            <div className="patron-edit-panel-title">PATRON LAYOUT</div>
            <div className="patron-edit-focus">
              Focus: <strong>{focusLabel}</strong>
              <span className="patron-edit-focus-btns">
                <button type="button" onClick={() => setSelectedHandle('spawn')}>
                  SPAWN
                </button>
                <button type="button" onClick={() => setSelectedHandle('sit')}>
                  SIT
                </button>
              </span>
            </div>
            <label className="patron-edit-label">
              Character
              <select
                value={patronId}
                onChange={(e) => setPatronId(e.target.value)}
              >
                {listCharacters().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="patron-edit-meta">
              personality: <code>{character.personality}</code>
            </div>
            <label className="patron-edit-label">
              Seat
              <select
                value={layout.preferredSeatId ?? ''}
                onChange={(e) =>
                  updateLayout((prev) => ({
                    ...prev,
                    preferredSeatId: e.target.value || null,
                  }))
                }
              >
                <option value="">Random free</option>
                {seats.map((s) => (
                  <option key={s.zoneId} value={s.zoneId}>
                    {s.zoneId}
                  </option>
                ))}
              </select>
            </label>
            <label className="patron-edit-label">
              Walk width % ({layout.walkDisplayWidthPct.toFixed(0)})
              <input
                type="range"
                min={8}
                max={70}
                step={1}
                value={layout.walkDisplayWidthPct}
                onChange={(e) =>
                  updateLayout((prev) => ({
                    ...prev,
                    walkDisplayWidthPct: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="patron-edit-label">
              Sit width % ({layout.sitDisplayWidthPct.toFixed(0)})
              <input
                type="range"
                min={8}
                max={55}
                step={1}
                value={layout.sitDisplayWidthPct}
                onChange={(e) =>
                  updateLayout((prev) => ({
                    ...prev,
                    sitDisplayWidthPct: Number(e.target.value),
                  }))
                }
              />
            </label>
            <div className="patron-edit-sit-xy">
              <label className="patron-edit-label">
                Sit ΔX
                <input
                  type="number"
                  value={Math.round(layout.sitOffset.x)}
                  onChange={(e) => {
                    setSelectedHandle('sit');
                    updateLayout((prev) => ({
                      ...prev,
                      sitOffset: {
                        ...prev.sitOffset,
                        x: Number(e.target.value) || 0,
                      },
                    }));
                  }}
                  onFocus={() => setSelectedHandle('sit')}
                />
              </label>
              <label className="patron-edit-label">
                Sit ΔY
                <input
                  type="number"
                  value={Math.round(layout.sitOffset.y)}
                  onChange={(e) => {
                    setSelectedHandle('sit');
                    updateLayout((prev) => ({
                      ...prev,
                      sitOffset: {
                        ...prev.sitOffset,
                        y: Number(e.target.value) || 0,
                      },
                    }));
                  }}
                  onFocus={() => setSelectedHandle('sit')}
                />
              </label>
            </div>
            <label className="patron-edit-label patron-edit-label--row">
              <input
                type="checkbox"
                checked={layout.lockHorizontalWalk}
                onChange={(e) =>
                  updateLayout((prev) => ({
                    ...prev,
                    lockHorizontalWalk: e.target.checked,
                  }))
                }
              />{' '}
              Lock horizontal walk
            </label>
            <label className="patron-edit-label">
              Walk ms ({layout.walkMs})
              <input
                type="range"
                min={800}
                max={6000}
                step={100}
                value={layout.walkMs}
                onChange={(e) =>
                  updateLayout((prev) => ({
                    ...prev,
                    walkMs: Number(e.target.value),
                  }))
                }
              />
            </label>
            <div className="patron-edit-meta">
              sit @ ({sitAnchor.x.toFixed(0)}, {sitAnchor.y.toFixed(0)}) · spawn
              ({layout.spawn.x.toFixed(0)}, {layout.spawn.y.toFixed(0)})
            </div>
            <p className="patron-edit-hint">
              Live <strong>sit bust</strong> follows SIT. Drag SIT or use Sit ΔX/ΔY.
              Arrows nudge <strong>focused</strong> handle (Shift = 10).
            </p>
            <div className="patron-edit-actions">
              <button type="button" onClick={addWaypoint}>
                + WAYPOINT
              </button>
              <button type="button" onClick={removeLastWaypoint}>
                − WP
              </button>
              <button type="button" onClick={copyExport}>
                {copied ? 'COPIED' : 'COPY JSON'}
              </button>
              <button type="button" onClick={resetLayout}>
                RESET
              </button>
            </div>
            <textarea
              className="patron-edit-export"
              readOnly
              rows={5}
              value={exportSnippet}
            />
          </div>
        </>
      )}
    </>
  );
}
