import { useState, useCallback, useEffect } from 'react';
import { loadMode } from '../lib/validation/modeLoader';
import { generateTicket } from '../lib/validation/ticketGenerator';
import { validateDrink as validateDrinkFn } from '../lib/validation/validateDrink';
import type { Ticket, ModeData } from '../lib/validation/types';
import { POUR_VOLUME_OZ } from '../data/pourVolumes';
import {
  DrinkMethod,
  methodFromHardwareToolId,
  animClassForMethod,
} from '../data/methods';

export const HardwareMetrics: Record<string, { rimY: number, floorY: number, rimRightX: number, rimLeftX: number, garnishScale: number }> = {
  "ROCKS": { rimY: 44, floorY: 76, rimRightX: 52, rimLeftX: 12, garnishScale: 0.45 },
  "HIGHBALL": { rimY: 16, floorY: 76, rimRightX: 48, rimLeftX: 16, garnishScale: 0.4 },
  "COLLINS": { rimY: 10, floorY: 76, rimRightX: 44, rimLeftX: 20, garnishScale: 0.4 },
  "COUPE": { rimY: 36, floorY: 56, rimRightX: 56, rimLeftX: 8, garnishScale: 0.35 },
  "MARTINI": { rimY: 24, floorY: 48, rimRightX: 56, rimLeftX: 8, garnishScale: 0.35 },
  "NORA": { rimY: 24, floorY: 52, rimRightX: 52, rimLeftX: 12, garnishScale: 0.3 },
  "FLUTE": { rimY: 16, floorY: 62, rimRightX: 42, rimLeftX: 22, garnishScale: 0.3 },
  "RIBBED_COUPE": { rimY: 36, floorY: 56, rimRightX: 54, rimLeftX: 10, garnishScale: 0.35 }
};

export type GarnishState = {
  id: string;
  type: string;
  svgHref: string;
  rindColor?: string;
  pulpColor?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  height?: number;
};

export type ColorMixItem = { r: number, g: number, b: number, volumeOz: number };

export type SimulationState = {
  vessel: string | null;
  rim: string | null;
  ingredients: Record<string, number>;
  colorMix: ColorMixItem[];
  currentVolumeOz: number;
  agitation: string;
  garnishes: GarnishState[];
  maxOz: number;
  iceType: string | null;
  pourVolumeOz: number;
  liquidColor: string;
  animClass: string;
};

/** Deep clone of mat build state; clears transient animation class. */
export function cloneSimulationState(s: SimulationState): SimulationState {
  return {
    ...s,
    ingredients: { ...s.ingredients },
    colorMix: s.colorMix.map((c) => ({ ...c })),
    garnishes: s.garnishes.map((g) => ({ ...g })),
    animClass: '',
  };
}

/** Empty mat (blank pad); preserves jigger step like trashDrink. */
export function emptySimulationState(pourVolumeOz: number): SimulationState {
  return {
    vessel: null,
    rim: null,
    ingredients: {},
    colorMix: [],
    currentVolumeOz: 0,
    agitation: DrinkMethod.BUILT,
    garnishes: [],
    maxOz: 10,
    iceType: null,
    pourVolumeOz,
    liquidColor: 'transparent',
    animClass: '',
  };
}

