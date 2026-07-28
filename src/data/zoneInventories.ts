/**
 * Fixed Manifest ids shown when a POV zone opens.
 * When a zone has an entry here, the overlay carousel uses this ordered list
 * instead of the full category inventory.
 *
 * Orders are product-name alphabetical where specified.
 * Bottle zones: freestyle liquors + syrups (cross-domain ids allowed).
 * Hardware zones (e.g. ice): resolved from hardware catalog by id.
 */
export const ZONE_INVENTORY_IDS: Partial<Record<string, readonly string[]>> = {
  juices: ['juicefreshlime', 'juicefreshlemon', 'juicegrapefruit'],
  /** Ice well: normal cubes then large cube only (not full hardware). */
  ice: ['STANDARD_ICE', 'LARGE_ICE_ROCK'],
  /**
   * Double-strainer zone: tin, spoon, shake+double strain, dry/ice/double fan-out.
   * Jigger / ice live elsewhere.
   */
  double_strainer: [
    'BOSTON_SHAKER_TIN',
    'BAR_SPOON_STIRRER',
    'FINE_MESH_STRAINER',
    'DRY_ICE_DOUBLE_STRAIN',
  ],
  /**
   * Hawthorne zone: Built (crystal cut) + tin.
   * Ice / jigger / spoon live on other zones.
   */
  hawthorne: ['CRYSTAL_CUT', 'BOSTON_SHAKER_TIN'],
  /**
   * Boston shaker zone: no jigger, ice, or stirrer
   * (those live on jigger control / ice well / other tool zones).
   */
  boston_shaker: ['BOSTON_SHAKER_TIN'],
  syrups: [
    'mixerliquidespresso', // coffee
    'syrupdulcedeleche', // dulce de leche
    'mixereggwhite', // egg whites
    'juiceguava', // guava
    'mixerhorchata', // horchata
    'aperitiflilletblanc', // lillet (liquor)
    'juicemango', // mango
    'juiceorange', // orange juice
    'juicepassionfruit', // passionfruit
    'juicepineapple', // pineapple
    'mixersquirtsoda', // squirt soda
    'syrupvanilla', // vanilla
  ],
  speedrail: [
    'syrupagavenectar', // Agave
    'syrupdemerara', // Demerara
    'batchedelgitano', // El Gitano
    'batchedexpatriota', // Ex Patriota
    'gindry', // Gin
    'batchedlabohemia', // La Bohemia
    'liqueurmaraschino', // Luxardo
    'mezcaljovenespadn', // Mezcal
    'amaromontenegro', // Montenegro
    'brandypisco', // Pisco
    'syrupsimple', // Simple syrup
    'mezcalspicy', // Spicy Mezcal
    'tequilaspicy', // Spicy Tequila
    'tequilablancosilver', // Tequila Blanco
    'tequilareposado', // Tequila Reposado
    'vodkaclearspirit', // Vodka
    'whiskeyirish', // Whiskey Irish
  ],
};
