import React from 'react';
import { AbstractRestaurantPayload } from './AbstractRestaurantPayload';

export interface Ingredient {
  id: string;
  label: string;
  subLabel?: string;
  hexText?: string;
}

export interface Liquor extends Ingredient {
  archetype: string;
  liquidColor: string;
  fillLevel: string;
  liquidClass?: 'liquid' | 'liquid-opaque' | 'liquid-sparkle';
}

export interface Syrup extends Liquor {}

export interface Garnish extends Ingredient {
  type: string;
  svgHref: string;
  rindColor?: string;
  pulpColor?: string;
}

export interface Glass extends Ingredient {
  outlineId: string;
  clipId: string;
  liquidColor?: string;
  fillLevel?: string;
  maxOz: number;
}

export interface Rim extends Ingredient {
  svgHref: string;
}

/** Optional stacked fan-out: back SVG + front raster (e.g. tin + fine mesh). */
export type HardwareFanOut = {
  backSvgHref: string;
  frontImageSrc: string;
};

export interface Hardware extends Ingredient {
  svgHref: string;
  /** Public URL path for raster art; HardwareAsset prefers this over SVG use. */
  imageSrc?: string;
  /** When set, render fan-out composite instead of single svg/image. */
  fanOut?: HardwareFanOut;
}

export abstract class FreestyleManifest {
  abstract readonly modeName: string;
  abstract getLiquors(): Liquor[];
  abstract getSyrups(): Syrup[];
  abstract getGarnishes(): Garnish[];
  abstract getGlasses(): Glass[];
  abstract getRims(): Rim[];
  abstract getHardware(): Hardware[];
}

export class DefaultFreestyleManifest extends FreestyleManifest {
  readonly modeName = 'FREESTYLE';

