import * as THREE from 'three';

const gate = { x: -18, z: 46, depth: 1.1 };
export const gateView = { x: -7, z: 47.9, yaw: 0, pitch: 0.03 };
const gatePosts = [
  { x: -27.9, width: 1.65, height: 3.0 },
  { x: -19.0, width: 1.35, height: 3.0 },
  { x: -15.8, width: 1.25, height: 3.0 },
  { x: -12.8, width: 0.95, height: 2.15 },
  { x: -1.6, width: 0.95, height: 2.15 }
];
export const gateObstacles = gatePosts.map(post => ({ x: post.x, width: post.width, z: gate.z + 0.55, depth: 1.1 }));

const finish = color => new THREE.MeshStandardMaterial({ color, roughness: 0.87 });
const cream = finish(0xeee6d3);
const rose = finish(0xc99796);
const roseLight = finish(0xe2b8b3);
const glazing = finish(0x495c60);
const roof = finish(0x525653);
const bronze = finish(0xb29b76);
const brick = finish(0x8e4b3f);
const unit = new THREE.BoxGeometry(1, 1, 1);

function block(group, material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(unit, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function repeatedBlocks(group, material, blocks) {
  const mesh = new THREE.InstancedMesh(unit, material, blocks.length);
  const transform = new THREE.Object3D();
  blocks.forEach(([x, y, z, w, h, d], index) => {
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.receiveShadow = true;
  group.add(mesh);
}

function textSign(text, width, height, color, vertical = false) {
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? 128 : 1024;
  canvas.height = vertical ? 1024 : 160;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (vertical) {
    context.font = 'bold 68px Microsoft JhengHei, sans-serif';
    Array.from(text).forEach((character, i) => context.fillText(character, 64, (i + 0.5) * (1024 / text.length)));
  } else {
    context.font = 'bold 76px Arial, sans-serif';
    context.fillText(text, 512, 80, 980);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.25 });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function arch(left, right, shoulder, crown) {
  const path = new THREE.Path();
  const center = (left + right) / 2;
  path.moveTo(left, 0.06);
  path.lineTo(left, shoulder);
  path.quadraticCurveTo(left, crown, center, crown);
  path.quadraticCurveTo(right, crown, right, shoulder);
  path.lineTo(right, 0.06);
  path.closePath();
  return path;
}

function brickFinish() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const paint = canvas.getContext('2d');
  paint.fillStyle = '#806252';
  paint.fillRect(0, 0, 256, 256);
  const colors = ['#945341', '#854636', '#9b5945', '#8c4a39'];
  for (let row = 0; row < 12; row++) {
    for (let column = -1; column < 4; column++) {
      paint.fillStyle = colors[(row * 3 + column + 4) % colors.length];
      paint.fillRect(column * 64 + (row % 2) * 32 + 1, row * 256 / 12 + 1, 62, 256 / 12 - 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
}

export function buildSchoolGate(scene) {
  const group = new THREE.Group();
  group.name = 'photo-model-main-gate';
  group.position.set(gate.x, 0, gate.z);
  scene.add(group);

  const shape = new THREE.Shape();
  shape.moveTo(-10.8, 0);
  shape.lineTo(-10.8, 4.25);
  shape.quadraticCurveTo(-9.4, 4.8, -9.2, 6.25);
  shape.lineTo(-8.75, 6.25);
  shape.bezierCurveTo(-8.45, 4.65, -6.55, 4.35, -4.0, 4.5);
  shape.bezierCurveTo(-1.75, 4.55, -0.9, 5.7, -0.5, 8.4);
  shape.lineTo(-0.02, 12.1);
  shape.lineTo(1.77, 12.1);
  shape.lineTo(1.45, 8.15);
  shape.bezierCurveTo(1.28, 6.1, 2.3, 4.85, 4.05, 4.45);
  shape.lineTo(4.05, 3.82);
  shape.quadraticCurveTo(2.63, 3.45, 2.66, 1.9);
  shape.lineTo(2.66, 0);
  shape.closePath();
  shape.holes.push(arch(-9.25, -1.8, 1.85, 3.78), arch(-0.55, 1.52, 2.8, 4.05));
  const entrance = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: gate.depth, bevelEnabled: false, curveSegments: 16 }), brickFinish());
  entrance.castShadow = true;
  entrance.receiveShadow = true;
  group.add(entrance);

  const towerSign = textSign('桃園市平鎮區復旦國民小學', 0.83, 6.3, '#e1c497', true);
  towerSign.position.set(0.65, 8.35, gate.depth + 0.016);
  group.add(towerSign);
  const entranceSign = textSign('FUDAN ELEMENTARY SCHOOL', 7.65, 0.63, '#d6bc91');
  entranceSign.position.set(-5.73, 4.21, gate.depth + 0.018);
  group.add(entranceSign);

  for (const post of gatePosts.slice(3)) {
    const localX = post.x - gate.x;
    block(group, brick, localX, post.height / 2, 0.55, post.width, post.height, 1.1).castShadow = true;
    block(group, cream, localX, post.height + 0.08, 0.55, post.width + 0.12, 0.16, 1.2);
  }

  const plaza = new THREE.Group();
  plaza.name = 'photo-model-entry-plaza';
  scene.add(plaza);
  block(plaza, finish(0xc0a680), -12, -0.15, 26.6, 34, 0.12, 20.5);
  const accents = [0x799e98, 0x9fb9b1, 0xb95849, 0xd4cbb7, 0x82978d];
  accents.forEach((color, index) => block(plaza, finish(color), -19 + index * 3.3, -0.075, 24, 2.6, 0.028, 13.2));
  block(plaza, finish(0x9b5b4d), -12, -0.06, 34, 34, 0.02, 0.55);
  return { group, plaza };
}

export function buildFirstBuildingFront(parent, building, floor, y, floorHeight) {
  const group = new THREE.Group();
  group.name = `photo-model-b1-front-${floor}`;
  parent.add(group);

  const front = building.z + building.depth / 2;
  const entry = building.x - 5.5;
  const wings = [
    { left: building.x - building.width / 2 + 0.2, right: entry - 4.5 },
    { left: entry + 4.5, right: building.x + building.width / 2 - 0.2 }
  ];
  const windows = [];
  const mullions = [];
  const rails = [];
  for (const wing of wings) {
    const width = wing.right - wing.left;
    const center = (wing.right + wing.left) / 2;
    block(group, roseLight, center, y + floorHeight - 0.23, front - 0.58, width, 0.42, 1.14);
    block(group, cream, center, y + floorHeight - 0.43, front - 0.6, width, 0.12, 1.22);
    const bays = Math.max(1, Math.round(width / 4.4));
    const bay = width / bays;
    for (let i = 0; i < bays; i++) {
      const x = wing.left + (i + 0.5) * bay;
      windows.push([x, y + 1.78, front - 2.0, bay * 0.72, 1.62, 0.10]);
      mullions.push([x, y + 1.78, front - 1.94, 0.1, 1.65, 0.08]);
      mullions.push([x, y + 2.08, front - 1.94, bay * 0.72, 0.08, 0.08]);
      if (floor !== '1F') rails.push([x, y + 0.66, front - 0.18, bay - 0.26, 0.62, 0.16]);
      if (floor !== '1F' && i % 2 === 0) block(group, rose, wing.left + i * bay + 0.12, y + 1.64, front - 0.72, 0.26, 3.2, 0.58);
    }
  }
  if (floor !== '1F') {
    repeatedBlocks(group, glazing, windows);
    repeatedBlocks(group, cream, mullions);
  }
  if (rails.length) repeatedBlocks(group, roseLight, rails);

  for (const x of [entry - 4.28, entry + 4.28]) block(group, floor === '1F' ? cream : rose, x, y + 1.68, front - 0.32, 0.75, 3.35, 0.76).castShadow = true;
  if (floor === '1F') {
    block(group, cream, entry, y + 3.04, front - 0.05, 8.1, 0.8, 0.9);
    const sign = textSign('FuDan Elementary School', 7.65, 0.7, '#4a3a35');
    sign.position.set(entry, y + 3.08, front + 0.416);
    group.add(sign);
  } else {
    block(group, roseLight, entry, y + 2.05, front - 0.65, 7.8, 2.95, 0.38);
    block(group, glazing, entry, y + 1.27, front - 0.415, 6.85, 1.12, 0.08);
    const frames = Array.from({ length: 7 }, (_, i) => [entry - 2.7 + i * 0.9, y + 1.27, front - 0.35, 0.10, 1.16, 0.05]);
    repeatedBlocks(group, cream, frames);
  }
  if (floor === '2F') {
    const balcony = new THREE.Shape();
    balcony.moveTo(entry - 4, front - 0.6);
    balcony.lineTo(entry + 4, front - 0.6);
    balcony.lineTo(entry + 4, front + 0.17);
    balcony.quadraticCurveTo(entry, front + 1.42, entry - 4, front + 0.17);
    balcony.closePath();
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(balcony, { depth: 0.24, bevelEnabled: false }), cream);
    slab.rotation.x = Math.PI / 2;
    slab.position.y = y + 0.28;
    slab.receiveShadow = true;
    group.add(slab);
    const curve = Array.from({ length: 17 }, (_, i) => {
      const x = (i - 8) * 0.48;
      return [entry + x, y + 0.72, front + 0.16 + 0.62 * (1 - (x / 4.0) ** 2), 0.075, 0.92, 0.09];
    });
    repeatedBlocks(group, bronze, curve);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.map(([x, h, z]) => new THREE.Vector3(x, h + 0.46, z))), new THREE.LineBasicMaterial({ color: 0x907751 }));
    group.add(line);
  }
  if (floor === '4F') block(group, roof, building.x, y + floorHeight - 0.04, front - 0.66, building.width - 0.25, 0.16, 1.2);
  return group;
}
