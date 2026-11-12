import * as THREE from 'three';

const hall = -12.321;
const west = -43.222;
const east = 29.58;
const workEdge = -38.0;
const bypassOpening = workEdge + 2.2;
const front = 12.877;
const railDepth = 0.16;
export const corridorView = { x: hall, z: 15.7, yaw: 0, pitch: 0.025 };

function region(x1, x2, z1, z2) {
  return { x: (x1 + x2) / 2, z: (z1 + z2) / 2, width: x2 - x1, depth: z2 - z1 };
}

const rooms = [region(workEdge, hall - 4.12, 2.55, 10.327), region(hall + 4.12, 26.45, 2.55, 10.327)];
const construction = region(west, workEdge, 0, front);
const stair = region(hall - 2.34, hall + 2.34, 2.45, 5.7);
const rails = [
  region(bypassOpening, hall - 4.12, front - railDepth, front),
  region(hall + 4.12, east, front - railDepth, front),
  region(bypassOpening, east, 0, railDepth),
  region(east - railDepth, east, railDepth, front - railDepth)
];
const portalPiers = [hall - 4.28, hall + 4.28].map(x => region(x - 0.375, x + 0.375, front - 0.70, front + 0.06));
export const corridorObstacles = [...rooms, construction, stair, ...rails, ...portalPiers];

const finish = (color, map) => new THREE.MeshStandardMaterial({ color, map, roughness: 0.85 });
const unit = new THREE.BoxGeometry(1, 1, 1);