  getLiquors(): Liquor[] {
    return [
    {
        "id": "vodkaclearspirit",
        "label": "[VODKA] CLEAR SPIRIT",
        "subLabel": "NEUTRAL",
        "hexText": "HEX: #E0E0E0",
        "archetype": "static-vodkaclearspirit",
        "liquidColor": "#E0E0E0",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "rumblancosilver",
        "label": "[RUM] BLANCO / SILVER",
        "subLabel": "UNAGED CANE",
        "hexText": "HEX: #E0E0E0",
        "archetype": "static-rumblancosilver",
        "liquidColor": "#E0E0E0",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "brandypisco",
        "label": "[BRANDY] PISCO",
        "subLabel": "GRAPE BRANDY",
        "hexText": "HEX: #E0E0E0",
        "archetype": "static-brandypisco",
        "liquidColor": "#E0E0E0",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "whiskeyirish",
        "label": "[WHISKEY] IRISH",
        "subLabel": "POT STILL",
        "hexText": "HEX: #2E5A3C",
        "archetype": "static-whiskeyirish",
        "liquidColor": "#2E5A3C",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "gindry",
        "label": "[GIN] DRY",
        "subLabel": "BOTANICAL",
        "hexText": "HEX: #E8EEF2",
        "archetype": "static-gindry",
        "liquidColor": "#E8EEF2",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "bourbon",
        "label": "[BOURBON] STRAIGHT",
        "subLabel": "CORN WHISKEY",
        "hexText": "HEX: #8B4513",
        "archetype": "static-bourbon",
        "liquidColor": "#8B4513",
        "fillLevel": "65%",
        "liquidClass": "liquid"
    },
    {
        "id": "tequilablancosilver",
        "label": "[TEQUILA] BLANCO/SILVER",
        "subLabel": "CRISP UNAGED (MEXICO)",
        "hexText": "HEX: #E0E0E0",
        "archetype": "static-tequilablancosilver",
        "liquidColor": "#E0E0E0",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "tequilareposado",
        "label": "[TEQUILA] REPOSADO",
        "subLabel": "LIGHT OAK (MEXICO)",
        "hexText": "HEX: #FBC02D",
        "archetype": "static-tequilareposado",
        "liquidColor": "#FBC02D",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "tequilaaejo",
        "label": "[TEQUILA] A\u00d1EJO",
        "subLabel": "AGED 1+ YRS (MEXICO)",
        "hexText": "HEX: #FF8F00",
        "archetype": "dec",
        "liquidColor": "#FF8F00",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "tequilaextraaejo",
        "label": "[TEQUILA] EXTRA A\u00d1EJO",
        "subLabel": "PREMIUM RESERVE",
        "hexText": "HEX: #E65100",
        "archetype": "prem",
        "liquidColor": "#E65100",
        "fillLevel": "45%",
        "liquidClass": "liquid"
    },
    {
        "id": "mezcaljovenespadn",
        "label": "[MEZCAL] JOVEN ESPAD\u00cdN",
        "subLabel": "ARTISANAL SMOKE",
        "hexText": "VESSEL: CLAY_COPITA",
        "archetype": "jug",
        "liquidColor": "rgba(255,255,255,0.7)",
        "fillLevel": "50%",
        "liquidClass": "liquid"
    },
    {
        "id": "tequilaspicy",
        "label": "Spicy Tequila",
        "subLabel": "CHILE INFUSED",
        "hexText": "HEX: #C47B3A",
        "archetype": "well",
        "liquidColor": "#C47B3A",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "mezcalspicy",
        "label": "Spicy Mezcal",
        "subLabel": "CHILE + SMOKE",
        "hexText": "HEX: #A66B35",
        "archetype": "well",
        "liquidColor": "#A66B35",
        "fillLevel": "65%",
        "liquidClass": "liquid"
    },
    {
        "id": "mezcalreposado",
        "label": "[MEZCAL] REPOSADO",
        "subLabel": "OAK RESTED",
        "hexText": "VESSEL: CLAY_COPITA",
        "archetype": "jug",
        "liquidColor": "#CD7F32",
        "fillLevel": "65%",
        "liquidClass": "liquid"
    },
    {
        "id": "agavebacanorasotol",
        "label": "[AGAVE] BACANORA/SOTOL",
        "subLabel": "WILD AGAVE",
        "hexText": "HEX: #FFF59D",
        "archetype": "well",
        "liquidColor": "#FFF59D",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurorangesec",
        "label": "[LIQUEUR] ORANGE/SEC",
        "subLabel": "CURA\u00c7AO / TRIPLE SEC",
        "hexText": "HEX: #FFFFFF",
        "archetype": "well",
        "liquidColor": "#FFFFFF",
        "fillLevel": "95%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurchiliancho",
        "label": "[LIQUEUR] CHILI / ANCHO",
        "subLabel": "SPICY KICK",
        "hexText": "HEX: #BF360C",
        "archetype": "well",
        "liquidColor": "#BF360C",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurcoffeecacao",
        "label": "[LIQUEUR] COFFEE/CACAO",
        "subLabel": "DARK ROAST",
        "hexText": "HEX: #3E2723",
        "archetype": "well",
        "liquidColor": "#3E2723",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "amaroredbitter",
        "label": "[AMARO] RED BITTER",
        "subLabel": "CAMPARI STYLE",
        "hexText": "HEX: #D32F2F",
        "archetype": "well",
        "liquidColor": "#D32F2F",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "amaroaperitiforange",
        "label": "[AMARO] APERITIF ORANGE",
        "subLabel": "APEROL STYLE",
        "hexText": "HEX: #FF5722",
        "archetype": "well",
        "liquidColor": "#FF5722",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurgreenherbal",
        "label": "[LIQUEUR] GREEN HERBAL",
        "subLabel": "CHARTREUSE STYLE",
        "hexText": "HEX: #8BC34A",
        "archetype": "well",
        "liquidColor": "#8BC34A",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurmaraschino",
        "label": "[LIQUEUR] MARASCHINO",
        "subLabel": "STRAW BASKET STYLE",
        "hexText": "HEX: #FFFFFF",
        "archetype": "static-liqueurmaraschino",
        "liquidColor": "#FFF",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "winesweetvermouth",
        "label": "[WINE] SWEET VERMOUTH",
        "subLabel": "DARK GLASS",
        "hexText": "HEX: #5D4037",
        "archetype": "well",
        "liquidColor": "#5D4037",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurkahla",
        "label": "[LIQUEUR] KAHL\u00daA",
        "subLabel": "COFFEE (DARK ROAST)",
        "hexText": "HEX: #3C2F2F",
        "archetype": "static-liqueurkahla",
        "liquidColor": "#3C2F2F",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurtiamaria",
        "label": "[LIQUEUR] TIA MARIA",
        "subLabel": "COFFEE (LIGHTER)",
        "hexText": "HEX: #4A2C1F",
        "archetype": "well",
        "liquidColor": "#4A2C1F",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurpatrnxocafe",
        "label": "[LIQUEUR] PATR\u00d3N XO CAFE",
        "subLabel": "TEQUILA + COFFEE",
        "hexText": "HEX: #5D4037",
        "archetype": "well",
        "liquidColor": "#5D4037",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurdarkcrmedecacao",
        "label": "[LIQUEUR] DARK CR\u00c8ME DE CACAO",
        "subLabel": "CHOCOLATE LIQUEUR",
        "hexText": "HEX: #2C1F1F",
        "archetype": "well",
        "liquidColor": "#2C1F1F",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurwhitecrmedecacao",
        "label": "[LIQUEUR] WHITE CR\u00c8ME DE CACAO",
        "subLabel": "CLEAR CHOCOLATE",
        "hexText": "HEX: #F5EDE3",
        "archetype": "well",
        "liquidColor": "#F5EDE3",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurchambord",
        "label": "[LIQUEUR] CHAMBORD",
        "subLabel": "BLACK RASPBERRY",
        "hexText": "HEX: #9B1D4E",
        "archetype": "well",
        "liquidColor": "#9B1D4E",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurcrmedecassis",
        "label": "[LIQUEUR] CR\u00c8ME DE CASSIS",
        "subLabel": "BLACKCURRANT",
        "hexText": "HEX: #4A0E2E",
        "archetype": "well",
        "liquidColor": "#4A0E2E",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurcrmedeframboise",
        "label": "[LIQUEUR] CR\u00c8ME DE FRAMBOISE",
        "subLabel": "RASPBERRY",
        "hexText": "HEX: #E91E63",
        "archetype": "well",
        "liquidColor": "#E91E63",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurmidori",
        "label": "[LIQUEUR] MIDORI",
        "subLabel": "MELON",
        "hexText": "HEX: #00E676",
        "archetype": "well",
        "liquidColor": "#00E676",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueuramaretto",
        "label": "[LIQUEUR] AMARETTO",
        "subLabel": "ALMOND",
        "hexText": "HEX: #E8B923",
        "archetype": "jug",
        "liquidColor": "#E8B923",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurfrangelico",
        "label": "[LIQUEUR] FRANGELICO",
        "subLabel": "HAZELNUT",
        "hexText": "HEX: #D2A679",
        "archetype": "well",
        "liquidColor": "#D2A679",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurtamarind",
        "label": "[LIQUEUR] TAMARIND",
        "subLabel": "SWEET &amp; TART",
        "hexText": "HEX: #4E342E",
        "archetype": "well",
        "liquidColor": "#4E342E",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurguava",
        "label": "[LIQUEUR] GUAVA",
        "subLabel": "TROPICAL",
        "hexText": "HEX: #FF9E9E",
        "archetype": "well",
        "liquidColor": "#FF9E9E",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurpistachio",
        "label": "[LIQUEUR] PISTACHIO",
        "subLabel": "ORGEAT STYLE",
        "hexText": "HEX: #A8D37F",
        "archetype": "well",
        "liquidColor": "#A8D37F",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurpassionfruit",
        "label": "[LIQUEUR] PASSION FRUIT",
        "subLabel": "HEX: #FFCC00",
        "hexText": "",
        "archetype": "well",
        "liquidColor": "#FFCC00",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurdrambuie",
        "label": "[LIQUEUR] DRAMBUIE",
        "subLabel": "HONEY &amp; SCOTCH",
        "hexText": "HEX: #D4A017",
        "archetype": "well",
        "liquidColor": "#D4A017",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "liqueurstgermain",
        "label": "[LIQUEUR] ST-GERMAIN",
        "subLabel": "ELDERFLOWER",
        "hexText": "HEX: #E0F2C7",
        "archetype": "well",
        "liquidColor": "#E0F2C7",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "aperitiflilletblanc",
        "label": "[APERITIF] LILLET BLANC",
        "subLabel": "FRENCH WINE",
        "hexText": "HEX: #FFF59D",
        "archetype": "well",
        "liquidColor": "#FFF59D",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "amaromontenegro",
        "label": "[AMARO] MONTENEGRO",
        "subLabel": "ITALIAN BITTER",
        "hexText": "HEX: #D84315",
        "archetype": "static-amaromontenegro",
        "liquidColor": "#D84315",
        "fillLevel": "65%",
        "liquidClass": "liquid"
    },
    {
        "id": "amaroaverna",
        "label": "[AMARO] AVERNA",
        "subLabel": "SICILIAN HERBAL",
        "hexText": "HEX: #8B4513",
        "archetype": "well",
        "liquidColor": "#8B4513",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "amarononino",
        "label": "[AMARO] NONINO",
        "subLabel": "GRAPEFRUIT AMARO",
        "hexText": "HEX: #F4A261",
        "archetype": "well",
        "liquidColor": "#F4A261",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "winedryvermouth",
        "label": "[WINE] DRY VERMOUTH",
        "subLabel": "WHITE VERMOUTH",
        "hexText": "HEX: #F5E8C7",
        "archetype": "well",
        "liquidColor": "#F5E8C7",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "winerosvermouth",
        "label": "[WINE] ROS\u00c9 VERMOUTH",
        "subLabel": "PINK VERMOUTH",
        "hexText": "HEX: #F8A3C2",
        "archetype": "well",
        "liquidColor": "#F8A3C2",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "batchedelgitano",
        "label": "El Gitano",
        "subLabel": "HOUSE BATCH",
        "hexText": "HEX: #D4A017",
        "archetype": "well",
        "liquidColor": "#D4A017",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "batchedlabohemia",
        "label": "La Bohemia",
        "subLabel": "HOUSE BATCH",
        "hexText": "HEX: #C9A227",
        "archetype": "well",
        "liquidColor": "#C9A227",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "batchedexpatriota",
        "label": "Ex Patriota",
        "subLabel": "HOUSE BATCH",
        "hexText": "HEX: #B8860B",
        "archetype": "well",
        "liquidColor": "#B8860B",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    }
];
  }

