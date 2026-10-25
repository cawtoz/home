/** Fuente de medidas de las dos vistas. Distancias en metros, salvo escala SVG. */
export const plan = {
  scale: 120,
  origin: { x: 100, y: 90 },
  wallThickness: 10, // Grosor gráfico heredado del plano; no es una medida de obra.
  totalLength: 6.70,
  vertical: {
    ceilingHeight: 2.30,
    accessDrop: 0.90,
    windowAboveAccess: 0.18,
    interiorDrop: { height: 0.10, lowerSide: 'closet' },
  },
  bedroom: { length: 2.70, leftDepth: 2.00, rightDepth: 2.20, entrance: 1.20 },
  windowWalls: { left: 0.19, between: 0.22, right: 0.43 },
  recess: { length: 1.45, rise: 0.50 },
  right: {
    upper: 0.90, stairLength: 1.70, stairWidth: 0.60,
    steps: 6, clearToStair: 1.90,
    highEnd: 'bottom' as 'bottom' | 'top',
  },
  furniture: {
    bed: { length: 2.00, width: 1.40, topOffset: 0.30 },
    closet: { length: 1.20, depth: 0.60, height: 1.40, shiftRight: 0.05 },
    upperTable: { length: 2.00, depth: 0.48 },
    setup: { length: 1.23, width: 0.80, height: 0.79, gapFromRecess: 0.90 },
  },
};

/** Datos provisionales para visualizar volúmenes y el contexto exterior. */
export const illustrative = {
  bedHeight: 0.45,
  headboardHeight: 0.80,
  tableHeight: 0.75,
  windowHead: 2.05,
  exteriorDepth: 0.85, // Extensión visual de la base de la casa, fuera de esta zona.
};

export type Point = readonly [x: number, z: number];
export type Footprint = { x: number; z: number; width: number; depth: number; floor: number };

const wall = plan.wallThickness / plan.scale;
const bedroomRight = plan.bedroom.length;
const recessRight = bedroomRight + plan.recess.length;
const recessTop = plan.bedroom.rightDepth - plan.recess.rise;
const bottom = plan.right.upper + plan.right.stairLength;
const stairLeft = recessRight + plan.right.clearToStair;
const leftFloor = -plan.vertical.interiorDrop.height;
const half = wall / 2;
const slopeLength = Math.hypot(bedroomRight, plan.bedroom.rightDepth - plan.bedroom.leftDepth);
const windowWidth = (slopeLength - Object.values(plan.windowWalls).reduce((a, b) => a + b, 0)) / 2;

export const geometry = {
  wall, half, bedroomRight, recessRight, recessTop, bottom, stairLeft, leftFloor,
  rightFloor: 0,
  slopeLength,
  windowWidth,
  windowWallPoint(distance: number): Point {
    const ratio = distance / slopeLength;
    return [ratio * bedroomRight, plan.bedroom.leftDepth + ratio * (plan.bedroom.rightDepth - plan.bedroom.leftDepth)];
  },
  leftPolygon: [
    [0, 0], [recessRight, 0], [recessRight, recessTop],
    [bedroomRight, recessTop], [bedroomRight, plan.bedroom.rightDepth], [0, plan.bedroom.leftDepth],
  ] satisfies Point[],
  rightPolygon: [[recessRight, 0], [plan.totalLength, 0], [plan.totalLength, bottom], [recessRight, bottom]] satisfies Point[],
  footprints: {
    bed: { x: half + 1 / plan.scale, z: plan.furniture.bed.topOffset,
      width: plan.furniture.bed.length, depth: plan.furniture.bed.width, floor: leftFloor },
    closet: { x: bedroomRight + (plan.recess.length - plan.furniture.closet.length) / 2 + plan.furniture.closet.shiftRight,
      z: recessTop - half - plan.furniture.closet.depth,
      width: plan.furniture.closet.length, depth: plan.furniture.closet.depth, floor: leftFloor },
    upperTable: { x: plan.totalLength - half - plan.furniture.upperTable.length, z: half,
      width: plan.furniture.upperTable.length, depth: plan.furniture.upperTable.depth, floor: 0 },
    setup: { x: recessRight + half + plan.furniture.setup.gapFromRecess,
      z: bottom - half - plan.furniture.setup.length,
      width: plan.furniture.setup.width, depth: plan.furniture.setup.length, floor: 0 },
  } satisfies Record<string, Footprint>,
};

export const metres = (n: number) => `${n.toFixed(2).replace('.', ',')} m`;