function texture(draw, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

export function buildFirstFloorCorridor(parent) {
  const group = new THREE.Group();
  group.name = 'building-one-corridor';
  parent.add(group);
  const tileMap = texture((paint, size) => {
    paint.fillStyle = '#d0a9a5'; paint.fillRect(0, 0, size, size);
    paint.strokeStyle = '#a28783'; paint.lineWidth = 2;
    for (let i = 0; i < size; i += 16) { paint.strokeRect(i, 0, 16, size); paint.strokeRect(0, i, size, 16); }
  });
  const floorMap = texture((paint, size) => {
    paint.fillStyle = '#9a9790'; paint.fillRect(0, 0, size, size);
    for (let i = 0; i < 1900; i++) {
      paint.fillStyle = ['#aaa79d', '#6c6d68', '#c3bfb1', '#8a8b83'][i % 4];
      paint.fillRect((i * 73 + i * i * 7) % size, (i * 43 + i * i * 3) % size, 1 + i % 2, 1);
    }
  });
  const pink = finish(0xffffff, tileMap);
  const cream = finish(0xe9e5d7);
  const green = finish(0x2d725d);
  const glass = finish(0x587775);
  const steel = finish(0x827a70);
  const step = finish(0xb5ac9e);

  function box(material, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(unit, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const floorGeometry = new THREE.PlaneGeometry(east - workEdge, front);
  const uv = floorGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 70, uv.getY(i) * 13);
  const floor = new THREE.Mesh(floorGeometry, finish(0xffffff, floorMap));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((east + workEdge) / 2, 0.14, front / 2);
  floor.receiveShadow = true;
  group.add(floor);
  const ceiling = box(cream, (east + workEdge) / 2, 3.38, front / 2, east - workEdge, 0.13, front);
  ceiling.name = 'corridor-ceiling';
  ceiling.visible = false;

  for (const p of rails) box(pink, p.x, 0.6, p.z, p.width, 0.92, p.depth);
  for (const core of rooms) {
    for (const z of [2.61, 10.267]) box(cream, core.x, 1.73, z, core.width, 3.18, 0.12);
    for (const x of [core.x - core.width / 2 + 0.06, core.x + core.width / 2 - 0.06]) box(pink, x, 1.73, core.z, 0.12, 3.18, core.depth);
    for (const z of [2.53, 10.347]) {
      const n = Math.ceil(core.width / 4.4);
      for (let i = 0; i < n; i++) {
        const x = core.x - core.width / 2 + (i + 0.5) * core.width / n;
        box(green, x, 0.68, z, 2.66, 1.05, 0.05);
        box(glass, x, 1.84, z, 2.66, 1.26, 0.05);
        for (const dx of [-1.33, 0, 1.33]) box(cream, x + dx, 1.79, z, 0.065, 1.36, 0.08);
        for (const y of [1.24, 1.84, 2.45]) box(cream, x, y, z, 2.68, 0.055, 0.09);
      }
    }
  }
  for (const z of [1.22, 11.53]) {
    for (const [a, b] of [[bypassOpening, hall - 4.12], [hall + 4.12, east - 0.3]]) {
      box(cream, (a + b) / 2, 0.149, z, b - a, 0.012, 0.045);
    }
  }
  for (const x of [hall - 4.0, hall + 4.0]) {
    for (const z of [6.1, 10.45]) box(pink, x, 1.74, z, 0.4, 3.17, 0.42);
    box(steel, x, 1.48, 7.9, 0.14, 1.18, 2.5);
    box(cream, x > hall ? x - 0.081 : x + 0.081, 1.49, 7.9, 0.018, 0.92, 2.25);
  }

  for (let i = 0; i < 12; i++) {
    const height = (i + 1) * 0.16;
    box(step, hall, 0.14 + height / 2, 5.55 - i * 0.26, 4.68, height, 0.265);
  }
  const railsGeometry = new THREE.BufferGeometry().setFromPoints([-2.17, 0, 2.17].flatMap(offset => [
    new THREE.Vector3(hall + offset, 1.1, 5.66), new THREE.Vector3(hall + offset, 2.99, 2.55)
  ]));
  group.add(new THREE.LineSegments(railsGeometry, new THREE.LineBasicMaterial({ color: 0x74685d })));

  const colors = [0xe8a99c, 0xe4bf62, 0x9bbf9a, 0x8db9cc, 0xe8a99c, 0xe4bf62, 0x9bbf9a];
  colors.forEach((color, band) => {
    const shape = new THREE.Shape();
    const profile = Array.from({ length: 33 }, (_, i) => {
      const x = -3.8 + i * 7.6 / 32;
      return [x, 2.87 + Math.sin(i / 32 * Math.PI * 1.7 + band * 0.86) * 0.17];
    });
    shape.moveTo(...profile[0]);
    for (const p of profile.slice(1)) shape.lineTo(...p);
    for (const [x, y] of [...profile].reverse()) shape.lineTo(x, y - 0.145);
    shape.closePath();
    const ribbon = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.075, bevelEnabled: false }), finish(color));
    ribbon.position.set(hall, 0, 6.45 + band * 0.76);
    group.add(ribbon);
  });

  box(pink, construction.x, 1.68, construction.z, construction.width, 3.05, construction.depth);
  for (const z of [1.26, 11.59]) {
    box(green, workEdge + 0.065, 0.48, z, 0.12, 0.7, 2.25);
    for (let i = 0; i < 11; i++) box(green, workEdge + 0.065, 1.32, z - 1.1 + i * 0.22, 0.09, 1.08, 0.025);
    box(green, workEdge + 0.065, 1.86, z, 0.09, 0.085, 2.25);
    box(finish(0xc9aa50), workEdge + 0.13, 1.34, z, 0.04, 0.065, 2.25);
  }
  const bypass = finish(0xb3aa97);
  box(bypass, west - 0.92, -0.13, front / 2, 1.7, 0.13, front + 2.8);
  for (const z of [-1.16, front + 1.16]) {
    box(bypass, (west + workEdge) / 2, -0.13, z, workEdge - west + 3.5, 0.13, 1.7);
  }
  const batches = new Map();
  for (const mesh of group.children) {
    if (mesh.geometry !== unit || mesh === ceiling) continue;
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(mesh);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const batch = new THREE.InstancedMesh(unit, material, meshes.length);
    meshes.forEach((mesh, index) => {
      mesh.updateMatrix();
      batch.setMatrixAt(index, mesh.matrix);
    });
    batch.receiveShadow = true;
    group.remove(...meshes);
    group.add(batch);
  }
  return group;
}