  getSyrups(): Syrup[] {
    return [
    {
        "id": "bittersangostura",
        "label": "[BITTERS] ANGOSTURA",
        "subLabel": "DEEP SPICE",
        "hexText": "HEX: #3E1010",
        "archetype": "bitter",
        "liquidColor": "#3E1010",
        "fillLevel": "50%",
        "liquidClass": "liquid"
    },
    {
        "id": "bittersorange",
        "label": "[BITTERS] ORANGE",
        "subLabel": "CITRUS SPICE",
        "hexText": "HEX: #FF8F00",
        "archetype": "bitter",
        "liquidColor": "#FF8F00",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicefreshlime",
        "label": "[JUICE] FRESH LIME",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #CDDC39",
        "archetype": "juice-vessel",
        "liquidColor": "#CDDC39",
        "fillLevel": "95%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicefreshlemon",
        "label": "[JUICE] FRESH LEMON",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #F7E98E",
        "archetype": "juice-vessel",
        "liquidColor": "#F7E98E",
        "fillLevel": "95%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicegrapefruit",
        "label": "[JUICE] GRAPEFRUIT",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #F48FB1",
        "archetype": "juice-vessel",
        "liquidColor": "#F48FB1",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicemango",
        "label": "[JUICE] MANGO",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FFB74D",
        "archetype": "juice-vessel",
        "liquidColor": "#FFB74D",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "juiceorange",
        "label": "[JUICE] ORANGE",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FF9800",
        "archetype": "juice-vessel",
        "liquidColor": "#FF9800",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupagavenectar",
        "label": "[SYRUP] AGAVE NECTAR",
        "subLabel": "THICK VISCOSITY",
        "hexText": "HEX: #FFB300",
        "archetype": "squeeze",
        "liquidColor": "#FFB300",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupsimple",
        "label": "[SYRUP] SIMPLE",
        "subLabel": "CLEAR / WHITE",
        "hexText": "HEX: #FFFFFF",
        "archetype": "squeeze",
        "liquidColor": "#FFFFFF",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "syruporgeat",
        "label": "[SYRUP] ORGEAT",
        "subLabel": "MILKY ALMOND",
        "hexText": "HEX: #FFE0B2",
        "archetype": "squeeze",
        "liquidColor": "#FFE0B2",
        "fillLevel": "40%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupfalernum",
        "label": "[SYRUP] FALERNUM",
        "subLabel": "LIME CLOVE",
        "hexText": "HEX: #C6FF00",
        "archetype": "squeeze",
        "liquidColor": "#C6FF00",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixerclubsoda",
        "label": "[MIXER] CLUB SODA",
        "subLabel": "SPARKLING WATER",
        "hexText": "HEX: #E0FFFF",
        "archetype": "syrup",
        "liquidColor": "#E0FFFF",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixergingerbeer",
        "label": "[MIXER] GINGER BEER",
        "subLabel": "SPICY SPARKLE",
        "hexText": "HEX: #D48800",
        "archetype": "syrup",
        "liquidColor": "#D48800",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixersquirtsoda",
        "label": "[MIXER] SQUIRT SODA",
        "subLabel": "GRAPEFRUIT SPARKLE",
        "hexText": "HEX: #F5F5F5",
        "archetype": "syrup",
        "liquidColor": "#F5F5F5",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "syruphoneysyrup",
        "label": "[SYRUP] HONEY SYRUP",
        "subLabel": "HEX: #FFB300",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#FFB300",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupgrenadine",
        "label": "[SYRUP] GRENADINE",
        "subLabel": "HEX: #E91E63",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#E91E63",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "syruppassionfruit",
        "label": "[SYRUP] PASSION FRUIT",
        "subLabel": "HEX: #FFCC00",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#FFCC00",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupcinnamon",
        "label": "[SYRUP] CINNAMON",
        "subLabel": "HEX: #C66F2E",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#C66F2E",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupvanilla",
        "label": "[SYRUP] VANILLA",
        "subLabel": "HEX: #F5E1C2",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#F5E1C2",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupdemerara",
        "label": "[SYRUP] DEMERARA",
        "subLabel": "HEX: #D4A017",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#D4A017",
        "fillLevel": "50%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupdulcedeleche",
        "label": "[SYRUP] DULCE DE LECHE",
        "subLabel": "OPAQUE CARAMEL",
        "hexText": "HEX: #A1887F",
        "archetype": "squeeze",
        "liquidColor": "#A1887F",
        "fillLevel": "50%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupcoconut",
        "label": "[SYRUP] COCONUT",
        "subLabel": "OPAQUE MILKY",
        "hexText": "HEX: #F5EDE3",
        "archetype": "squeeze",
        "liquidColor": "#F5EDE3",
        "fillLevel": "40%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupcoldbrewconc",
        "label": "[SYRUP] COLD BREW CONC.",
        "subLabel": "HEX: #3E2723",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#3E2723",
        "fillLevel": "90%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixerliquidespresso",
        "label": "[MIXER] LIQUID ESPRESSO",
        "subLabel": "HEX: #3E2723",
        "hexText": "",
        "archetype": "syrup",
        "liquidColor": "#3E2723",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupchocolate",
        "label": "[SYRUP] CHOCOLATE",
        "subLabel": "HEX: #2C1F1F",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#2C1F1F",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "syrupmocha",
        "label": "[SYRUP] MOCHA",
        "subLabel": "HEX: #4A2C1F",
        "hexText": "",
        "archetype": "squeeze",
        "liquidColor": "#4A2C1F",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicepineapple",
        "label": "[JUICE] PINEAPPLE",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FBC02D",
        "archetype": "juice-vessel",
        "liquidColor": "#FBC02D",
        "fillLevel": "95%",
        "liquidClass": "liquid"
    },
    {
        "id": "juicepassionfruit",
        "label": "[JUICE] PASSION FRUIT",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FFCC00",
        "archetype": "juice-vessel",
        "liquidColor": "#FFCC00",
        "fillLevel": "85%",
        "liquidClass": "liquid"
    },
    {
        "id": "juiceguava",
        "label": "[JUICE] GUAVA",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FF9E9E",
        "archetype": "juice-vessel",
        "liquidColor": "#FF9E9E",
        "fillLevel": "75%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixercoconutwater",
        "label": "[MIXER] COCONUT WATER",
        "subLabel": "SPARKLING WATER",
        "hexText": "HEX: #E0F2C7",
        "archetype": "syrup",
        "liquidColor": "#E0F2C7",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixerfruitpuree",
        "label": "[MIXER] FRUIT PUREE",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FFB300",
        "archetype": "sq",
        "liquidColor": "#FFB300",
        "fillLevel": "70%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixerhorchata",
        "label": "[MIXER] HORCHATA",
        "subLabel": "MILKY RICE",
        "hexText": "HEX: #F5EDE3",
        "archetype": "syrup",
        "liquidColor": "#F5EDE3",
        "fillLevel": "80%",
        "liquidClass": "liquid"
    },
    {
        "id": "mixereggwhite",
        "label": "[MIXER] EGGWHITE",
        "subLabel": "OPAQUE PLASTIC",
        "hexText": "HEX: #FFFFFF",
        "archetype": "sq",
        "liquidColor": "#FFFFFF",
        "fillLevel": "60%",
        "liquidClass": "liquid"
    }
];
  }

