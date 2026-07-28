"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { POV_HOTSPOTS, type PovHotspot } from '@/data/povHotspots';
import { POV_VIEWBOX } from '@/data/hotspotGeometry';
import { translatePathD } from '@/lib/svgPathTranslate';
import {
  getOffset,
  loadHotspotOffsets,
  saveHotspotOffsets,
  type HotspotOffset,
} from '@/lib/hotspotOffsets';

type HotspotPlacementEditorProps = {
  /** Called whenever offsets change so vessel/play can remeasure. */
  onOffsetsChange?: (offsets: Record<string, HotspotOffset>) => void;
  /** Initial open state */
  defaultOpen?: boolean;
};

/**
 * Dev tool: drag POV hotspot paths on the live stage; export updated `d` for povHotspots.ts.
 */
export default function HotspotPlacementEditor({
  onOffsetsChange,
  defaultOpen = false,
}: HotspotPlacementEditorProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [offsets, setOffsets] = useState<Record<string, HotspotOffset>>({});
  const [selectedId, setSelectedId] = useState<string>('drink_placement');
  const [copied, setCopied] = useState(false);
  const dragRef = useRef<{
    zoneId: string;
    startClientX: number;
    startClientY: number;
    originDx: number;
    originDy: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const loaded = loadHotspotOffsets();
    setOffsets(loaded);
    onOffsetsChange?.(loaded);
  }, [onOffsetsChange]);

  const updateOffsets = useCallback(
    (next: Record<string, HotspotOffset> | ((prev: Record<string, HotspotOffset>) => Record<string, HotspotOffset>)) => {
      setOffsets((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveHotspotOffsets(resolved);
        onOffsetsChange?.(resolved);
        return resolved;
      });
    },
    [onOffsetsChange]
  );

  const selected = useMemo(
    () => POV_HOTSPOTS.find((h) => h.zoneId === selectedId) ?? POV_HOTSPOTS[0],
    [selectedId]
  );

  const selectedOffset = getOffset(offsets, selected.zoneId);
  const selectedD = translatePathD(selected.d, selectedOffset.dx, selectedOffset.dy);

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

  const onPointerDownPath = (e: React.PointerEvent, hotspot: PovHotspot) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(hotspot.zoneId);
    const off = getOffset(offsets, hotspot.zoneId);
    dragRef.current = {
      zoneId: hotspot.zoneId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originDx: off.dx,
      originDy: off.dy,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const start = clientToViewBox(drag.startClientX, drag.startClientY);
    const now = clientToViewBox(e.clientX, e.clientY);
    const dx = drag.originDx + (now.x - start.x);
    const dy = drag.originDy + (now.y - start.y);
    updateOffsets((prev) => ({
      ...prev,
      [drag.zoneId]: { dx, dy },
    }));
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
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
      updateOffsets((prev) => {
        const off = getOffset(prev, selectedId);
        return {
          ...prev,
          [selectedId]: { dx: off.dx + ddx, dy: off.dy + ddy },
        };
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selectedId, updateOffsets]);

  const exportSnippet = useMemo(() => {
    const off = getOffset(offsets, selected.zoneId);
    const d = translatePathD(selected.d, off.dx, off.dy);
    return `  {\n    zoneId: "${selected.zoneId}",\n    // role/category preserved in file\n    d: "${d}",\n  }`;
  }, [offsets, selected]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(selectedD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const resetSelected = () => {
    updateOffsets((prev) => {
      const next = { ...prev };
      delete next[selected.zoneId];
      return next;
    });
  };

  const resetAll = () => updateOffsets({});

  return (
    <>
      <button
        type="button"
        className={`hotspot-edit-toggle${open ? ' hotspot-edit-toggle--on' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Hotspot placement editor"
      >
        {open ? 'HOTSPOT EDIT: ON' : 'HOTSPOT EDIT'}
      </button>

      {open && (
        <>
          <svg
            ref={svgRef}
            className="hotspot-edit-overlay"
            viewBox={`0 0 ${POV_VIEWBOX.width} ${POV_VIEWBOX.height}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {POV_HOTSPOTS.map((h) => {
              const off = getOffset(offsets, h.zoneId);
              const d = translatePathD(h.d, off.dx, off.dy);
              const selected = h.zoneId === selectedId;
              return (
                <path
                  key={h.zoneId}
                  d={d}
                  className={`hotspot-edit-path${selected ? ' hotspot-edit-path--selected' : ''}${
                    h.role === 'vessel_slot' ? ' hotspot-edit-path--vessel' : ''
                  }${h.role === 'geometry' ? ' hotspot-edit-path--geometry' : ''}`}
                  onPointerDown={(e) => onPointerDownPath(e, h)}
                />
              );
            })}
          </svg>

          <div className="hotspot-edit-panel">
            <div className="hotspot-edit-panel-title">HOTSPOT PLACEMENT</div>
            <label className="hotspot-edit-label">
              Zone
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {POV_HOTSPOTS.map((h) => (
                  <option key={h.zoneId} value={h.zoneId}>
                    {h.zoneId}
                    {h.role === 'vessel_slot'
                      ? ' (vessel pad)'
                      : h.role === 'geometry'
                        ? ' (geometry)'
                        : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="hotspot-edit-meta">
              dx: {selectedOffset.dx.toFixed(1)} · dy: {selectedOffset.dy.toFixed(1)}
            </div>
            <p className="hotspot-edit-hint">
              Drag path on stage · arrows nudge (Shift = 10)
            </p>
            <div className="hotspot-edit-actions">
              <button type="button" onClick={copyExport}>
                {copied ? 'COPIED d' : 'COPY d'}
              </button>
              <button type="button" onClick={resetSelected}>
                RESET ZONE
              </button>
              <button type="button" onClick={resetAll}>
                RESET ALL
              </button>
            </div>
            <textarea
              className="hotspot-edit-export"
              readOnly
              value={exportSnippet}
              rows={5}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </>
      )}
    </>
  );
}

/** Apply stored offsets to a base path d for a zone. */
export function pathWithStoredOffset(
  zoneId: string,
  baseD: string,
  offsets: Record<string, HotspotOffset>
): string {
  const off = getOffset(offsets, zoneId);
  return translatePathD(baseD, off.dx, off.dy);
}
