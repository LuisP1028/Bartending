"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import GlobalSVGDefs from '@/components/GlobalSVGDefs';
import BootIntro from '@/components/BootIntro';
import BottleAsset from '@/components/BottleAsset';
import GlassAsset from '@/components/GlassAsset';
import GarnishAsset from '@/components/GarnishAsset';
import RimmingAsset from '@/components/RimmingAsset';
import HardwareAsset from '@/components/HardwareAsset';
import { ConfiguredRestaurantMode } from '@/data/RestaurantMode';
import { DefaultFreestyleManifest, type Liquor, type Syrup } from '@/data/Manifest';
import { ZONE_INVENTORY_IDS } from '@/data/zoneInventories';
import { DRINK_METHOD_IDS } from '@/data/methods';

/** Bottle carousel items (syrups/juices/mixers share Liquor fields; liquors too). */
type BottleCatalogItem = Syrup | Liquor;
import {
  useSimulation,
  cloneSimulationState,
  type SimulationState,
} from '@/hooks/useSimulation';
import { NormalizedRestaurantPayload } from '@/utils/LLMMenuMapper';
import { CocktailRecipe } from '@/data/RecipeManager';
import { ModePayload } from '@/data/ModePayload';
import { loadMode } from '@/lib/validation/modeLoader';
import { resolveDisplayName } from '@/lib/receipt/displayNameRegistry';
import MagnificationCarousel, {
  type MagnificationCarouselHandle,
} from '@/components/MagnificationCarousel';
import CategoryOverlay from '@/components/CategoryOverlay';
import JiggerPourControl from '@/components/JiggerPourControl';
import DrinkBuildCard from '@/components/DrinkBuildCard';
import {
  pathWithStoredOffset,
} from '@/components/HotspotPlacementEditor';
import PatronLayer from '@/components/PatronLayer';
// FS72: authoring editors commented out of UI — restore imports to re-enable
// import HotspotPlacementEditor from '@/components/HotspotPlacementEditor';
// import PatronPlacementEditor from '@/components/PatronPlacementEditor';
import PatronSignupForm from '@/components/PatronSignupForm';
import {
  CategoryKey,
  CATEGORY_TITLES,
  POV_BAR_CUTOFF,
  POV_BAR_SEAT_HOTSPOTS,
  POV_CATEGORY_HOTSPOTS,
  POV_GEOMETRY_HOTSPOTS,
  POV_VESSEL_PLACEMENT,
} from '@/data/povHotspots';
import {
  resolveHotspotFrameStyle,
  resolveVesselSlotStyle,
  type StageFrameStyle,
} from '@/data/hotspotGeometry';
import {
  loadHotspotOffsets,
  type HotspotOffset,
} from '@/lib/hotspotOffsets';
import {
  CHARACTER_ELDER,
  characterToPatronDef,
  requireCharacter,
} from '@/data/characters';
import { type PatronLayout } from '@/data/patronLayout';
import { resolvePatronLayout } from '@/lib/patronLayoutStorage';
import {
  ReceiptProvider,
  ReceiptStageOverlay,
  ReceiptToolbar,
  useReceiptStageFlags,
} from '@/components/receipt/ReceiptSystem';
import MoneyFanoutFlyby from '@/components/receipt/MoneyFanoutFlyby';

const AVAILABLE_MODES = ['OBELISCO', 'CLASSICS'] as const;
/** Gold cutout for OBELISCO mode control (sys-header). */
const OBELISCO_MODE_LOGO_SRC = '/assets/logos/obelisco/obelisco-logo-gold.png';
/** Gold script cutout for CLASSICS mode control (sys-header). */
const CLASSICS_MODE_LOGO_SRC = '/assets/logos/classics/classics-logo-gold.png';