  getGarnishes(): Garnish[] {
    return [
    {
        "id": "freshlimewheel",
        "label": "[FRESH] LIME_WHEEL",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#1B5E20",
        "pulpColor": "#76FF03"
    },
    {
        "id": "freshgrapefruitwheel",
        "label": "[FRESH] GRAPEFRUIT_WHEEL",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#FFB300",
        "pulpColor": "#E91E63"
    },
    {
        "id": "freshorangewheel",
        "label": "[FRESH] ORANGE_WHEEL",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#E65100",
        "pulpColor": "#FF9800"
    },
    {
        "id": "freshlemonwheel",
        "label": "[FRESH] LEMON_WHEEL",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#FBC02D",
        "pulpColor": "#FFF59D"
    },
    {
        "id": "herbrosemarysprig",
        "label": "[HERB] ROSEMARY_SPRIG",
        "subLabel": "WOODY STEM + FROSTED",
        "type": "sprig",
        "svgHref": "herbrosemarysprig",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbfreshmintsprig",
        "label": "[HERB] FRESH_MINT_SPRIG",
        "subLabel": "FLOATING CLUSTER",
        "type": "floating",
        "svgHref": "herbfreshmintsprig",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producecucumberwheel",
        "label": "[PRODUCE] CUCUMBER_WHEEL",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "producecucumberwheel",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producejalapenoslice",
        "label": "[PRODUCE] JALAPENO_SLICE",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "producejalapenoslice",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "driedlimewheel",
        "label": "[DRIED] LIME_WHEEL",
        "subLabel": "MUDDY OLIVE (#333300)",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#333300",
        "pulpColor": "#5D5D1A"
    },
    {
        "id": "driedlemonwheel",
        "label": "[DRIED] LEMON_WHEEL",
        "subLabel": "MUSTARD BROWN (#6D4C00)",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#6D4C00",
        "pulpColor": "#9C7200"
    },
    {
        "id": "driedorangewheel",
        "label": "[DRIED] ORANGE_WHEEL",
        "subLabel": "BURNT SIENNA (#5D2A00)",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#5D2A00",
        "pulpColor": "#8C4000"
    },
    {
        "id": "driedgrapefrtwheel",
        "label": "[DRIED] GRAPEFRT_WHEEL",
        "subLabel": "BRICK RED (#4A1C1C)",
        "type": "rim-lock",
        "svgHref": "citrus-wheel",
        "rindColor": "#4A1C1C",
        "pulpColor": "#7A2C2C"
    },
    {
        "id": "driedpineappleslice",
        "label": "[DRIED] PINEAPPLE_SLICE",
        "subLabel": "JAGGED RING",
        "type": "rim-lock",
        "svgHref": "pineapple-slice",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentedibleflower",
        "label": "[ACCENT] EDIBLE_FLOWER",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "accentedibleflower",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentchilithreads",
        "label": "[ACCENT] CHILI_THREADS",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "accentchilithreads",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentespressobeans",
        "label": "[ACCENT] ESPRESSO BEANS",
        "subLabel": "(3-bean cluster)",
        "type": "floating",
        "svgHref": "accentespressobeans",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentcoffeebeans",
        "label": "[ACCENT] COFFEE BEANS",
        "subLabel": "(whole roasted)",
        "type": "floating",
        "svgHref": "accentcoffeebeans",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentchocolatestrips",
        "label": "[ACCENT] CHOCOLATE STRIPS",
        "subLabel": "dark curls",
        "type": "floating",
        "svgHref": "accentchocolatestrips",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentwhitechocolate",
        "label": "[ACCENT] WHITE CHOCOLATE",
        "subLabel": "curls",
        "type": "floating",
        "svgHref": "accentwhitechocolate",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentcocoanibs",
        "label": "[ACCENT] COCOA NIBS",
        "subLabel": "",
        "type": "floating",
        "svgHref": "accentcocoanibs",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbcinnamonstick",
        "label": "[HERB] CINNAMON STICK",
        "subLabel": "",
        "type": "sprig",
        "svgHref": "herbcinnamonstick",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbcinnamonflakes",
        "label": "[HERB] CINNAMON FLAKES",
        "subLabel": "",
        "type": "floating",
        "svgHref": "herbcinnamonflakes",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbstaranise",
        "label": "[HERB] STAR ANISE",
        "subLabel": "",
        "type": "floating",
        "svgHref": "herbstaranise",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbfreshgingerslice",
        "label": "[HERB] FRESH GINGER SLICE",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "herbfreshgingerslice",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herblemonzest",
        "label": "[HERB] LEMON ZEST",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "herblemonzest",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herborangezest",
        "label": "[HERB] ORANGE ZEST",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "herborangezest",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "herbthymesprig",
        "label": "[HERB] THYME SPRIG",
        "subLabel": "",
        "type": "sprig",
        "svgHref": "herbthymesprig",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producemaraschinocherry",
        "label": "[PRODUCE] MARASCHINO CHERRY",
        "subLabel": "",
        "type": "floating",
        "svgHref": "producemaraschinocherry",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "produceluxardocherry",
        "label": "[PRODUCE] LUXARDO CHERRY",
        "subLabel": "",
        "type": "floating",
        "svgHref": "produceluxardocherry",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producegreenolive",
        "label": "[PRODUCE] GREEN OLIVE",
        "subLabel": "",
        "type": "floating",
        "svgHref": "producegreenolive",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producecocktailonion",
        "label": "[PRODUCE] COCKTAIL ONION",
        "subLabel": "",
        "type": "floating",
        "svgHref": "producecocktailonion",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "producecucumberribbon",
        "label": "[PRODUCE] CUCUMBER RIBBON",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "producecucumberribbon",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "driedpineapplewedge",
        "label": "[DRIED] PINEAPPLE WEDGE",
        "subLabel": "",
        "type": "rim-lock",
        "svgHref": "driedpineapplewedge",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentchilithreadssmoked",
        "label": "[ACCENT] CHILI THREADS (SMOKED)",
        "subLabel": "",
        "type": "floating",
        "svgHref": "accentchilithreadssmoked",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentediblegoldleaf",
        "label": "[ACCENT] EDIBLE GOLD LEAF",
        "subLabel": "",
        "type": "floating",
        "svgHref": "accentediblegoldleaf",
        "rindColor": "",
        "pulpColor": ""
    },
    {
        "id": "accentlavenderbuds",
        "label": "[ACCENT] LAVENDER BUDS",
        "subLabel": "",
        "type": "sprig",
        "svgHref": "accentlavenderbuds",
        "rindColor": "",
        "pulpColor": ""
    }
];
  }

