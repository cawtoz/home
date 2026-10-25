import { mkdirSync, writeFileSync } from 'node:fs';
import { geometry as g, plan, illustrative } from '../src/plan';

const root = new URL('./', import.meta.url);
mkdirSync(root, { recursive: true });
const common = {
  bed: { ...g.footprints.bed, z: 0.10, height: illustrative.bedHeight },
  closet: { ...g.footprints.closet, height: plan.furniture.closet.height },
};
const proposals = [
  { id: 'a', title: 'A · Reutilizar y despejar', items: { ...common,
    setup: { ...g.footprints.setup, height: plan.furniture.setup.height } },
    chair: { x: 4.51, z: 1.69, width: .52, depth: .52 },
    description: 'Retirar la mesa superior de 2,00 × 0,48 m. Mantener clóset y setup. Desplazar la cama hacia arriba 0,20 m. Silla y acabados ilustrativos.' },
  { id: 'b', title: 'B · Trabajo en la pared superior', items: { ...common,
    setup: { x: 4.25, z: g.half, width: 1.23, depth: .80, floor: 0, height: plan.furniture.setup.height } },
    chair: { x: 4.90, z: .94, width: .52, depth: .52 },
    description: 'Retirar la mesa superior de 2,00 × 0,48 m. Girar el setup 90° y llevarlo a la pared superior. Mantener clóset. Desplazar la cama hacia arriba 0,20 m. Silla y acabados ilustrativos.' },
];
const pointInPolygon = (x: number, z: number, polygon: readonly (readonly number[])[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const scale = 155, ox = 115, oy = 130;
const point = (x: number, z: number) => `${ox + x * scale},${oy + z * scale}`;
const polygon = (p: readonly (readonly number[])[], fill: string) => `<polygon points="${p.map(v => point(v[0],v[1])).join(' ')}" fill="${fill}"/>`;
for (const proposal of proposals) {
  const rectangles = [...Object.values(proposal.items), { ...proposal.chair, floor: 0 }];
  for (const rect of rectangles) {
    const floor = rect.floor === 0 ? g.rightPolygon : g.leftPolygon;
    for (const x of [rect.x, rect.x + rect.width]) for (const z of [rect.z, rect.z + rect.depth]) {
      if (!pointInPolygon(x, z, floor)) throw new Error(`Mueble fuera del piso: ${proposal.id}`);
    }
  }
  for (let i = 0; i < rectangles.length; i++) for (let j = i + 1; j < rectangles.length; j++) {
    const a = rectangles[i], b = rectangles[j];
    if (a.x < b.x+b.width && a.x+a.width > b.x && a.z < b.z+b.depth && a.z+a.depth > b.z) throw new Error('Muebles superpuestos');
  }
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="780" viewBox="0 0 1320 780"><rect width="1320" height="780" fill="white"/>`,
    `<style>text{font-family:Arial,sans-serif;fill:#222;text-anchor:middle} .wall{fill:none;stroke:#272c29;stroke-width:${plan.wallThickness/plan.scale*scale};stroke-linejoin:miter}</style>`,
    `<text x="660" y="50" font-size="24">${proposal.title}</text>`,
    polygon([[-.04,2.04],[2.74,2.245],[2.74,1.742],[4.108,1.742],[4.108,2.642],[6.742,2.642],[6.742,3.49],[-.04,3.49]],'#e0e1da'),
    polygon(g.leftPolygon,'#fafaf7'), polygon(g.rightPolygon,'#fff'),
  ];
  const line = (a: number[], b: number[], color='#272c29', width=2, extra='') => {
    parts.push(`<path d="M${point(...a as [number,number])} L${point(...b as [number,number])}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`);
  };
  const wall = (a:number[],b:number[])=>line(a,b,'#272c29',g.wall*scale);
  wall([0,0],[6.7,0]);wall([6.7,0],[6.7,g.bottom]);wall([6.7,g.bottom],[g.recessRight,g.bottom]);
  wall([g.recessRight,g.bottom],[g.recessRight,g.recessTop]);wall([g.recessRight,g.recessTop],[2.7,g.recessTop]);
  wall([2.7,1.2],[2.7,2.2]);wall([0,0],[0,2]);
  const w=plan.windowWalls, stops=[0,w.left,w.left+g.windowWidth,w.left+g.windowWidth+w.between,w.left+2*g.windowWidth+w.between,g.slopeLength];
  for(let i=0;i<5;i++)line([...g.windowWallPoint(stops[i])],[...g.windowWallPoint(stops[i+1])],i%2?'#55838c':'#272c29',i%2?3:g.wall*scale);
  line([g.recessRight,0],[g.recessRight,g.recessTop],'#8c928b',1.5,'stroke-dasharray="6 5"');
  for(let i=0;i<=6;i++)line([g.stairLeft,.9+i*1.7/6],[g.stairLeft+.6,.9+i*1.7/6]);
  line([g.stairLeft,.9],[g.stairLeft,2.6]);
  const stairCenter=g.stairLeft+.3;
  line([stairCenter,1.05],[stairCenter,2.44],'#5a6e60');
  line([stairCenter-.08,2.33],[stairCenter,2.44],'#5a6e60');line([stairCenter+.08,2.33],[stairCenter,2.44],'#5a6e60');
  const labels={bed:'Cama · 2,00 × 1,40 m',closet:'Clóset · 1,20 × 0,60 m',setup:'Setup · 1,23 × 0,80 m'};
  for(const [key,r] of Object.entries(proposal.items)){
    parts.push(`<rect x="${ox+r.x*scale}" y="${oy+r.z*scale}" width="${r.width*scale}" height="${r.depth*scale}" fill="#d4d8d0" stroke="#697265" stroke-width="2"/>`);
    parts.push(`<text x="${ox+(r.x+r.width/2)*scale}" y="${oy+(r.z+r.depth/2)*scale}" font-size="12">${labels[key as keyof typeof labels]}</text>`);
  }
  const c=proposal.chair;
  parts.push(`<rect x="${ox+c.x*scale}" y="${oy+c.z*scale}" width="${c.width*scale}" height="${c.depth*scale}" rx="13" fill="#edf0eb" stroke="#8b9488" stroke-dasharray="5 4"/><text x="${ox+(c.x+c.width/2)*scale}" y="${oy+(c.z+c.depth/2)*scale}" font-size="11">Silla</text>`);
  parts.push(`<text x="${ox+3.35*scale}" y="105" font-size="17">6,70 m · estructura y medidas existentes</text>`);
  parts.push(`<text x="${ox+1.3*scale}" y="${oy+3.15*scale}" font-size="15">BASE DE LA CASA +0,90 m</text>`);
  parts.push(`<text x="660" y="720" font-size="15">Piso clóset: −0,10 m · Piso escalera: 0,00 m · Ventanas: +0,18 m sobre la base exterior</text>`);
  parts.push(`<text x="660" y="752" font-size="13">Referencia de distribución propuesta · muebles conservan sus medidas · mesa superior retirada</text></svg>`);
  writeFileSync(new URL(`referencia-${proposal.id}.svg`,root), parts.join('\n'));
}
writeFileSync(new URL('distribuciones.json',root),JSON.stringify(proposals,null,2));
console.log('Dos distribuciones verificadas: muebles dentro del piso y sin superposición.');