/** POV shell: clip carousels on-stage; only receipt Inspect may overflow. */
function PovStageShell({
  openCategory,
  povStageRef,
  stagePan,
  shellHudNudge,
  children,
}: {
  openCategory: CategoryKey | null;
  povStageRef: React.RefObject<HTMLDivElement | null>;
  /** FS74: shell cover pan (px) so selected carousel stays in glass */
  stagePan?: { x: number; y: number };
  /** FS75: pin jigger/printer to visible glass corners */
  shellHudNudge?: { tx: number; tyTop: number; tyBot: number };
  children: React.ReactNode;
}) {
  const { anyInspected } = useReceiptStageFlags();
  // Carousel open → overflow hidden (contain assets). Receipt inspect may overflow.
  const overflow =
    openCategory !== null
      ? 'hidden'
      : anyInspected
        ? 'visible'
        : 'hidden';

  const pan = stagePan ?? { x: 0, y: 0 };
  const transform =
    pan.x !== 0 || pan.y !== 0
      ? `translate(${pan.x}px, ${pan.y}px)`
      : undefined;

  const hud = shellHudNudge ?? { tx: 0, tyTop: 0, tyBot: 0 };
  const style = {
    overflow,
    transform,
    // FS75: glass-relative HUD offsets for jigger / printer chrome
    ['--shell-hud-tx' as string]: `${hud.tx}px`,
    ['--shell-hud-ty-top' as string]: `${hud.tyTop}px`,
    ['--shell-hud-ty-bot' as string]: `${hud.tyBot}px`,
  } as React.CSSProperties;

  return (
    <div
      ref={povStageRef}
      className={
        openCategory !== null
          ? 'pov-stage pov-stage--carousel-open'
          : anyInspected
            ? 'pov-stage pov-stage--receipt-inspect'
            : 'pov-stage'
      }
      /* Geometry (width / aspect / contain) lives in globals.css / gameboy-shell.css;
         overflow + optional shell pan + HUD CSS vars stay inline. */
      style={style}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [modeName, setModeName] = useState('OBELISCO');
  const [modePayload, setModePayload] = useState<NormalizedRestaurantPayload | null>(
    null
  );
  const [modeLoadError, setModeLoadError] = useState<string | null>(null);
  const [modeReloadToken, setModeReloadToken] = useState(0);

  const reloadMode = useCallback(() => {
    setModeReloadToken((t) => t + 1);
  }, []);

  const {
    state,
    selectGlass,
    addIngredient,
    addGarnish,
    applyTool,
    trashDrink,
    loadBuild,
    startHandoffAnim,
    setPourVolume,
    setAgitation,
    setMode,
  } = useSimulation();

  const [activeTicket, setActiveTicket] = useState<CocktailRecipe | null>(null);
  /** Free receipt instance owning the live mat; null = freestyle / unbound. */
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  /** Parked mat builds keyed by receipt instanceId (or freestyle key). */
  const [buildsByReceiptId, setBuildsByReceiptId] = useState<
    Record<string, SimulationState>
  >({});
  const [errors, setErrors] = useState<string[]>([]);
  /** Drink-placement vessel → liquid-glass drink-build card */
  const [drinkBuildCardOpen, setDrinkBuildCardOpen] = useState(false);
  /** Mat vessel playing success handoff slide (FS37). */
  const [vesselHandoff, setVesselHandoff] = useState(false);
  /** Provider fills this to slide-away + remove a receipt on success validate. */
  const handoffExitRef = useRef<((instanceId: string) => void) | null>(null);
  /** Provider fills this to read frozen pricedOrder.total (FS49 money flyby). */
  const getReceiptTotalRef = useRef<
    ((instanceId: string) => number | null) | null
  >(null);
  /** Success-validate money fanout play (FS49). */
  const [moneyFlyby, setMoneyFlyby] = useState<{
    playId: string;
    total: number;
  } | null>(null);
  /** Block double Validate during handoff. */
  const handoffInProgressRef = useRef(false);
  const handoffCleanupTimerRef = useRef<number | null>(null);
  /** Live vessel box in viewport CSS px (scale + pad-anchor for drink-build card) */
  const [vesselBoxPx, setVesselBoxPx] = useState<{
    w: number;
    h: number;
    left: number;
    top: number;
  } | null>(null);
  /** Mirror for dirty-set: skip setState when rect unchanged (≤0.5px). */
  const vesselBoxPxRef = useRef(vesselBoxPx);
  vesselBoxPxRef.current = vesselBoxPx;
  /** Mirror for dirty-set of hotspot frame style while carousel open. */
  const frameStyleRef = useRef<StageFrameStyle | null>(null);

  /** Park key when no receipt is active (freestyle pours). */
  const FREESTYLE_BUILD_KEY = '__freestyle__';
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeReceiptIdRef = useRef(activeReceiptId);
  activeReceiptIdRef.current = activeReceiptId;
  const buildsRef = useRef(buildsByReceiptId);
  buildsRef.current = buildsByReceiptId;

  const parkCurrentBuild = useCallback(() => {
    const key = activeReceiptIdRef.current ?? FREESTYLE_BUILD_KEY;
    const snap = cloneSimulationState(stateRef.current);
    buildsRef.current = { ...buildsRef.current, [key]: snap };
    setBuildsByReceiptId(buildsRef.current);
  }, []);

  /** Select free receipt → park previous mat, load this order’s parked build. */
  const handleSelectReceipt = useCallback(
    (instanceId: string, ticket: CocktailRecipe) => {
      if (instanceId === activeReceiptIdRef.current) {
        setActiveTicket(ticket);
        return;
      }
      parkCurrentBuild();
      const parked = buildsRef.current[instanceId];
      if (parked) {
        loadBuild(parked);
      } else {
        trashDrink();
      }
      setActiveReceiptId(instanceId);
      setActiveTicket(ticket);
      setErrors([]);
      setDrinkBuildCardOpen(false);
    },
    [parkCurrentBuild, loadBuild, trashDrink]
  );

  const clearAllParkedBuilds = useCallback(() => {
    buildsRef.current = {};
    setBuildsByReceiptId({});
    setActiveReceiptId(null);
  }, []);

  /** Duration must match receipt/drink handoff CSS (~0.9s) + buffer. */
  const VALIDATE_HANDOFF_MS = 1000;

  const runSuccessHandoff = useCallback(() => {
    if (handoffInProgressRef.current) return;
    handoffInProgressRef.current = true;

    const doneReceiptId = activeReceiptIdRef.current;
    setDrinkBuildCardOpen(false);
    setVesselHandoff(true);
    startHandoffAnim();

    if (doneReceiptId && handoffExitRef.current) {
      handoffExitRef.current(doneReceiptId);
    }

    if (handoffCleanupTimerRef.current != null) {
      window.clearTimeout(handoffCleanupTimerRef.current);
    }
    handoffCleanupTimerRef.current = window.setTimeout(() => {
      trashDrink();
      setVesselHandoff(false);

      if (doneReceiptId) {
        const next = { ...buildsRef.current };
        delete next[doneReceiptId];
        buildsRef.current = next;
        setBuildsByReceiptId(next);
        if (activeReceiptIdRef.current === doneReceiptId) {
          setActiveReceiptId(null);
        }
      }
      setActiveTicket(null);
      setErrors([]);
      handoffInProgressRef.current = false;
      handoffCleanupTimerRef.current = null;
    }, VALIDATE_HANDOFF_MS);
  }, [startHandoffAnim, trashDrink]);

  useEffect(() => {
    return () => {
      if (handoffCleanupTimerRef.current != null) {
        window.clearTimeout(handoffCleanupTimerRef.current);
      }
    };
  }, []);

  const switchMode = useCallback(
    (next: string) => {
      if (next === modeName) return;
      if (handoffCleanupTimerRef.current != null) {
        window.clearTimeout(handoffCleanupTimerRef.current);
        handoffCleanupTimerRef.current = null;
      }
      handoffInProgressRef.current = false;
      setVesselHandoff(false);
      trashDrink();
      clearAllParkedBuilds();
      setActiveTicket(null);
      setErrors([]);
      setModeName(next);
      void setMode(next);
    },
    [modeName, trashDrink, setMode, clearAllParkedBuilds]
  );

  useEffect(() => {
    let cancelled = false;
    setModeLoadError(null);
    loadMode(modeName)
      .then((data) => {
        if (!cancelled) {
          setModePayload(data);
          void setMode(modeName);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setModePayload(null);
          setModeLoadError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modeName, modeReloadToken, setMode]);

  const mode = useMemo(() => {
    if (!modePayload) return null;
    const payloadInstance = new ModePayload(modePayload);
    return new ConfiguredRestaurantMode(payloadInstance);
  }, [modePayload]);

  const manifest = mode?.getManifest() ?? null;
  const liquors = manifest?.getLiquors() ?? [];
  const syrups = manifest?.getSyrups() ?? [];
  const garnishes = manifest?.getGarnishes() ?? [];
  const glasses = manifest?.getGlasses() ?? [];
  const rims = manifest?.getRims() ?? [];
  const hardware = manifest?.getHardware() ?? [];

  /** Full freestyle catalogs (includes items not in Obelisco recipe filter). */
  const freestyleCatalog = useMemo(() => {
    const base = new DefaultFreestyleManifest();
    return { syrups: base.getSyrups(), liquors: base.getLiquors() };
  }, []);

  /**
   * Overlay bottle list for liquors / syrups categories:
   * - no ZONE_INVENTORY_IDS → full mode list for that category
   * - zone with fixed ids → mode stock wins: fixed order ∩ mode pourables,
   *   then append remaining mode liquors (or syrups) so required ids are never hidden
   */
  const getOverlayBottleItems = useCallback(
    (zoneId: string | null, category: CategoryKey): BottleCatalogItem[] => {
      const fixedIds = zoneId ? ZONE_INVENTORY_IDS[zoneId] : undefined;
      if (!fixedIds?.length) {
        if (category === 'liquors') return liquors;
        if (category === 'syrups') return syrups;
        return [];
      }
      // Bottle zones only — hardware zone lists (e.g. ice) resolve via getOverlayHardwareItems
      if (category !== 'liquors' && category !== 'syrups') return [];

      const byId = new Map<string, BottleCatalogItem>();
      freestyleCatalog.syrups.forEach((s) => byId.set(s.id, s));
      freestyleCatalog.liquors.forEach((l) => byId.set(l.id, l));
      // Mode items win for catalog membership (PayloadManifest-filtered)
      liquors.forEach((l) => byId.set(l.id, l));
      syrups.forEach((s) => byId.set(s.id, s));

      const modeBottleIds = new Set<string>([
        ...liquors.map((l) => l.id),
        ...syrups.map((s) => s.id),
      ]);

      const ordered: BottleCatalogItem[] = [];
      const seen = new Set<string>();
      for (const id of fixedIds) {
        if (!modeBottleIds.has(id) || seen.has(id)) continue;
        const item = byId.get(id);
        if (!item) continue;
        ordered.push(item);
        seen.add(id);
      }

      const primary = category === 'liquors' ? liquors : syrups;
      const rest = [...primary]
        .filter((item) => !seen.has(item.id))
        .sort((a, b) => a.id.localeCompare(b.id));
      for (const item of rest) {
        ordered.push(item);
        seen.add(item.id);
      }

      return ordered;
    },
    [liquors, syrups, freestyleCatalog]
  );

  /**
   * Hardware overlay list:
   * - zone with ZONE_INVENTORY_IDS (e.g. ice) → fixed ordered tool ids
   * - else full hardware inventory
   */
  const getOverlayHardwareItems = useCallback(
    (zoneId: string | null) => {
      const fixedIds = zoneId ? ZONE_INVENTORY_IDS[zoneId] : undefined;
      if (!fixedIds?.length) return hardware;
      const byId = new Map(hardware.map((t) => [t.id, t]));
      return fixedIds
        .map((id) => byId.get(id))
        .filter((item): item is (typeof hardware)[number] => item != null);
    },
    [hardware]
  );
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  /** FS71: shell D-pad focus among category hotspots (zoneId). */
  const [shellFocusZoneId, setShellFocusZoneId] = useState<string | null>(null);
  /**
   * FS74: pan stage under shell glass when a selected carousel would be clipped.
   * Not updated on D-pad focus alone — only when a carousel is open.
   */
  const [shellStagePan, setShellStagePan] = useState({ x: 0, y: 0 });
  /**
   * FS75: nudge stage-corner HUD (jigger / printer) into the visible glass
   * after cover crop + pan (px, applied as translate on those chrome nodes).
   */
  const [shellHudNudge, setShellHudNudge] = useState({
    tx: 0,
    tyTop: 0,
    tyBot: 0,
  });
  const [frameStyle, setFrameStyle] = useState<StageFrameStyle | null>(null);
  /** Active vessel box from drink_placement path */
  const [vesselSlotStyle, setVesselSlotStyle] = useState<StageFrameStyle | null>(null);
  /** Hotspot placement editor offsets (localStorage-backed) */
  const [hotspotOffsets, setHotspotOffsets] = useState<Record<string, HotspotOffset>>({});
  /** Patron layout overrides (PATRON EDIT / localStorage when editor re-enabled) */
  const [patronLayouts] = useState<Record<string, PatronLayout>>({});
  /** FS72: PATRON EDIT UI commented out — always false until editor restored */
  const patronEditOpen = false;
  const [patronSignupOpen, setPatronSignupOpen] = useState(false);
  /** Active character id (registry); drives assets + layout for PatronLayer */
  const [activeCharacterId, setActiveCharacterId] = useState(CHARACTER_ELDER.id);

  useEffect(() => {
    setHotspotOffsets(loadHotspotOffsets());
  }, []);

  const activeCharacter = useMemo(
    () => requireCharacter(activeCharacterId),
    [activeCharacterId]
  );

  const activePatronLayout = useMemo(
    () => resolvePatronLayout(activeCharacterId, patronLayouts),
    [activeCharacterId, patronLayouts]
  );

  const activePatronDef = useMemo(
    () => characterToPatronDef(activeCharacter),
    [activeCharacter]
  );

  const barSeatInputs = useMemo(
    () =>
      POV_BAR_SEAT_HOTSPOTS.map((h) => ({
        zoneId: h.zoneId,
        d: pathWithStoredOffset(h.zoneId, h.d, hotspotOffsets),
      })),
    [hotspotOffsets]
  );

  const drinkPlacementD = useMemo(
    () =>
      pathWithStoredOffset(
        POV_VESSEL_PLACEMENT.zoneId,
        POV_VESSEL_PLACEMENT.d,
        hotspotOffsets
      ),
    [hotspotOffsets]
  );
  const frameRef = useRef<HTMLDivElement>(null);
  const povStageRef = useRef<HTMLDivElement>(null);
  const vesselSlotRef = useRef<HTMLDivElement>(null);
  /** FS77: open local MagnificationCarousel for shell D-pad item nav */
  const shellCarouselRef = useRef<MagnificationCarouselHandle | null>(null);

  useEffect(() => {
    if (!state.vessel && drinkBuildCardOpen) {
      setDrinkBuildCardOpen(false);
    }
  }, [state.vessel, drinkBuildCardOpen]);

  /** Measure drink-placement vessel box (viewport px) for card scale + pad anchor.
   *  No window scroll listener: carousel scroll must not force Home re-renders (RE38). */
  useEffect(() => {
    const BOX_EPS = 0.5;
    const sameBox = (
      a: { w: number; h: number; left: number; top: number } | null,
      b: { w: number; h: number; left: number; top: number }
    ) =>
      !!a &&
      Math.abs(a.w - b.w) <= BOX_EPS &&
      Math.abs(a.h - b.h) <= BOX_EPS &&
      Math.abs(a.left - b.left) <= BOX_EPS &&
      Math.abs(a.top - b.top) <= BOX_EPS;

    const measure = () => {
      const el = vesselSlotRef.current;
      if (!el || !state.vessel) {
        if (vesselBoxPxRef.current !== null) {
          vesselBoxPxRef.current = null;
          setVesselBoxPx(null);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const next = { w: r.width, h: r.height, left: r.left, top: r.top };
        if (sameBox(vesselBoxPxRef.current, next)) return;
        vesselBoxPxRef.current = next;
        setVesselBoxPx(next);
      }
    };
    measure();
    const t1 = requestAnimationFrame(measure);
    const t2 = window.setTimeout(measure, 50);
    const t3 = window.setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', measure);
    };
  }, [state.vessel, vesselSlotStyle, drinkPlacementD, drinkBuildCardOpen]);

  const drinkBuildTitle = activeTicket
    ? activeTicket.name
    : '(no ticket)';

  const drinkBuildLines = useMemo(
    () =>
      Object.entries(state.ingredients).map(([id, oz]) => ({
        id,
        label: resolveDisplayName(id),
        oz,
      })),
    [state.ingredients]
  );

  const availableAgitations = useMemo(() => [...DRINK_METHOD_IDS], []);

  const itemsForCategory = useCallback((key: CategoryKey) => {
    switch (key) {
      case 'liquors': return liquors;
      case 'syrups': return syrups;
      case 'garnishes': return garnishes;
      case 'glassware': return glasses;
      case 'rims': return rims;
      case 'hardware': return hardware;
    }
  }, [liquors, syrups, garnishes, glasses, rims, hardware]);

  /** Drop UA focus ring when the focused node is a hotspot path. */
  const blurHotspotFocus = useCallback(() => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (
      active instanceof Element &&
      (active.classList.contains('hotspot-polygon') || active.closest?.('.hotspot-polygon'))
    ) {
      (active as HTMLElement).blur?.();
    }
  }, []);

  const closeOverlay = useCallback(() => {
    setOpenCategory(null);
    setActiveZoneId(null);
    setFrameStyle(null);
    setShellStagePan({ x: 0, y: 0 });
    blurHotspotFocus();
  }, [blurHotspotFocus]);

  /** Category hotspots the shell D-pad may focus (carousel-capable only). */
  const shellNavigableHotspots = POV_CATEGORY_HOTSPOTS;

  /** Approximate hotspot anchor from path start (viewBox units) for spatial D-pad. */
  const shellHotspotAnchor = useCallback((d: string) => {
    const m = d.match(/M\s*([-\d.]+)[,\s]+([-\d.]+)/i);
    return m
      ? { x: Number(m[1]), y: Number(m[2]) }
      : { x: 0, y: 0 };
  }, []);

  const handleHotspotActivate = useCallback((zoneId: string, category: CategoryKey) => {
    // Same zone while open → toggle closed
    if (openCategory !== null && activeZoneId === zoneId) {
      closeOverlay();
      return;
    }
    // Different zone (including same category via another hardware zone) → open/re-anchor
    setOpenCategory(category);
    setActiveZoneId(zoneId);
    setShellFocusZoneId(zoneId);
  }, [openCategory, activeZoneId, closeOverlay]);

  /**
   * FS71/FS77: D-pad — hotspot browse when carousel closed; carousel item
   * nav when open (←/→ step, ↑ first, ↓ last). Does not pan on focus alone.
   */
  const shellDpad = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      // FS77 carousel mode
      if (openCategory !== null) {
        const car = shellCarouselRef.current;
        if (!car) return;
        if (dir === 'left') car.step(-1);
        else if (dir === 'right') car.step(1);
        else if (dir === 'up') car.goFirst();
        else if (dir === 'down') car.goLast();
        return;
      }

      // FS71 hotspot browse mode
      const list = shellNavigableHotspots;
      if (list.length === 0) return;

      const curId = shellFocusZoneId ?? list[0].zoneId;
      const cur = list.find((h) => h.zoneId === curId) ?? list[0];
      const curD = pathWithStoredOffset(cur.zoneId, cur.d, hotspotOffsets);
      const c = shellHotspotAnchor(curD);

      type Cand = {
        h: (typeof list)[number];
        dist: number;
      };
      const scored: Cand[] = [];
      for (const h of list) {
        if (h.zoneId === cur.zoneId) continue;
        const d = pathWithStoredOffset(h.zoneId, h.d, hotspotOffsets);
        const p = shellHotspotAnchor(d);
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        let ok = false;
        if (dir === 'left') ok = dx < -8;
        else if (dir === 'right') ok = dx > 8;
        else if (dir === 'up') ok = dy < -8;
        else if (dir === 'down') ok = dy > 8;
        if (!ok) continue;
        const primary =
          dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy);
        const secondary =
          dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
        scored.push({ h, dist: primary + secondary * 0.35 });
      }

      if (scored.length > 0) {
        scored.sort((a, b) => a.dist - b.dist);
        setShellFocusZoneId(scored[0].h.zoneId);
        return;
      }

      const idx = Math.max(
        0,
        list.findIndex((h) => h.zoneId === cur.zoneId)
      );
      const next =
        dir === 'left' || dir === 'up'
          ? list[(idx - 1 + list.length) % list.length]
          : list[(idx + 1) % list.length];
      setShellFocusZoneId(next.zoneId);
    },
    [
      openCategory,
      shellNavigableHotspots,
      shellFocusZoneId,
      hotspotOffsets,
      shellHotspotAnchor,
    ]
  );

  /** FS71: A — open carousel for focused hotspot (does not toggle-close). */
  const shellPressA = useCallback(() => {
    const list = shellNavigableHotspots;
    if (list.length === 0) return;
    const zoneId = shellFocusZoneId ?? list[0].zoneId;
    const h = list.find((x) => x.zoneId === zoneId) ?? list[0];
    if (!h.category) return;
    setShellFocusZoneId(h.zoneId);
    setOpenCategory(h.category);
    setActiveZoneId(h.zoneId);
  }, [shellNavigableHotspots, shellFocusZoneId]);

  /** FS71: B — close open carousel; keep shell hotspot focus. */
  const shellPressB = useCallback(() => {
    if (openCategory === null) return;
    setOpenCategory(null);
    setActiveZoneId(null);
    setFrameStyle(null);
    setShellStagePan({ x: 0, y: 0 });
    blurHotspotFocus();
  }, [openCategory, blurHotspotFocus]);

  /** Pointer: activate then blur path so browser bbox focus ring never lingers. */
  const onHotspotPointerActivate = useCallback(
    (zoneId: string, category: CategoryKey, pathEl: SVGPathElement) => {
      handleHotspotActivate(zoneId, category);
      // Blur after handlers so focus is not left on the path
      pathEl.blur();
      // Double-rAF in case the browser re-focuses the path after click
      requestAnimationFrame(() => {
        pathEl.blur();
        blurHotspotFocus();
      });
    },
    [handleHotspotActivate, blurHotspotFocus]
  );

  /** Keyboard: activate then move focus into the frame (no path rect ring). */
  const onHotspotKeyboardActivate = useCallback(
    (zoneId: string, category: CategoryKey) => {
      const willClose = openCategory !== null && activeZoneId === zoneId;
      handleHotspotActivate(zoneId, category);
      requestAnimationFrame(() => {
        if (willClose) {
          blurHotspotFocus();
          return;
        }
        // Frame mounts async with frameStyle — retry focus briefly
        const tryFocusFrame = (attempts: number) => {
          if (frameRef.current) {
            frameRef.current.focus({ preventScroll: true });
            blurHotspotFocus();
            return;
          }
          if (attempts > 0) {
            requestAnimationFrame(() => tryFocusFrame(attempts - 1));
          } else {
            blurHotspotFocus();
          }
        };
        tryFocusFrame(8);
      });
    },
    [handleHotspotActivate, openCategory, activeZoneId, blurHotspotFocus]
  );

  // Measure drink_placement pad for on-stage vessel position (includes editor offsets)
  useEffect(() => {
    const measure = () => {
      const style = resolveVesselSlotStyle(
        POV_VESSEL_PLACEMENT.zoneId,
        drinkPlacementD
      );
      setVesselSlotStyle(style);
    };
    measure();
    const t1 = requestAnimationFrame(measure);
    const t2 = window.setTimeout(measure, 50);
    const t3 = window.setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', measure);
    };
  }, [drinkPlacementD]);

  /**
   * FS75: Keep jigger + receipt printer chrome in the visible glass viewport
   * under cover crop and FS74 pan (stage-corner anchors would leave the glass).
   */
  useEffect(() => {
    let cancelled = false;
    const updateHudNudge = () => {
      if (cancelled) return;
      const stage = povStageRef.current;
      if (!stage) {
        setShellHudNudge({ tx: 0, tyTop: 0, tyBot: 0 });
        return;
      }
      const section = stage.parentElement;
      if (
        !section ||
        !section.classList.contains('pov-shell-section') ||
        !section.closest('.gb-shell__playfield')
      ) {
        setShellHudNudge({ tx: 0, tyTop: 0, tyBot: 0 });
        return;
      }
      const S = section.getBoundingClientRect();
      const T = stage.getBoundingClientRect();
      if (S.width < 8 || S.height < 8 || T.width < 8 || T.height < 8) return;
      // Move stage-corner chrome to the matching glass corner (viewport Δ = CSS px).
      const next = {
        tx: S.right - T.right,
        tyTop: S.top - T.top,
        tyBot: S.bottom - T.bottom,
      };
      setShellHudNudge((prev) =>
        prev.tx === next.tx &&
        prev.tyTop === next.tyTop &&
        prev.tyBot === next.tyBot
          ? prev
          : next
      );
    };

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(updateHudNudge);
    });
    const t = window.setTimeout(updateHudNudge, 60);
    window.addEventListener('resize', updateHudNudge);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.clearTimeout(t);
      window.removeEventListener('resize', updateHudNudge);
    };
  }, [shellStagePan, openCategory, activeZoneId, frameStyle]);

  /**
   * FS74: When a carousel is open, pan the shell-covered stage so the carousel
   * frame sits fully inside the housing glass. Does not run on D-pad focus alone
   * (only when openCategory + frame are active). Resets pan when closed.
   */
  useEffect(() => {
    if (openCategory === null || !frameStyle || !activeZoneId) {
      setShellStagePan({ x: 0, y: 0 });
      return;
    }

    let cancelled = false;
    const MARGIN = 10;
    let timeoutId = 0;

    const computePanFromNeutral = (): { x: number; y: number } => {
      const stage = povStageRef.current;
      const frame = frameRef.current;
      if (!stage || !frame) return { x: 0, y: 0 };

      const section = stage.parentElement;
      if (!section || !section.classList.contains('pov-shell-section')) {
        return { x: 0, y: 0 };
      }
      if (!section.closest('.gb-shell__playfield')) {
        return { x: 0, y: 0 };
      }

      // Measure against neutral transform so pan is absolute, not incremental.
      const prevTransform = stage.style.transform;
      stage.style.transition = 'none';
      stage.style.transform = 'none';
      // Force layout
      void stage.offsetWidth;

      const S = section.getBoundingClientRect();
      const F = frame.getBoundingClientRect();
      const T = stage.getBoundingClientRect();

      let dx = 0;
      let dy = 0;
      if (F.left < S.left + MARGIN) dx = S.left + MARGIN - F.left;
      else if (F.right > S.right - MARGIN) dx = S.right - MARGIN - F.right;
      if (F.top < S.top + MARGIN) dy = S.top + MARGIN - F.top;
      else if (F.bottom > S.bottom - MARGIN) dy = S.bottom - MARGIN - F.bottom;

      // Keep stage covering the glass (no black bands)
      const maxDx = S.left - T.left;
      const minDx = S.right - T.right;
      const maxDy = S.top - T.top;
      const minDy = S.bottom - T.bottom;
      dx = Math.min(Math.max(dx, minDx), maxDx);
      dy = Math.min(Math.max(dy, minDy), maxDy);

      stage.style.transform = prevTransform;
      stage.style.transition = '';

      return { x: dx, y: dy };
    };

    const applyPan = () => {
      if (cancelled) return;
      const next = computePanFromNeutral();
      setShellStagePan((prev) =>
        prev.x === next.x && prev.y === next.y ? prev : next
      );
    };

    const t0 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyPan();
        timeoutId = window.setTimeout(applyPan, 50);
      });
    });

    const onResize = () => {
      applyPan();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(t0);
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('resize', onResize);
    };
  }, [openCategory, activeZoneId, frameStyle]);

  // Compute frame geometry from active zone (tracks resize + editor offsets)
  useEffect(() => {
    if (!activeZoneId) {
      frameStyleRef.current = null;
      setFrameStyle(null);
      return;
    }
    const hotspot = POV_CATEGORY_HOTSPOTS.find((h) => h.zoneId === activeZoneId);
    if (!hotspot || !hotspot.category) {
      frameStyleRef.current = null;
      setFrameStyle(null);
      return;
    }

    const sameFrame = (a: StageFrameStyle | null, b: StageFrameStyle | null) => {
      if (a === null && b === null) return true;
      if (!a || !b) return false;
      return (
        a.left === b.left &&
        a.top === b.top &&
        a.width === b.width &&
        a.height === b.height &&
        a.transform === b.transform
      );
    };

    const update = () => {
      const d = pathWithStoredOffset(hotspot.zoneId, hotspot.d, hotspotOffsets);
      const style = resolveHotspotFrameStyle(
        activeZoneId,
        d,
        povStageRef.current
      );
      if (sameFrame(frameStyleRef.current, style)) return;
      frameStyleRef.current = style;
      setFrameStyle(style);
    };

    update();
    window.addEventListener('resize', update);
    const ro =
      typeof ResizeObserver !== 'undefined' && povStageRef.current
        ? new ResizeObserver(update)
        : null;
    if (povStageRef.current) ro?.observe(povStageRef.current);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [activeZoneId, hotspotOffsets]);

  useEffect(() => {
    if (openCategory === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCategory, closeOverlay]);

  // Outside click dismiss — no full-screen backdrop; hotspots still handle their own clicks
  useEffect(() => {
    if (openCategory === null) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (frameRef.current?.contains(target)) return;
      if (target.closest?.('.hotspot-polygon') || target.closest?.('[data-zone]')) return;
      // FS78: shell D-pad / A / B must not dismiss carousel (else FS77 nav never runs)
      if (
        target.closest?.('.gb-shell__controls') ||
        target.closest?.('.gb-shell__dpad') ||
        target.closest?.('.gb-shell__btn-a') ||
        target.closest?.('.gb-shell__btn-b') ||
        target.closest?.('.gb-shell__btn-ab')
      ) {
        return;
      }
      closeOverlay();
      blurHotspotFocus();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [openCategory, closeOverlay, blurHotspotFocus]);

  const renderOverlayCarousel = (category: CategoryKey, zoneId: string | null) => {
    switch (category) {
      case 'liquors':
      case 'syrups': {
        const overlayItems = getOverlayBottleItems(zoneId, category);
        return (
          <MagnificationCarousel ref={shellCarouselRef} layout="local">
            {overlayItems.map(item => (
              <BottleAsset
                key={item.id}
                presentation="overlay"
                archetype={item.archetype}
                liquidColor={item.liquidColor}
                fillLevel={item.fillLevel}
                label={item.label}
                subLabel={item.subLabel}
                hexText={item.hexText}
                liquidClass={item.liquidClass}
                onClick={() => addIngredient(item.id, item.liquidColor)}
              />
            ))}
          </MagnificationCarousel>
        );
      }
      case 'garnishes':
        return (
          <MagnificationCarousel ref={shellCarouselRef} layout="local">
            {garnishes.map(garnish => (
              <GarnishAsset
                key={garnish.id}
                presentation="overlay"
                type={garnish.type}
                svgHref={garnish.svgHref}
                label={garnish.label}
                subLabel={garnish.subLabel}
                rindColor={garnish.rindColor}
                pulpColor={garnish.pulpColor}
                onClick={() => addGarnish(garnish.id, garnish.type, garnish.svgHref, garnish.rindColor, garnish.pulpColor)}
              />
            ))}
          </MagnificationCarousel>
        );
      case 'glassware':
        return (
          <MagnificationCarousel ref={shellCarouselRef} layout="local">
            {glasses.map(glass => (
              <GlassAsset
                key={glass.id}
                presentation="overlay"
                outlineId={glass.outlineId}
                clipId={glass.clipId}
                liquidColor={glass.liquidColor}
                fillLevel={glass.fillLevel}
                label={glass.label}
                vesselId={glass.id}
                subLabel={glass.subLabel}
                onClick={() => selectGlass(glass.id, glass.maxOz)}
              />
            ))}
          </MagnificationCarousel>
        );
      case 'rims':
        return (
          <MagnificationCarousel ref={shellCarouselRef} layout="local">
            {rims.map(rim => (
              <RimmingAsset
                key={rim.id}
                presentation="overlay"
                type="rim"
                svgHref={rim.svgHref}
                label={rim.label}
                onClick={() => addGarnish(rim.id, 'coating', rim.svgHref)}
              />
            ))}
          </MagnificationCarousel>
        );
      case 'hardware': {
        const overlayHardware = getOverlayHardwareItems(zoneId);
        return (
          <MagnificationCarousel ref={shellCarouselRef} layout="local">
            {overlayHardware.map(tool => (
              <HardwareAsset
                key={tool.id}
                presentation="overlay"
                type="hardware"
                svgHref={tool.svgHref}
                imageSrc={tool.imageSrc}
                fanOut={tool.fanOut}
                label={tool.label}
                onClick={() => applyTool(tool.id)}
              />
            ))}
          </MagnificationCarousel>
        );
      }
    }
  };

  /** FS79: boot cinematic on Game Boy screen before interactive game (5 taps skip) */
  const [bootComplete, setBootComplete] = useState(false);
  const onBootComplete = useCallback(() => setBootComplete(true), []);

  if (!bootComplete) {
    return <BootIntro onComplete={onBootComplete} />;
  }

  if (!mode || !manifest) {
    return (
      <div className="terminal-frame">
        <div className="sys-header">
          {modeLoadError
            ? `>> MODE LOAD ERROR: ${modeLoadError}`
            : `>> LOADING MODE ${modeName}…`}
        </div>
        {modeLoadError ? (
          <button type="button" className="sys-btn" onClick={reloadMode}>
            RETRY
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <GlobalSVGDefs />
      <div className="terminal-frame">
        <div className="sys-header" style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {AVAILABLE_MODES.map((m) => {
              const active = modeName === m;
              if (m === 'OBELISCO') {
                return (
                  <button
                    key={m}
                    type="button"
                    className={`mode-btn mode-btn--obelisco${active ? ' mode-btn--active' : ''}`}
                    disabled={active}
                    aria-current={active ? 'true' : undefined}
                    aria-label={active ? 'Active mode: OBELISCO' : 'Switch to OBELISCO'}
                    title={active ? 'Active mode: OBELISCO' : 'Switch to OBELISCO'}
                    onClick={() => switchMode(m)}
                  >
                    <img
                      src={OBELISCO_MODE_LOGO_SRC}
                      alt=""
                      className="mode-btn-obelisco-logo"
                      draggable={false}
                    />
                  </button>
                );
              }
              if (m === 'CLASSICS') {
                return (
                  <button
                    key={m}
                    type="button"
                    className={`mode-btn mode-btn--classics${active ? ' mode-btn--active' : ''}`}
                    disabled={active}
                    aria-current={active ? 'true' : undefined}
                    aria-label={active ? 'Active mode: CLASSICS' : 'Switch to CLASSICS'}
                    title={active ? 'Active mode: CLASSICS' : 'Switch to CLASSICS'}
                    onClick={() => switchMode(m)}
                  >
                    <img
                      src={CLASSICS_MODE_LOGO_SRC}
                      alt=""
                      className="mode-btn-classics-logo"
                      draggable={false}
                    />
                  </button>
                );
              }
              return (
                <button
                  key={m}
                  type="button"
                  className="sys-btn"
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    opacity: active ? 1 : 0.65,
                    outline: active ? '1px solid var(--glass-amber)' : undefined,
                    cursor: active ? 'default' : 'pointer',
                  }}
                  disabled={active}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => switchMode(m)}
                  title={active ? `Active mode: ${m}` : `Switch to ${m}`}
                >
                  {m}
                </button>
              );
            })}
          </span>
        </div>

        <ReceiptProvider
          key={modeName}
          modeName={modeName}
          activeTicket={activeTicket}
          activeReceiptId={activeReceiptId}
          handoffExitRef={handoffExitRef}
          getReceiptTotalRef={getReceiptTotalRef}
          onActiveTicketChange={(ticket) => {
            if (handoffInProgressRef.current) return;
            setActiveTicket(ticket);
            setErrors([]);
          }}
          onSelectReceipt={(instanceId, ticket) => {
            if (handoffInProgressRef.current) return;
            handleSelectReceipt(instanceId, ticket);
          }}
          onGenerate={() => {
            // Print only — do not change selected receipt, mat, or validate target (FS40)
            if (handoffInProgressRef.current) return null;
            return mode.getRecipeManager().getRandomTicket();
          }}
        >
          {/*
            FS65/FS67 — Game Boy shell (CSS-gated mobile portrait only).
            Nest: .pov-stage + diegetic in full battery/screen housing
            (.gb-shell__screen-cont), not tiny inner glass only.
            Outside plastic: .sys-header (above) + ReceiptToolbar (below).
            Shell controls decorative (pointer-events: none in CSS). De-branded.
          */}
          <div className="gb-shell-slot">
            <div className="gb-shell-scale">
              <div className="gb-shell" aria-label="Game Boy presentation frame">
                <div className="gb-shell__on-off" aria-hidden="true">
                  {'< off-on >'}
                </div>
                <div className="gb-shell__screen-cont">
                  <div className="gb-shell__power" aria-hidden="true" />
                  <div className="gb-shell__header" aria-hidden="true">
                    DOT MATRIX WITH STEREO SOUND
                  </div>
                  <div className="gb-shell__playfield">
                      {/* POV STAGE — fills battery/screen housing (FS67) */}
                      <section className="pov-shell-section">
                        <PovStageShell
                          openCategory={openCategory}
                          povStageRef={povStageRef}
                          stagePan={shellStagePan}
                          shellHudNudge={shellHudNudge}
                        >
                          <img
                            src="/OBELISCO_POV.jpg"
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'block',
                            }}
                            alt="Obelisco bar point of view"
                          />
                          {/*
                            Patrons: layout-driven path/size (PATRON EDIT).
                            barCutoffD clips sprite to room-only so lower body sits behind the bar photo.
                          */}
                          <PatronLayer
                            seats={barSeatInputs}
                            layout={activePatronLayout}
                            patron={activePatronDef}
                            characterId={activeCharacterId}
                            editMode={patronEditOpen}
                            barCutoffD={pathWithStoredOffset(
                              POV_BAR_CUTOFF.zoneId,
                              POV_BAR_CUTOFF.d,
                              hotspotOffsets
                            )}
                          />
                          <svg
                            className="pov-hotspot-svg"
                            viewBox="0 0 1184 880"
                            /* FS73: stage cover keeps 1184∶880; meet matches art 1:1 in that box.
                               (FS70 non-uniform fill + meet caused hotspot drift.) */
                            preserveAspectRatio="xMidYMid meet"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              pointerEvents: 'none',
                            }}
                          >
                            <defs>
                              <filter
                                id="spatial-glow"
                                x="-50%"
                                y="-50%"
                                width="200%"
                                height="200%"
                              >
                                <feDropShadow
                                  dx="0"
                                  dy="0"
                                  stdDeviation="15"
                                  floodColor="#FFB000"
                                  floodOpacity="0.8"
                                />
                              </filter>
                            </defs>
                            {POV_CATEGORY_HOTSPOTS.map((hotspot) => (
                              <path
                                key={hotspot.zoneId}
                                className={
                                  shellFocusZoneId === hotspot.zoneId
                                    ? 'hotspot-polygon hotspot-polygon--shell-focus'
                                    : 'hotspot-polygon'
                                }
                                data-zone={hotspot.zoneId}
                                aria-label={hotspot.ariaLabel}
                                aria-current={
                                  shellFocusZoneId === hotspot.zoneId
                                    ? 'true'
                                    : undefined
                                }
                                role="button"
                                tabIndex={0}
                                style={{
                                  pointerEvents: 'auto',
                                  outline: 'none',
                                }}
                                d={pathWithStoredOffset(
                                  hotspot.zoneId,
                                  hotspot.d,
                                  hotspotOffsets
                                )}
                                onClick={(e) => {
                                  if (!hotspot.category) return;
                                  setShellFocusZoneId(hotspot.zoneId);
                                  onHotspotPointerActivate(
                                    hotspot.zoneId,
                                    hotspot.category,
                                    e.currentTarget
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!hotspot.category) return;
                                    setShellFocusZoneId(hotspot.zoneId);
                                    onHotspotKeyboardActivate(
                                      hotspot.zoneId,
                                      hotspot.category
                                    );
                                  }
                                }}
                              />
                            ))}
                            {/* Drink pad measure path (not a category open target) */}
                            <path
                              data-zone={POV_VESSEL_PLACEMENT.zoneId}
                              d={drinkPlacementD}
                              fill="transparent"
                              stroke="none"
                              style={{ pointerEvents: 'none' }}
                              aria-hidden="true"
                            />
                            {/* Geometry zones (e.g. bar_cutoff) — measure / future layers; no click */}
                            {POV_GEOMETRY_HOTSPOTS.map((hotspot) => (
                              <path
                                key={hotspot.zoneId}
                                data-zone={hotspot.zoneId}
                                d={pathWithStoredOffset(
                                  hotspot.zoneId,
                                  hotspot.d,
                                  hotspotOffsets
                                )}
                                fill="transparent"
                                stroke="none"
                                style={{ pointerEvents: 'none' }}
                                aria-hidden="true"
                              />
                            ))}
                          </svg>

                          {/*
                            FS72: HOTSPOT EDIT + PATRON EDIT UI commented out for play.
                            Uncomment mounts (+ imports above) to restore authoring tools.
                          */}
                          {/*
                          <HotspotPlacementEditor
                            onOffsetsChange={setHotspotOffsets}
                          />
                          <PatronPlacementEditor
                            seats={barSeatInputs}
                            onLayoutChange={setPatronLayouts}
                            onOpenChange={setPatronEditOpen}
                            onCharacterChange={setActiveCharacterId}
                          />
                          */}

                          {/* Diegetic receipt printer + paper (top-right, asset-only) */}
                          <ReceiptStageOverlay />

                          {/* Localized category carousel — centered on active hotspot */}
                          {openCategory !== null && frameStyle && (
                            <CategoryOverlay
                              key={`${openCategory}-${activeZoneId}`}
                              ref={frameRef}
                              title={
                                activeZoneId === 'juices'
                                  ? 'JUICES'
                                  : activeZoneId === 'speedrail'
                                    ? 'SPEEDRAIL'
                                    : activeZoneId === 'ice'
                                      ? 'ICE'
                                      : CATEGORY_TITLES[openCategory]
                              }
                              onClose={closeOverlay}
                              isEmpty={
                                activeZoneId != null &&
                                ZONE_INVENTORY_IDS[activeZoneId] != null
                                  ? openCategory === 'hardware'
                                    ? getOverlayHardwareItems(activeZoneId)
                                        .length === 0
                                    : getOverlayBottleItems(
                                        activeZoneId,
                                        openCategory
                                      ).length === 0
                                  : itemsForCategory(openCategory).length === 0
                              }
                              frameStyle={frameStyle}
                            >
                              {renderOverlayCarousel(
                                openCategory,
                                activeZoneId
                              )}
                            </CategoryOverlay>
                          )}

                          {/* Live vessel on drink_placement pad — blank when no vessel */}
                          {state.vessel && vesselSlotStyle ? (
                            <div
                              ref={vesselSlotRef}
                              className={`pov-active-vessel${vesselHandoff ? ' pov-active-vessel--handoff' : ''}`}
                              role="button"
                              tabIndex={vesselHandoff ? -1 : 0}
                              aria-label="Active vessel — view drink build"
                              style={{
                                left: vesselSlotStyle.left,
                                top: vesselSlotStyle.top,
                                width: vesselSlotStyle.width,
                                height: vesselSlotStyle.height,
                                transform: vesselSlotStyle.transform,
                              }}
                              onClick={() => {
                                if (vesselHandoff) return;
                                setDrinkBuildCardOpen(true);
                              }}
                              onKeyDown={(e) => {
                                if (vesselHandoff) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setDrinkBuildCardOpen(true);
                                }
                              }}
                            >
                              <GlassAsset
                                presentation="overlay"
                                animClass={state.animClass}
                                outlineId={
                                  glasses.find((g) => g.id === state.vessel)
                                    ?.outlineId || ''
                                }
                                clipId={
                                  glasses.find((g) => g.id === state.vessel)
                                    ?.clipId || ''
                                }
                                label=""
                                vesselId={state.vessel}
                                currentVolumeOz={state.currentVolumeOz}
                                maxOz={state.maxOz}
                                liquidColor={state.liquidColor}
                                ingredients={state.ingredients}
                                garnishes={state.garnishes}
                                agitation={state.agitation}
                                iceType={state.iceType}
                                rim={state.rim}
                              />
                            </div>
                          ) : null}

                          <JiggerPourControl
                            pourVolumeOz={state.pourVolumeOz}
                            onSelectVolume={setPourVolume}
                          />

                          {/* FS50: money flyby clipped to POV stage (not full browser) */}
                          {moneyFlyby ? (
                            <MoneyFanoutFlyby
                              key={moneyFlyby.playId}
                              playId={moneyFlyby.playId}
                              total={moneyFlyby.total}
                              onComplete={() => setMoneyFlyby(null)}
                            />
                          ) : null}
                        </PovStageShell>
                      </section>
                  </div>
                </div>
                <div className="gb-shell__controls">
                  <div className="gb-shell__btn-direction">
                    <div className="gb-shell__btn-direction-v" aria-hidden="true" />
                    <div className="gb-shell__btn-direction-h" aria-hidden="true" />
                    <button
                      type="button"
                      className="gb-shell__dpad gb-shell__dpad--up"
                      aria-label="Carousel first item or previous hotspot up"
                      onClick={() => shellDpad('up')}
                    />
                    <button
                      type="button"
                      className="gb-shell__dpad gb-shell__dpad--down"
                      aria-label="Carousel last item or next hotspot down"
                      onClick={() => shellDpad('down')}
                    />
                    <button
                      type="button"
                      className="gb-shell__dpad gb-shell__dpad--left"
                      aria-label="Carousel previous item or previous hotspot left"
                      onClick={() => shellDpad('left')}
                    />
                    <button
                      type="button"
                      className="gb-shell__dpad gb-shell__dpad--right"
                      aria-label="Carousel next item or next hotspot right"
                      onClick={() => shellDpad('right')}
                    />
                  </div>
                  <div className="gb-shell__btn-ab">
                    <button
                      type="button"
                      className="gb-shell__btn-b"
                      aria-label="Close carousel"
                      onClick={shellPressB}
                    />
                    <button
                      type="button"
                      className="gb-shell__btn-a"
                      aria-label="Open carousel for focused hotspot"
                      onClick={shellPressA}
                    />
                  </div>
                  <div className="gb-shell__btn-start-select" aria-hidden="true">
                    <span className="gb-shell__btn-select">SELECT</span>
                    <span className="gb-shell__btn-start">START</span>
                  </div>
                </div>
                <div className="gb-shell__speakers" aria-hidden="true" />
                <div className="gb-shell__phones" aria-hidden="true">
                  phones
                </div>
              </div>
            </div>
          </div>

          <DrinkBuildCard
            open={drinkBuildCardOpen}
            drinkTitle={drinkBuildTitle}
            lines={drinkBuildLines}
            sizePx={vesselBoxPx}
            onClose={() => setDrinkBuildCardOpen(false)}
            onTrash={() => {
              trashDrink();
              // Drop parked progress for the active order (paper stays)
              const key = activeReceiptIdRef.current;
              if (key) {
                const next = { ...buildsRef.current };
                delete next[key];
                buildsRef.current = next;
                setBuildsByReceiptId(next);
              } else {
                const next = { ...buildsRef.current };
                delete next[FREESTYLE_BUILD_KEY];
                buildsRef.current = next;
                setBuildsByReceiptId(next);
              }
              setDrinkBuildCardOpen(false);
            }}
          />

          {/* Ticket controls outside POV corner art */}
          <ReceiptToolbar
            errors={errors}
            validationPassed={
              errors.length === 0 && !!activeTicket && !!state.vessel
            }
            onValidate={() => {
              if (handoffInProgressRef.current) return;
              // Selected order only: activeTicket + live mat (not parked builds)
              if (!activeTicket) {
                setErrors([]);
                return;
              }
              const errs = mode
                .getRecipeManager()
                .validateDrink(state, activeTicket);
              setErrors(errs);
              if (errs.length > 0) return;
              if (!state.vessel) return;
              // FS49: money flyby for frozen receipt total (success only)
              const rid = activeReceiptIdRef.current;
              if (rid && getReceiptTotalRef.current) {
                const total = getReceiptTotalRef.current(rid);
                if (
                  typeof total === 'number' &&
                  Number.isFinite(total) &&
                  Math.floor(total) > 0
                ) {
                  setMoneyFlyby({
                    playId: `${rid}-${Date.now()}`,
                    total,
                  });
                }
              }
              // Success handoff: drink up + ticket away, then clear (FS37)
              runSuccessHandoff();
            }}
          />
        </ReceiptProvider>

      </div>
    </>
  );
}