  getGlasses(): Glass[] {
    return [
    {
        "id": "ROCKS",
        "label": "ROCKS GLASS",
        "subLabel": "IDEAL: NEAT, OLD FASHIONED",
        "outlineId": "rocks-outline",
        "clipId": "rocks-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 10.0
    },
    {
        "id": "HIGHBALL",
        "label": "HIGHBALL GLASS",
        "subLabel": "IDEAL: PALOMA, RANCH WATER",
        "outlineId": "highball-outline",
        "clipId": "highball-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 12.0
    },
    {
        "id": "COLLINS",
        "label": "COLLINS GLASS",
        "subLabel": "IDEAL: MOJITO, TOM COLLINS",
        "outlineId": "collins-outline",
        "clipId": "collins-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 14.0
    },
    {
        "id": "COUPE",
        "label": "COUPE",
        "subLabel": "IDEAL: MEZCAL SOUR, DAIQUIRI",
        "outlineId": "coupe-outline",
        "clipId": "coupe-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 5.5
    },
    {
        "id": "MARTINI",
        "label": "MARTINI GLASS",
        "subLabel": "IDEAL: CLASSIC UP DRINKS",
        "outlineId": "martini-outline",
        "clipId": "martini-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 7.5
    },
    {
        "id": "NORA",
        "label": "NICK & NORA",
        "subLabel": "IDEAL: NEGRONI, MANHATTAN",
        "outlineId": "nora-outline",
        "clipId": "nora-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 5.0
    },
    {
        "id": "FLUTE",
        "label": "CHAMPAGNE FLUTE",
        "subLabel": "IDEAL: SPARKLING BUILDS",
        "outlineId": "flute-outline",
        "clipId": "flute-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 6.0
    },
    {
        "id": "RIBBED_COUPE",
        "label": "RIBBED COUPE",
        "subLabel": "IDEAL: AVIATION, WATER LILY",
        "outlineId": "ribbed-coupe-outline",
        "clipId": "ribbed-coupe-clip",
        "liquidColor": "transparent",
        "fillLevel": "0%",
        "maxOz": 6.0
    }
];
  }

