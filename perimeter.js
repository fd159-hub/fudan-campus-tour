import * as THREE from 'three';

// The wall faces use the existing campus coordinate system. Positive Z is south.
export const campusEdge = Object.freeze({ west: -99, east: 67, north: -60, south: 47.15 });
export const sidewalkWidth = 1.5;
export const walkBounds = Object.freeze({
  left: campusEdge.west - sidewalkWidth,
  right: campusEdge.east + sidewalkWidth,
  north: campusEdge.north,
  south: campusEdge.south + sidewalkWidth
});

const { west, east, north, south } = campusEdge;
const span = east - west;
const length = south - north;
const thickness = 0.26;
const gateOpening = [-28.8, -1.12];

// Each item is a continuous boundary segment. Closed side gates still block movement.
const runs = [
  ['south', west, gateOpening[0], 'front'],
  ['south', gateOpening[1], 48, 'front'],
  ['south', 48, 52, 'gate'],
  ['south', 52, 59, 'front'],
  ['south', 59, 64, 'gate'],
  ['south', 64, east, 'front'],
  ['west', north, -54, 'front'],
  ['west', -54, -50, 'gate'],
  ['west', -50, south, 'front'],
  ['east', north, -15, 'east'],
  ['east', -15, -10, 'gate'],
  ['east', -10, south, 'east'],
  ['north', west, east, 'north']
];

function point(side, along, inset = 0) {
  switch (side) {
    case 'south': return [along, south - inset];
    case 'north': return [along, north + inset];
    case 'west': return [west + inset, along];
    case 'east': return [east - inset, along];
  }
}

function horizontal(side) { return side === 'north' || side === 'south'; }

export const wallObstacles = runs.map(([side, start, end]) => {
  const [x, z] = point(side, (start + end) / 2, thickness / 2);
  return { x, z, width: horizontal(side) ? end - start : thickness, depth: horizontal(side) ? thickness : end - start };
});

export const sidewalks = [
  { x: (west + east) / 2, z: south + sidewalkWidth / 2, width: span + 2 * sidewalkWidth, depth: sidewalkWidth },
  { x: west - sidewalkWidth / 2, z: (north + south) / 2, width: sidewalkWidth, depth: length },
  { x: east + sidewalkWidth / 2, z: (north + south) / 2, width: sidewalkWidth, depth: length }
];

function material(color, map) { return new THREE.MeshStandardMaterial({ color, map, roughness: 0.92 }); }

function brickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const paint = canvas.getContext('2d');
  paint.fillStyle = '#a17c70';
  paint.fillRect(0, 0, 512, 160);
  const shades = ['#aa6658', '#a15d51', '#ae6d5f', '#a76457'];
  for (let row = 0; row < 10; row++) {
    for (let col = -1; col < 16; col++) {
      paint.fillStyle = shades[(row * 3 + col + 4) % shades.length];
      paint.fillRect(col * 32 + row % 2 * 16 + 0.6, row * 16 + 0.65, 31, 14.7);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildCampusPerimeter(scene) {
  const group = new THREE.Group();
  group.name = 'campus-perimeter';
  scene.add(group);
  const finishes = {
    brick: material(0xffffff, brickTexture()), concrete: material(0x888982),
    iron: material(0x414d48), post: material(0xa96d5e), glass: material(0x718f88),
    red: material(0xb96754), blue: material(0x4e829b), yellow: material(0xd5ad52),
    green: material(0x668872), white: material(0xded9c7), paving: material(0xbb8b80), curb: material(0xafaaa0),
    campus: material(0xdde5d5)
  };
  const blocks = new Map();
  function add(name, x, y, z, width, height, depth, turn = false) {
    if (!blocks.has(name)) blocks.set(name, []);
    blocks.get(name).push({ x, y, z, width, height, depth, turn });
  }
  function wall(name, side, along, y, width, height, depth, inset = thickness / 2) {
    const [x, z] = point(side, along, inset);
    add(name, x, y, z, width, height, depth, !horizontal(side));
  }
  const accent = ['red', 'blue', 'yellow', 'green', 'white'];
  function railing(side, start, end, bottom, height, colored) {
    const width = end - start;
    for (const y of [bottom + 0.04, bottom + height - 0.03]) wall('iron', side, (start + end) / 2, y, width, 0.055, 0.065);
    const count = Math.max(1, Math.floor(width / 0.24));
    for (let i = 0; i < count; i++) wall(colored ? accent[i % accent.length] : 'iron', side, start + (i + 0.5) * width / count, bottom + height / 2, 0.037, height, 0.044);
  }
  for (const [side, start, end, kind] of runs) {
    const count = Math.ceil((end - start) / 4.2);
    const pitch = (end - start) / count;
    if (kind === 'gate') railing(side, start + 0.12, end - 0.12, 0.10, 1.43, false);
    for (let i = 0; i < count; i++) {
      const a = start + i * pitch;
      const b = a + pitch;
      const center = (a + b) / 2;
      if (kind === 'gate') break;
      const open = (kind === 'front' && i % 2 === 1) || (kind === 'east' && i % 4 === 2);
      wall('concrete', side, center, 0.04, pitch, 0.34, thickness);
      if (open) railing(side, a + 0.16, b - 0.16, 0.22, 1.23, true);
      else {
        wall('brick', side, center, 0.83, pitch, 1.24, thickness);
        wall('concrete', side, center, 1.51, pitch, 0.14, 0.32);
        if (kind === 'east') {
          for (const offset of [-0.9, 0, 0.9]) wall('glass', side, center + offset, 1.14, 0.19, 0.19, 0.015, -0.009);
        } else if (kind === 'front') {
          for (let tile = 0; tile < 9; tile++) wall(accent[(tile + i) % accent.length], side, center + (tile % 3 - 1) * 0.095, 1.1 + Math.floor(tile / 3) * 0.095, 0.091, 0.091, 0.016, -0.01);
        }
      }
      if (kind === 'north') railing(side, a, b, 1.58, 0.78, false);
    }
    const columns = kind === 'gate' ? 1 : count;
    for (let i = 0; i <= columns; i++) {
      const position = start + i * (end - start) / columns;
      wall(kind === 'front' ? 'post' : 'concrete', side, position, 0.84, 0.32, 1.81, 0.31, 0.17);
      wall('concrete', side, position, 1.81, 0.35, 0.17, 0.34, 0.18);
    }
  }

  add('campus', (west + east) / 2, -0.24, (north + south) / 2, span, 0.08, length);
  for (const path of sidewalks) add('paving', path.x, -0.17, path.z, path.width, 0.14, path.depth);
  add('curb', (west + east) / 2, -0.12, walkBounds.south - 0.05, span + 2 * sidewalkWidth, 0.10, 0.10);
  for (const x of [walkBounds.left + 0.05, walkBounds.right - 0.05]) add('curb', x, -0.12, (north + south) / 2, 0.10, 0.10, length);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  for (const [name, batch] of blocks) {
    const mesh = new THREE.InstancedMesh(geometry, finishes[name], batch.length);
    batch.forEach((block, i) => {
      transform.position.set(block.x, block.y, block.z);
      transform.scale.set(block.width, block.height, block.depth);
      transform.rotation.y = block.turn ? Math.PI / 2 : 0;
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