function hexToRgb(hex: string) {
  hex = hex.trim();
  if (hex.startsWith('rgb')) {
      let args = hex.match(/\d+/g);
      if (args && args.length >= 3) return { r: parseInt(args[0]), g: parseInt(args[1]), b: parseInt(args[2]) };
  }
  let r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (r) return { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) };
  let sr = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (sr) return { r: parseInt(sr[1] + sr[1], 16), g: parseInt(sr[2] + sr[2], 16), b: parseInt(sr[3] + sr[3], 16) };
  return { r: 255, g: 255, b: 255 };
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    vessel: null,
    rim: null,
    ingredients: {},
    colorMix: [],
    currentVolumeOz: 0,
    agitation: DrinkMethod.BUILT,
    garnishes: [],
    maxOz: 10,
    iceType: null,
    pourVolumeOz: 0.5,
    liquidColor: 'transparent',
    animClass: '',
  });

  const [activeMode, setActiveModeState] = useState<string>('OBELISCO');
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [validationResult, setValidationResult] = useState<string[] | null>(null);

  const setMode = useCallback(async (modeName: string) => {
    setActiveModeState(modeName);
    try {
      const modeData = await loadMode(modeName);
      const newTicket = generateTicket(modeData as any);
      setCurrentTicket(newTicket);
      setValidationResult(null);
    } catch (e) {
      console.warn('[useSimulation] loadMode failed', e);
      setCurrentTicket(null);
    }
  }, []);

  useEffect(() => {
    setMode('OBELISCO');
  }, [setMode]);

  const selectGlass = useCallback((id: string, maxOz: number = 12) => {
    if (state.currentVolumeOz > 0) return;
    setState(prev => ({ ...prev, vessel: id, maxOz }));
  }, [state.currentVolumeOz]);

  const addIngredient = useCallback((id: string, colorStr: string) => {
    if (!state.vessel) return;

    setState(prev => {
      const pourVolume = prev.pourVolumeOz;
      if (prev.currentVolumeOz + pourVolume > prev.maxOz) {
        console.warn(">> REJECTED: VESSEL AT MAXIMUM CAPACITY");
        return prev;
      }

      const newIngredients = { ...prev.ingredients, [id]: (prev.ingredients[id] || 0) + pourVolume };
      const newVolume = prev.currentVolumeOz + pourVolume;
      
      let newColorMix = [...prev.colorMix];
      let newLiquidColor = prev.liquidColor;

      if (colorStr && colorStr.trim() !== '') {
        const rgb = hexToRgb(colorStr);
        newColorMix.push({ r: rgb.r, g: rgb.g, b: rgb.b, volumeOz: pourVolume });

        let totalR = 0, totalG = 0, totalB = 0;
        newColorMix.forEach(c => {
          totalR += c.r * c.volumeOz;
          totalG += c.g * c.volumeOz;
          totalB += c.b * c.volumeOz;
        });

        const r = Math.round(totalR / newVolume);
        const g = Math.round(totalG / newVolume);
        const b = Math.round(totalB / newVolume);
        newLiquidColor = `rgb(${r}, ${g}, ${b})`;
      }

      return {
        ...prev,
        ingredients: newIngredients,
        currentVolumeOz: newVolume,
        colorMix: newColorMix,
        liquidColor: newLiquidColor,
      };
    });
  }, [state.vessel]);

  const addGarnish = useCallback((id: string, type: string, svgHref: string, rindColor?: string, pulpColor?: string) => {
    if (!state.vessel) return;

    setState(prev => {
      if (type === 'coating' && prev.currentVolumeOz > 0) return prev;
      
      if (type === 'coating') {
        return { ...prev, rim: id }; 
      }

      const metrics = HardwareMetrics[prev.vessel!];
      if (!metrics) return prev;

      let newGarnish: GarnishState = { id, type, svgHref, rindColor, pulpColor };
      
      const dynamicScale = metrics.garnishScale;
      const nativeScalar = 1.0; 
      const finalScale = dynamicScale * nativeScalar;
      
      newGarnish.scale = finalScale;

      if (type === 'floating') {
        const safePadding = 32 * finalScale;
        const validLeft = metrics.rimLeftX + safePadding;
        const validRight = metrics.rimRightX - safePadding;
        newGarnish.x = validLeft + (Math.random() * (validRight - validLeft));
      } else if (type === 'rim-lock') {
        newGarnish.x = metrics.rimRightX;
        newGarnish.y = metrics.rimY;
      } else if (type === 'sinker') {
        const safePadding = 32 * finalScale;
        const validLeft = metrics.rimLeftX + safePadding;
        const validRight = metrics.rimRightX - safePadding;
        newGarnish.x = validLeft + (Math.random() * (validRight - validLeft));
        newGarnish.y = metrics.floorY;
      } else if (type === 'sprig') {
        const adjacent = metrics.floorY - metrics.rimY;
        const opposite = metrics.rimRightX - 32;
        const stemLength = Math.sqrt((adjacent * adjacent) + (opposite * opposite));
        newGarnish.rotation = Math.atan(opposite / adjacent) * (180 / Math.PI);
        newGarnish.height = stemLength * 1.3;
        newGarnish.x = 32;
        newGarnish.y = metrics.floorY;
      }

      return {
        ...prev,
        garnishes: [...prev.garnishes, newGarnish]
      };
    });
  }, [state.vessel]);

  const applyTool = useCallback((id: string) => {
    if (!state.vessel) return;

    const method = methodFromHardwareToolId(id);
    const appliesMethod = method != null;

    setState(prev => {
      if (id.includes('JAPANESE_JIGGER')) {
        const increments = [...POUR_VOLUME_OZ];
        let idx = increments.findIndex((v) => Math.abs(v - prev.pourVolumeOz) < 1e-6);
        if (idx < 0) idx = 0;
        idx = (idx + 1) % increments.length;
        return { ...prev, pourVolumeOz: increments[idx] };
      }

      // Method tools before ice substring match — DRY_ICE_DOUBLE_STRAIN includes "ICE"
      // and must set agitation (Dry/Ice/Double Strain), not iceType.
      if (method) {
        return {
          ...prev,
          agitation: method,
          animClass: animClassForMethod(method),
        };
      }

      // Ice cubes only — never use id.includes('ICE') (collides with DRY_ICE_DOUBLE_STRAIN)
      if (id === 'STANDARD_ICE' || id === 'LARGE_ICE_ROCK') {
        return { ...prev, iceType: id };
      }

      return prev;
    });

    if (appliesMethod) {
      setTimeout(() => {
        setState(prev => ({ ...prev, animClass: '' }));
      }, 500);
    }
  }, [state.vessel]);

  const setAgitation = useCallback((method: string) => {
    if (!state.vessel) return;
    setState(prev => ({
      ...prev,
      agitation: method,
      animClass: animClassForMethod(method),
    }));
    setTimeout(() => {
      setState(prev => ({ ...prev, animClass: '' }));
    }, 500);
  }, [state.vessel]);

  const trashDrink = useCallback(() => {
    setState((prev) => emptySimulationState(prev.pourVolumeOz));
  }, []);

  /** Replace live mat with a parked (or empty) build snapshot. */
  const loadBuild = useCallback((next: SimulationState) => {
    setState(cloneSimulationState(next));
  }, []);

  /** Success validate: start upward drink slide (page clears mat after duration). */
  const startHandoffAnim = useCallback(() => {
    setState((prev) => ({ ...prev, animClass: 'anim-handoff' }));
  }, []);

  const setPourVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, pourVolumeOz: volume }));
  }, []);

  const evaluateDrink = useCallback(() => {
    if (!currentTicket) return;
    
    const errors = validateDrinkFn(state, currentTicket);
    setValidationResult(errors);

    if (errors.length === 0) {
      setState(prev => ({ ...prev, animClass: 'anim-handoff' }));
      setTimeout(() => {
        trashDrink();
        setMode(activeMode);
      }, 1500);
    } else {
      // In the old code, failures also handed off the drink and generated a new ticket.
      setState(prev => ({ ...prev, animClass: 'anim-handoff' }));
      setTimeout(() => {
        trashDrink();
        setMode(activeMode);
      }, 1500);
    }
  }, [state, currentTicket, activeMode, setMode, trashDrink]);

  return {
    state,
    activeMode,
    currentTicket,
    validationResult,
    setMode,
    selectGlass,
    addIngredient,
    addGarnish,
    applyTool,
    trashDrink,
    loadBuild,
    startHandoffAnim,
    evaluateDrink,
    setPourVolume,
    setAgitation
  };
}