  getRims(): Rim[] {
    return [
    {
        "id": "KOSHER_SALT_SEA_SALT",
        "label": "KOSHER_SALT / SEA_SALT",
        "svgHref": "KOSHER_SALT_SEA_SALT"
    },
    {
        "id": "TAJIN_CHILE_LIME",
        "label": "TAJIN_CHILE_LIME",
        "svgHref": "TAJIN_CHILE_LIME"
    },
    {
        "id": "BLACK_SALT_LAVA_SALT",
        "label": "BLACK_SALT / LAVA_SALT",
        "svgHref": "BLACK_SALT_LAVA_SALT"
    },
    {
        "id": "SMOKED_SALT_HICKORY",
        "label": "SMOKED_SALT / HICKORY",
        "svgHref": "SMOKED_SALT_HICKORY"
    },
    {
        "id": "CINNAMON_SUGAR",
        "label": "CINNAMON_SUGAR",
        "svgHref": "CINNAMON_SUGAR"
    },
    {
        "id": "CHILI_CINNAMON_SUGAR",
        "label": "CHILI_CINNAMON_SUGAR",
        "svgHref": "CHILI_CINNAMON_SUGAR"
    },
    {
        "id": "COCOA_POWDER",
        "label": "COCOA_POWDER",
        "svgHref": "COCOA_POWDER"
    },
    {
        "id": "VANILLA_SUGAR",
        "label": "VANILLA_SUGAR",
        "svgHref": "VANILLA_SUGAR"
    },
    {
        "id": "DEMERARA_SUGAR",
        "label": "DEMERARA_SUGAR",
        "svgHref": "DEMERARA_SUGAR"
    },
    {
        "id": "TAJIN_SUGAR",
        "label": "TAJIN_SUGAR",
        "svgHref": "TAJIN_SUGAR"
    },
    {
        "id": "SMOKED_PAPRIKA",
        "label": "SMOKED_PAPRIKA",
        "svgHref": "SMOKED_PAPRIKA"
    },
    {
        "id": "BLACK_LAVA_SALT_CHILI",
        "label": "BLACK_LAVA_SALT_CHILI",
        "svgHref": "BLACK_LAVA_SALT_CHILI"
    },
    {
        "id": "GOLD_SUGAR",
        "label": "GOLD_SUGAR",
        "svgHref": "GOLD_SUGAR"
    },
    {
        "id": "MATCHA_SUGAR",
        "label": "MATCHA_SUGAR",
        "svgHref": "MATCHA_SUGAR"
    },
    {
        "id": "HIBISCUS_SUGAR",
        "label": "HIBISCUS_SUGAR",
        "svgHref": "HIBISCUS_SUGAR"
    }
];
  }

