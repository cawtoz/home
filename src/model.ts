import * as THREE from 'three';
import { geometry as g, illustrative as h, plan } from './plan';
import type { Footprint, Point } from './plan';

/** Ejes: X = largo del plano, Z = abajo del plano, Y = altura. Una unidad = un metro. */
export function createModel() {
  const model = new THREE.Group();
  const lowWalls = new THREE.Group();
  const fullWalls = new THREE.Group();
  const furniture = new THREE.Group();
  const stairs = new THREE.Group();
  model.name = 'casa';
  lowWalls.name = 'muros-en-corte';
  fullWalls.name = 'muros-completos';
  furniture.name = 'muebles';
  stairs.name = 'escalera';
  fullWalls.visible = false;
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: '#e6e5e0', roughness: 0.95 }),
    floor: new THREE.MeshStandardMaterial({ color: '#f4f2ed', roughness: 1 }),
    exterior: new THREE.MeshStandardMaterial({ color: '#d4d6ce', roughness: 1 }),
    stair: new THREE.MeshStandardMaterial({ color: '#c5c9c7', roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: '#a9aca7', roughness: 0.8 }),
    fabric: new THREE.MeshStandardMaterial({ color: '#e0dfd9', roughness: 1 }),
    frame: new THREE.MeshStandardMaterial({ color: '#6c7471', roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: '#abc8cc', transparent: true, opacity: 0.36, roughness: 0.35, depthWrite: false, side: THREE.DoubleSide }),
  };
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#424b48', transparent: true, opacity: 0.18 });
  function mesh(parent: THREE.Group, name: string, shape: THREE.BufferGeometry, material: THREE.Material, edges = true) {
    const result = new THREE.Mesh(shape, material);
    result.name = name;
    result.castShadow = material !== materials.glass;
    result.receiveShadow = true;
    if (edges) result.add(new THREE.LineSegments(new THREE.EdgesGeometry(shape, 35), edgeMaterial));
    parent.add(result);
    return result;
  }
  function box(parent: THREE.Group, name: string, x: number, z: number, width: number, depth: number,
    base: number, height: number, material = materials.wall) {
    const result = mesh(parent, name, new THREE.BoxGeometry(width, height, depth), material);
    result.position.set(x + width / 2, base + height / 2, z + depth / 2);
    return result;
  }
  function slab(name: string, polygon: Point[], elevation: number, thickness = 0.12, material = materials.floor) {
    const outline = new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)));
    const shape = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false });
    shape.rotateX(-Math.PI / 2);
    shape.translate(0, elevation - thickness, 0);
    return mesh(model, name, shape, material);
  }
  slab('piso-clóset', g.leftPolygon, g.leftFloor);
  slab('piso-escalera', g.rightPolygon, g.rightFloor);

  // Base sólida fuera de la zona medida, incluida la pared inclinada de las
  // ventanas. El desplazamiento sigue la cara exterior del muro, no su eje.
  const windowSlope = (plan.bedroom.rightDepth - plan.bedroom.leftDepth) / g.bedroomRight;
  const windowOuterAt = (x: number) => plan.bedroom.leftDepth + windowSlope * x
    + g.half * Math.hypot(1, windowSlope);
  const exterior: Point[] = [
    [g.bedroomRight + g.half, g.recessTop + g.half],
    [g.recessRight - g.half, g.recessTop + g.half],
    [g.recessRight - g.half, g.bottom + g.half],
    [plan.totalLength + g.half, g.bottom + g.half],
    [plan.totalLength + g.half, g.bottom + g.half + h.exteriorDepth],
    [-g.half, g.bottom + g.half + h.exteriorDepth],
    [-g.half, windowOuterAt(-g.half)],
    [g.bedroomRight + g.half, windowOuterAt(g.bedroomRight + g.half)],
  ];
  slab('base-casa', exterior, plan.vertical.accessDrop,
    plan.vertical.accessDrop - g.leftFloor + 0.12, materials.exterior);
  function segment(parent: THREE.Group, name: string, a: Point, b: Point, bottom: number, top: number,
    material = materials.wall, thickness = g.wall) {
    if (top <= bottom) return;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const result = mesh(parent, name, new THREE.BoxGeometry(Math.hypot(dx, dz), top - bottom, thickness), material);
    result.position.set((a[0] + b[0]) / 2, (bottom + top) / 2, (a[1] + b[1]) / 2);
    result.rotation.y = -Math.atan2(dz, dx);
    return result;
  }
  function walls(parent: THREE.Group, cut: boolean) {
    // Vista inicial: corte común a la altura de la base. Vista completa: techo.
    const wallTop = cut ? plan.vertical.accessDrop : plan.vertical.ceilingHeight;
    const wall = (name: string, a: Point, b: Point, base: number) =>
      segment(parent, name, a, b, base, wallTop);
    wall('superior-izquierda', [0, 0], [g.recessRight, 0], g.leftFloor);
    wall('superior-derecha', [g.recessRight, 0], [plan.totalLength, 0], 0);
    wall('izquierda', [0, 0], [0, plan.bedroom.leftDepth], g.leftFloor);
    wall('derecha', [plan.totalLength, 0], [plan.totalLength, g.bottom], 0);
    // Estos tres tramos delimitan la base de la casa y terminan al nivel del
    // peldaño superior. Sobre el piso del clóset (-0,10 m) su cara mide 1,00 m.
    const accessLevel = plan.vertical.accessDrop;
    // Los bordes de la base conservan su altura también en la vista en corte.
    segment(parent, 'inferior', [g.recessRight, g.bottom], [plan.totalLength, g.bottom], 0, accessLevel, materials.exterior);
    segment(parent, 'recorte-vertical', [g.recessRight, g.recessTop], [g.recessRight, g.bottom], 0, accessLevel, materials.exterior);
    segment(parent, 'detrás-clóset', [g.bedroomRight, g.recessTop], [g.recessRight, g.recessTop], g.leftFloor, accessLevel, materials.exterior);
    wall('dormitorio-inferior', [g.bedroomRight, g.recessTop], [g.bedroomRight, plan.bedroom.rightDepth], g.leftFloor);
    wall('entrada-dormitorio', [g.bedroomRight, plan.bedroom.entrance], [g.bedroomRight, g.recessTop], g.leftFloor);
    const w = plan.windowWalls;
    const stops = [0, w.left, w.left + g.windowWidth, w.left + g.windowWidth + w.between,
      w.left + 2 * g.windowWidth + w.between, g.slopeLength];
    for (let i = 0; i < 5; i++) {
      const a = g.windowWallPoint(stops[i]);
      const b = g.windowWallPoint(stops[i + 1]);
      if (i % 2 === 0) {
        wall(`ventanas-muro-${i}`, a, b, g.leftFloor);
      } else {
        const head = Math.min(wallTop, g.leftFloor + h.windowHead);
        const sill = Math.min(wallTop, plan.vertical.accessDrop + plan.vertical.windowAboveAccess);
        segment(parent, `ventana-${i}-antepecho`, a, b, g.leftFloor, sill);
        if (head > sill) {
          segment(parent, `ventana-${i}-vidrio`, a, b, sill, head, materials.glass, 0.012);
          segment(parent, `ventana-${i}-marco`, a, b, Math.max(sill, head - 0.025), head, materials.frame, 0.035);
        }
        if (!cut) segment(parent, `ventana-${i}-dintel`, a, b, head, wallTop);
      }
    }
  }
  walls(lowWalls, true);
  walls(fullWalls, false);
  function piece(name: string, f: Footprint) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(f.x, f.floor, f.z);
    furniture.add(group);
    return group;
  }
  const bed = g.footprints.bed;
  const bedGroup = piece('cama', bed);
  box(bedGroup, 'base', 0, 0, bed.width, bed.depth, 0, 0.18, materials.wood);
  box(bedGroup, 'colchón', 0.06, 0, bed.width - 0.06, bed.depth, 0.18, h.bedHeight - 0.18, materials.fabric);
  box(bedGroup, 'espaldar', 0, 0, 0.06, bed.depth, 0, h.headboardHeight, materials.wood);
  const closet = g.footprints.closet;
  box(piece('clóset', closet), 'volumen', 0, 0, closet.width, closet.depth, 0, plan.furniture.closet.height, materials.wood);
  function table(name: string, f: Footprint, height: number) {
    const group = piece(name, f);
    box(group, 'tablero', 0, 0, f.width, f.depth, height - 0.045, 0.045, materials.wood);
    for (const x of [0.035, f.width - 0.075]) {
      for (const z of [0.035, f.depth - 0.075]) box(group, 'pata', x, z, 0.04, 0.04, 0, height - 0.045, materials.frame);
    }
  }
  table('mesa', g.footprints.upperTable, h.tableHeight);
  table('setup', g.footprints.setup, plan.furniture.setup.height);
  // Peldaños sólidos, con contrahuellas. El más alto está abajo en el plano 2D.
  const tread = plan.right.stairLength / plan.right.steps;
  const rise = plan.vertical.accessDrop / plan.right.steps;
  for (let i = 0; i < plan.right.steps; i++) {
    const step = plan.right.highEnd === 'bottom' ? i + 1 : plan.right.steps - i;
    box(stairs, `peldaño-${i + 1}`, g.stairLeft, plan.right.upper + i * tread,
      plan.right.stairWidth, tread, 0, rise * step, materials.stair);
  }
  model.add(lowWalls, fullWalls, furniture, stairs);
  return { model, lowWalls, fullWalls, furniture, stairs };
}
