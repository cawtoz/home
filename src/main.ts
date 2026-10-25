import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createModel } from './model';
import { geometry, metres, plan } from './plan';
import { renderPlan } from './plan2d';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const viewport = element('viewport');
const view3d = element<HTMLButtonElement>('view-3d');
const view2d = element<HTMLButtonElement>('view-2d');
let mode: '3d' | '2d' = '3d';

renderPlan();
element('length-value').textContent = metres(plan.totalLength);
element('height-value').textContent = metres(plan.vertical.ceilingHeight);
element('access-value').textContent = metres(plan.vertical.accessDrop);
element('drop-value').textContent = `−${metres(plan.vertical.interiorDrop.height)}`;
element('setup-height-value').textContent = metres(plan.furniture.setup.height);
element('closet-height-value').textContent = metres(plan.furniture.closet.height);

function setView(next: '3d' | '2d') {
  mode = next;
  const is3d = next === '3d';
  viewport.hidden = !is3d;
  element('plan-view').hidden = is3d;
  element('model-controls').hidden = !is3d;
  element('gesture-hint').hidden = !is3d;
  view3d.setAttribute('aria-pressed', String(is3d));
  view2d.setAttribute('aria-pressed', String(!is3d));
}
view2d.addEventListener('click', () => setView('2d'));

function startViewer() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f5f2');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Modelo 3D. Arrastra para girar; rueda o teclas + y − para acercar; flechas para desplazar.');
  viewport.append(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-5, 5, 3.5, -3.5, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minZoom = 0.4;
  controls.maxZoom = 6;
  controls.maxPolarAngle = Math.PI / 2 - 0.025;
  controls.minPolarAngle = 0.01;
  controls.zoomSpeed = 0.85;
  controls.listenToKeyEvents(renderer.domElement);

  const house = createModel();
  scene.add(house.model);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c3c8bf', 2));
  const sun = new THREE.DirectionalLight('#fff9ee', 2.4);
  sun.position.set(1.5, 8, 5);
  sun.target.position.set(3, 0, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0001;
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.10 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = geometry.leftFloor - 0.122;
  ground.receiveShadow = true;
  scene.add(ground);

  let frame = 0;
  function invalidate(shadows = false) {
    if (shadows) renderer.shadowMap.needsUpdate = true;
    if (!frame && mode === '3d') frame = requestAnimationFrame(() => {
      frame = 0;
      renderer.render(scene, camera);
    });
  }
  controls.addEventListener('change', () => invalidate());

  function resetView() {
    const bounds = new THREE.Box3();
    house.model.updateMatrixWorld(true);
    house.model.traverseVisible(object => {
      if (object instanceof THREE.Mesh) bounds.union(new THREE.Box3().setFromObject(object));
    });
    const target = bounds.getCenter(new THREE.Vector3());
    controls.target.copy(target);
    camera.position.copy(target).add(new THREE.Vector3(3.6, 8.5, 7));
    camera.up.set(0, 1, 0);
    camera.zoom = 1;
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const projected = new THREE.Box3();
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
    const size = projected.getSize(new THREE.Vector3());
    camera.zoom = Math.min((camera.right - camera.left) / size.x, (camera.top - camera.bottom) / size.y) * 0.82;
    camera.updateProjectionMatrix();
    controls.update();
    invalidate(true);
  }

  function resize() {
    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const halfHeight = Math.max(3.5, 4.6 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();
  resetView();

  view3d.addEventListener('click', () => { setView('3d'); resize(); invalidate(); });
  element('reset').addEventListener('click', resetView);
  element('walls').addEventListener('click', () => {
    house.fullWalls.visible = !house.fullWalls.visible;
    house.lowWalls.visible = !house.fullWalls.visible;
    element('walls').setAttribute('aria-pressed', String(house.fullWalls.visible));
    invalidate(true);
  });
  element('furniture').addEventListener('click', () => {
    house.furniture.visible = !house.furniture.visible;
    element('furniture').setAttribute('aria-pressed', String(house.furniture.visible));
    invalidate(true);
  });
  renderer.domElement.addEventListener('keydown', event => {
    if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault();
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '-' || event.key === '_' ? 0.9 : 1.1), controls.minZoom, controls.maxZoom);
      camera.updateProjectionMatrix();
      invalidate();
    }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    showError('Se perdió la vista 3D. Puedes seguir usando el plano 2D o recargar la página.');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    element('error').hidden = true;
    invalidate(true);
  });

  // Libera los recursos cuando Vite sustituye este módulo durante la edición.
  import.meta.hot?.dispose(() => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    materials.forEach(material => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  });
}

function showError(message: string) {
  const error = element('error');
  error.textContent = message;
  error.hidden = false;
}

try { startViewer(); } catch (error) {
  console.error(error);
  setView('2d');
  view3d.disabled = true;
  showError('Este navegador no pudo iniciar WebGL. El plano 2D está disponible; prueba activar la aceleración gráfica para ver el modelo 3D.');
}