  getHardware(): Hardware[] {
    return [
    {
        "id": "BOSTON_SHAKER_TIN",
        "label": "Shaken",
        "svgHref": "BOSTON_SHAKER_TIN"
    },
    {
        "id": "JAPANESE_JIGGER",
        "label": "JAPANESE_JIGGER",
        "svgHref": "JAPANESE_JIGGER"
    },
    {
        "id": "STANDARD_ICE",
        "label": "STANDARD_ICE",
        "svgHref": "STANDARD_ICE"
    },
    {
        "id": "LARGE_ICE_ROCK",
        "label": "LARGE_ICE_ROCK",
        "svgHref": "LARGE_ICE_ROCK"
    },
    {
        "id": "BAR_SPOON_STIRRER",
        "label": "BAR_SPOON_STIRRER",
        "svgHref": "BAR_SPOON_STIRRER"
    },
    {
        "id": "FINE_MESH_STRAINER",
        "label": "Double Strain",
        "svgHref": "FINE_MESH_STRAINER",
        "imageSrc": "/assets/fine_mesh_strainer.png"
    },
    {
        "id": "CRYSTAL_CUT",
        "label": "Built",
        "svgHref": "CRYSTAL_CUT",
        "imageSrc": "/assets/crystal_cut.png"
    },
    {
        "id": "DRY_ICE_DOUBLE_STRAIN",
        "label": "Dry / Ice / Double Strain",
        "svgHref": "BOSTON_SHAKER_TIN",
        "fanOut": {
          "backSvgHref": "BOSTON_SHAKER_TIN",
          "frontImageSrc": "/assets/fine_mesh_strainer.png"
        }
    }
];
  }
}

