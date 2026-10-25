import { describe, expect, test } from 'bun:test';
import { Box3, Raycaster, Vector3 } from 'three';
import { createModel } from '../src/model';
import { geometry, plan } from '../src/plan';

const house = createModel();
house.model.updateMatrixWorld(true);
const bounds = (name: string) => {
  const object = house.model.getObjectByName(name);
  if (!object) throw new Error(`Falta ${name}`);
  return new Box3().setFromObject(object);
};

describe('Geometría medida', () => {
  test('los muebles conservan sus huellas y el setup sigue vertical en planta', () => {
    for (const [name, width, depth] of [
      ['cama', 2, 1.4], ['clóset', 1.2, 0.6], ['mesa', 2, 0.48], ['setup', 0.8, 1.23],
    ] as const) {
      const size = bounds(name).getSize(new Vector3());
      expect(size.x).toBeCloseTo(width, 5);
      expect(size.z).toBeCloseTo(depth, 5);
    }
    expect(bounds('mesa').max.x).toBeCloseTo(plan.totalLength - geometry.half, 5);
    expect(bounds('setup').max.z).toBeCloseTo(geometry.bottom - geometry.half, 5);
  });
  test('seis peldaños sólidos suben hacia la pared inferior hasta 0,90 m', () => {
    expect(house.stairs.children).toHaveLength(6);
    const size = bounds('escalera').getSize(new Vector3());
    expect(size.x).toBeCloseTo(0.6, 5);
    expect(size.z).toBeCloseTo(1.7, 5);
    expect(size.y).toBeCloseTo(0.9, 5);
    for (let i = 1; i <= 6; i++) {
      expect(bounds(`peldaño-${i}`).max.y).toBeCloseTo(i * 0.15, 5);
    }
    expect(bounds('peldaño-6').max.z).toBeCloseTo(2.6, 5);
  });
  test('el lado del clóset queda 10 cm más bajo', () => {
    expect(bounds('piso-escalera').max.y - bounds('piso-clóset').max.y).toBeCloseTo(0.1, 5);
    expect(bounds('clóset').min.y).toBeCloseTo(-0.1, 5);
    expect(bounds('setup').min.y).toBeCloseTo(0, 5);
    expect(bounds('setup').getSize(new Vector3()).y).toBeCloseTo(0.79, 5);
    expect(bounds('clóset').getSize(new Vector3()).y).toBeCloseTo(1.40, 5);
  });
  test('la base exterior llega al acceso y deja libre toda la zona interior', () => {
    expect(bounds('base-casa').max.y).toBeCloseTo(bounds('peldaño-6').max.y, 5);
    expect(bounds('base-casa').min.y).toBeCloseTo(bounds('piso-clóset').min.y, 5);
    const base = house.model.getObjectByName('base-casa')!;
    const hit = (x: number, z: number) => new Raycaster(new Vector3(x, 3, z), new Vector3(0, -1, 0))
      .intersectObject(base, false).length > 0;
    expect(hit(3.3, 2.1)).toBe(true);
    expect(hit(6.35, 2.9)).toBe(true);
    expect(hit(1.3, 2.2)).toBe(true);
    expect(hit(1.3, 3)).toBe(true);
    expect(hit(1.3, 2.05)).toBe(false);
    expect(hit(3.3, 1.3)).toBe(false);
    expect(hit(5.3, 1.8)).toBe(false);
    expect(hit(1.3, 1)).toBe(false);
  });
  test('los bordes de la base conservan su altura al mostrar los muros completos', () => {
    const accessLevel = bounds('peldaño-6').max.y;
    for (const name of ['inferior', 'recorte-vertical', 'detrás-clóset']) {
      const wall = house.fullWalls.getObjectByName(name)!;
      expect(new Box3().setFromObject(wall).max.y).toBeCloseTo(accessLevel, 5);
    }
    const closetWall = new Box3().setFromObject(house.fullWalls.getObjectByName('detrás-clóset')!);
    expect(closetWall.getSize(new Vector3()).y).toBeCloseTo(1, 5);
    const rightWall = new Box3().setFromObject(house.fullWalls.getObjectByName('derecha')!);
    expect(rightWall.max.y).toBeCloseTo(2.3, 5);
    for (const part of house.lowWalls.children) {
      expect(new Box3().setFromObject(part).max.y).toBeLessThanOrEqual(accessLevel + 0.00001);
    }
    for (const name of ['superior-izquierda', 'superior-derecha', 'izquierda', 'derecha',
      'dormitorio-inferior', 'entrada-dormitorio']) {
      expect(new Box3().setFromObject(house.lowWalls.getObjectByName(name)!).max.y).toBeCloseTo(0.9, 5);
      expect(new Box3().setFromObject(house.fullWalls.getObjectByName(name)!).max.y).toBeCloseTo(2.3, 5);
    }
  });
  test('la pared inclinada y los huecos de ventanas cierran con las medidas dadas', () => {
    expect(geometry.windowWallPoint(0)).toEqual([0, 2]);
    expect(geometry.windowWallPoint(geometry.slopeLength)).toEqual([2.7, 2.2]);
    expect(0.19 + 0.22 + 0.43 + 2 * geometry.windowWidth).toBeCloseTo(Math.hypot(2.7, 0.2), 8);
    expect(geometry.recessTop).toBeCloseTo(1.7);
    expect(geometry.recessRight).toBeCloseTo(4.15);
  });
  test('las ventanas empiezan sobre la base exterior y no aparecen por debajo del corte', () => {
    for (const i of [1, 3]) {
      const glass = new Box3().setFromObject(house.fullWalls.getObjectByName(`ventana-${i}-vidrio`)!);
      expect(glass.min.y - bounds('base-casa').max.y).toBeCloseTo(0.18, 5);
      expect(house.lowWalls.getObjectByName(`ventana-${i}-vidrio`)).toBeUndefined();
      expect(house.lowWalls.getObjectByName(`ventana-${i}-marco`)).toBeUndefined();
    }
  });
});
