import * as THREE from 'three';

export function mat(color: number, flat = true) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: 0.85, metalness: 0.05 });
}
export function matMetal(color: number) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.4, metalness: 0.6 });
}
export function matCopper(color: number) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.3, metalness: 0.5 });
}
export function glow(color: number, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
}

export function jitter(geo: THREE.BufferGeometry, amount = 0.05) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * amount);
    pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * amount);
    pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * amount);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function addMesh(
  geo: THREE.BufferGeometry, material: THREE.Material,
  x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0,
  sx = 1, sy = 1, sz = 1, parent?: THREE.Object3D
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (rx) m.rotation.x = rx;
  if (ry) m.rotation.y = ry;
  if (rz) m.rotation.z = rz;
  if (sx !== 1 || sy !== 1 || sz !== 1) m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export interface FlickerItem {
  flame?: THREE.Mesh;
  light?: THREE.PointLight;
  baseIntensity?: number;
  idx: number;
}

export function animateFlicker(fl: FlickerItem[], t: number) {
  fl.forEach(f => {
    const n = f.idx || 0;
    if (f.light) {
      const b = f.baseIntensity || 1;
      f.light.intensity = b + Math.sin(t * 7 + n) * b * 0.18 + Math.sin(t * 13 + n * 2) * b * 0.12;
    }
    if (f.flame) {
      f.flame.scale.y = 1.5 + Math.sin(t * 9 + n) * 0.4;
      f.flame.scale.x = 1 + Math.sin(t * 7 + n * 3) * 0.2;
    }
  });
}

export function makeTorch(
  parent: THREE.Object3D, fl: FlickerItem[],
  x: number, y: number, z: number, ry = 0, ironColor = 0x2e3034,
  lightIntensity = 1.5 * 100, lightRange = 9
) {
  const g = new THREE.Group();
  addMesh(jitter(new THREE.BoxGeometry(0.15, 0.4, 0.25, 1, 2, 1), 0.02), matMetal(ironColor), 0, 0, 0, 0, 0, 0, 1, 1, 1, g);
  addMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 5), mat(0x2a1e14), 0, 0.45, 0, 0, 0, 0, 1, 1, 1, g);
  const flame = addMesh(new THREE.SphereGeometry(0.12, 4, 4), glow(0xff9933), 0, 0.9, 0, 0, 0, 0, 1, 1.6, 1, g);
  g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const tl = new THREE.PointLight(0xff8822, lightIntensity, lightRange);
  tl.position.set(x, y + 1.1, z); tl.castShadow = true; parent.add(tl);
  fl.push({ flame, light: tl, baseIntensity: lightIntensity, idx: Math.random() * 20 });
}