export class PayloadManifest extends FreestyleManifest {
  readonly modeName: string;
  private baseManifest: FreestyleManifest;
  private activeIngredients: Set<string>;
  private activeVessels: Set<string>;
  private activeRims: Set<string>;
  private activeGarnishes: Set<string>;
  private activeHardware: Set<string>;

  constructor(payload: AbstractRestaurantPayload, baseManifest: FreestyleManifest = new DefaultFreestyleManifest()) {
    super();
    this.modeName = payload.modeName;
    this.baseManifest = baseManifest;
    
    this.activeIngredients = new Set<string>();
    this.activeVessels = new Set<string>();
    this.activeRims = new Set<string>();
    this.activeGarnishes = new Set<string>();
    this.activeHardware = new Set<string>();

    // Explicit hardware fallbacks
    this.activeHardware.add('JAPANESE_JIGGER');
    this.activeHardware.add('STANDARD_ICE');
    this.activeHardware.add('LARGE_ICE_ROCK');
    this.activeHardware.add('BAR_SPOON_STIRRER');
    this.activeHardware.add('BOSTON_SHAKER_TIN');
    this.activeHardware.add('FINE_MESH_STRAINER');
    this.activeHardware.add('CRYSTAL_CUT');
    this.activeHardware.add('DRY_ICE_DOUBLE_STRAIN');

    // Parse recipes to populate active sets
    for (const recipe of payload.recipes) {
      this.activeVessels.add(recipe.vessel);
      // Skip baseline built (title-case legacy or canonical BUILT)
      if (
        recipe.agitation &&
        recipe.agitation !== 'Built' &&
        recipe.agitation !== 'BUILT'
      ) {
        this.activeHardware.add(recipe.agitation);
      }
      
      for (const rim of recipe.validRims || []) {
        if (rim !== 'NONE') this.activeRims.add(rim);
      }
      
      for (const garnish of recipe.garnishes || []) {
        this.activeGarnishes.add(garnish);
      }
      
      for (const variant of recipe.variants || []) {
        for (const ingredientId of Object.keys(variant.ingredients)) {
          this.activeIngredients.add(ingredientId);
        }
      }
    }
  }

  getLiquors(): Liquor[] {
    return this.baseManifest.getLiquors().filter(item => this.activeIngredients.has(item.id));
  }

  getSyrups(): Syrup[] {
    return this.baseManifest.getSyrups().filter(item => this.activeIngredients.has(item.id));
  }

  getGarnishes(): Garnish[] {
    return this.baseManifest.getGarnishes().filter(item => this.activeGarnishes.has(item.id));
  }

  getGlasses(): Glass[] {
    return this.baseManifest.getGlasses().filter(item => this.activeVessels.has(item.id));
  }

  getRims(): Rim[] {
    return this.baseManifest.getRims().filter(item => this.activeRims.has(item.id));
  }

  getHardware(): Hardware[] {
    return this.baseManifest.getHardware().filter(item => this.activeHardware.has(item.id));
  }
}
