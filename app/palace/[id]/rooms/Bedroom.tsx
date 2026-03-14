'use client';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mat, matMetal, jitter, addMesh, makeTorch, animateFlicker, FlickerItem } from './roomUtils';
import { DynamicObject } from '../DynamicObject';

const BEDROOM_SLOTS: [number, number, number][] = [
  [-1.5, 3.5, -2],     // On the bed
  [-3.8, 2.5, -2],     // On the nightstand
  [5.5, 3.5, 1.5],     // Floating near the armor
  [-5, 2, 4],          // On the chair
  [6, 5, -5]           // On the bookshelf
];

export function Bedroom({ objects = [] }: { objects?: any[] }) {
  const { group, candles, torches } = useMemo(() => {
    const parent = new THREE.Group();
    const candlesList: any[] = [];
    const torchesList: any[] = [];

    // Color palette matching the image
    const C = {
      stoneLight: 0x8a9a8a, stoneMid: 0x6a7a6a, stoneDark: 0x4a5a4a,
      wallLight: 0x7a8a7a, wallDark: 0x3a4a3a,
      green1: 0x4a6a3a, green2: 0x3a5a2a, green3: 0x6a8a4a,
      wood: 0x5a4a3a, woodDark: 0x3a2a1a, gold: 0x8a7a3a,
      fabric: 0x3a4a5a, fabricDark: 0x2a3a4a, red: 0x6a3a3a,
      warm: 0xaa8a5a, candle: 0xffcc66,
    };

    function mat(color: number, flat = true) {
      return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: 0.85, metalness: 0.05 });
    }

    function jitter(geo: THREE.BufferGeometry, amount = 0.05) {
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

    // Floor
    const floorGeo = jitter(new THREE.BoxGeometry(14, 0.4, 12, 4, 1, 4), 0.08);
    const floor = new THREE.Mesh(floorGeo, mat(C.stoneDark));
    floor.position.y = -0.2; floor.receiveShadow = true; parent.add(floor);

    // Floor stones detail
    for (let i = 0; i < 20; i++) {
      const sg = jitter(new THREE.BoxGeometry(0.8 + Math.random() * 1.2, 0.08, 0.8 + Math.random() * 1.2, 2, 1, 2), 0.03);
      const s = new THREE.Mesh(sg, mat([C.stoneDark, C.stoneMid, C.wallDark][i % 3] as number));
      s.position.set((Math.random() - 0.5) * 12, 0.02, (Math.random() - 0.5) * 10);
      s.receiveShadow = true; parent.add(s);
    }

    // Walls
    function makeWall(w: number, h: number, d: number, x: number, y: number, z: number, color = C.wallLight) {
      const geo = jitter(new THREE.BoxGeometry(w, h, d, Math.ceil(w), Math.ceil(h / 2), Math.ceil(d)), 0.06);
      const wall = new THREE.Mesh(geo, mat(color));
      wall.position.set(x, y, z); wall.castShadow = true; wall.receiveShadow = true; parent.add(wall);
    }
    makeWall(14, 8, 0.6, 0, 4, -6, C.stoneMid);
    makeWall(0.6, 8, 12, -7, 4, 0, C.stoneMid);
    makeWall(0.6, 8, 12, 7, 4, 0, C.wallLight);

    // Wall stone blocks for texture
    for (let wall = 0; wall < 3; wall++) {
      for (let i = 0; i < 15; i++) {
        const bw = 0.6 + Math.random() * 1.5;
        const bh = 0.3 + Math.random() * 0.6;
        const bg = jitter(new THREE.BoxGeometry(bw, bh, 0.15, 2, 1, 1), 0.02);
        const b = new THREE.Mesh(bg, mat([C.stoneDark, C.stoneLight, C.wallDark][i % 3] as number));
        if (wall === 0) { b.position.set((Math.random() - 0.5) * 12, 0.5 + Math.random() * 7, -5.6); } 
        else if (wall === 1) { b.position.set(-6.6, 0.5 + Math.random() * 7, (Math.random() - 0.5) * 10); b.rotation.y = Math.PI / 2; } 
        else { b.position.set(6.6, 0.5 + Math.random() * 7, (Math.random() - 0.5) * 10); b.rotation.y = Math.PI / 2; }
        b.receiveShadow = true; parent.add(b);
      }
    }

    // Ceiling beams
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(jitter(new THREE.BoxGeometry(14, 0.5, 0.6, 4, 1, 1), 0.04), mat(C.woodDark));
      beam.position.set(0, 7.8, -4 + i * 2.8); beam.castShadow = true; parent.add(beam);
    }
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 12), mat(C.wallDark));
    ceil.position.y = 8.1; parent.add(ceil);

    // WINDOW (arched opening in back wall)
    const windowFrame = new THREE.Group();
    const arch = new THREE.Mesh(jitter(new THREE.TorusGeometry(1, 0.25, 6, 8, Math.PI), 0.04), mat(C.stoneDark));
    arch.position.set(0, 5.5, -5.65); windowFrame.add(arch);
    for (let s = -1; s <= 1; s += 2) {
      const p = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.4, 3, 0.4, 1, 3, 1), 0.04), mat(C.stoneDark));
      p.position.set(s * 1, 3.5, -5.65); windowFrame.add(p);
    }
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3), new THREE.MeshBasicMaterial({ color: 0x5a7a5a, transparent: true, opacity: 0.3 }));
    wl.position.set(0, 4.2, -5.7); windowFrame.add(wl); parent.add(windowFrame);

    // BED
    const bed = new THREE.Group();
    const bedBase = new THREE.Mesh(jitter(new THREE.BoxGeometry(4, 0.6, 5, 3, 1, 3), 0.05), mat(C.woodDark));
    bedBase.position.y = 0.6; bedBase.castShadow = true; bed.add(bedBase);
    const mattress = new THREE.Mesh(jitter(new THREE.BoxGeometry(3.6, 0.5, 4.6, 3, 1, 3), 0.04), mat(C.fabric));
    mattress.position.y = 1.15; mattress.castShadow = true; bed.add(mattress);
    for (let s = -1; s <= 1; s += 2) {
      const pillow = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.2, 0.4, 0.8, 2, 1, 2), 0.05), mat(C.stoneLight));
      pillow.position.set(s * 0.8, 1.55, -1.8); pillow.castShadow = true; bed.add(pillow);
    }
    const blanket = new THREE.Mesh(jitter(new THREE.BoxGeometry(3.6, 0.2, 3.2, 4, 1, 4), 0.06), mat(C.green1));
    blanket.position.set(0, 1.5, 0.4); blanket.castShadow = true; bed.add(blanket);
    const headboard = new THREE.Mesh(jitter(new THREE.BoxGeometry(4.2, 3, 0.4, 3, 3, 1), 0.06), mat(C.woodDark));
    headboard.position.set(0, 2.2, -2.6); headboard.castShadow = true; bed.add(headboard);
    const hd = new THREE.Mesh(jitter(new THREE.BoxGeometry(3, 1.5, 0.15, 2, 2, 1), 0.03), mat(C.green2));
    hd.position.set(0, 2.8, -2.35); bed.add(hd);
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const post = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 6), 0.03), mat(C.woodDark));
        post.position.set(x * 2, 2.5, z * 2.5); post.castShadow = true; bed.add(post);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), mat(C.gold));
        top.position.set(x * 2, 4.8, z * 2.5); bed.add(top);
      }
    }
    for (let z = -1; z <= 1; z += 2) {
      const bar = new THREE.Mesh(jitter(new THREE.BoxGeometry(4, 0.12, 0.12, 3, 1, 1), 0.02), mat(C.woodDark));
      bar.position.set(0, 4.7, z * 2.5); bed.add(bar);
    }
    for (let x = -1; x <= 1; x += 2) {
      const bar = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.12, 0.12, 5, 1, 1, 3), 0.02), mat(C.woodDark));
      bar.position.set(x * 2, 4.7, 0); bed.add(bar);
    }
    const drape = new THREE.Mesh(jitter(new THREE.PlaneGeometry(4, 4.2, 4, 4), 0.08), new THREE.MeshStandardMaterial({ color: C.fabricDark, flatShading: true, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    drape.position.set(0, 2.6, -2.45); bed.add(drape);
    bed.position.set(-1.5, 0, -2); parent.add(bed);

    // NIGHTSTAND
    function makeNightstand(x: number, z: number) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(jitter(new THREE.BoxGeometry(1, 1.2, 1, 2, 2, 2), 0.04), mat(C.wood));
      body.position.y = 0.9; body.castShadow = true; g.add(body);
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.05), mat(C.woodDark));
      drawer.position.set(0, 0.9, 0.53); g.add(drawer);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), mat(C.gold));
      knob.position.set(0, 0.9, 0.58); g.add(knob);
      g.position.set(x, 0, z); parent.add(g);
    }
    makeNightstand(-4.5, -3); makeNightstand(1.5, -3);

    // CANDLES
    function makeCandle(x: number, y: number, z: number, tall = 0.6) {
      const g = new THREE.Group();
      const holder = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.15, 0.2, 0.15, 6), 0.02), mat(C.gold));
      holder.position.y = 0.08; g.add(holder);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, tall, 6), mat(0xddd8c8));
      candle.position.y = 0.15 + tall / 2; g.add(candle);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshBasicMaterial({ color: C.candle }));
      flame.position.y = 0.15 + tall + 0.05; flame.scale.y = 1.5; g.add(flame);
      g.position.set(x, y, z); parent.add(g);
      const pl = new THREE.PointLight(0xffaa44, 0.8, 6);
      pl.position.copy(flame.position); pl.position.set(x, y + 0.15 + tall + 0.1, z);
      pl.castShadow = true; parent.add(pl);
      candlesList.push({ flame, light: pl });
    }
    makeCandle(-4.5, 1.5, -3, 0.5); makeCandle(1.5, 1.5, -3, 0.6);

    // BOOKSHELF
    const shelf = new THREE.Group();
    const shelfBody = new THREE.Mesh(jitter(new THREE.BoxGeometry(2.5, 4, 0.8, 2, 3, 1), 0.05), mat(C.woodDark));
    shelfBody.position.y = 2; shelfBody.castShadow = true; shelf.add(shelfBody);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.7), mat(C.wood));
      s.position.y = 1 + i * 1.2; shelf.add(s);
      for (let j = 0; j < 4 + Math.floor(Math.random() * 3); j++) {
        const bh = 0.6 + Math.random() * 0.4, bw = 0.12 + Math.random() * 0.1;
        const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.5), mat([C.green1, C.red, C.fabric, C.gold, C.green2, C.woodDark][Math.floor(Math.random() * 6)] as number));
        book.position.set(-0.9 + j * 0.3, 1.35 + i * 1.2 + bh / 2, 0); book.rotation.z = (Math.random() - 0.5) * 0.08; shelf.add(book);
      }
    }
    shelf.position.set(5.5, 0, -3); parent.add(shelf);

    // TABLE & CHAIR
    const table = new THREE.Group();
    const tableTop = new THREE.Mesh(jitter(new THREE.BoxGeometry(2.5, 0.15, 1.5, 3, 1, 2), 0.03), mat(C.wood));
    tableTop.position.y = 1.8; tableTop.castShadow = true; table.add(tableTop);
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const leg = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.15, 1.8, 0.15, 1, 2, 1), 0.02), mat(C.woodDark));
        leg.position.set(x * 1, 0.9, z * 0.55); leg.castShadow = true; table.add(leg);
      }
    }
    const scroll = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), 0.02), mat(C.warm));
    scroll.rotation.z = Math.PI / 2; scroll.position.set(0.3, 2, 0); table.add(scroll);
    const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 6), mat(C.stoneDark));
    inkwell.position.set(-0.5, 1.98, 0.3); table.add(inkwell);
    makeCandle(4.8, 1.88, 1.3, 0.4);
    table.position.set(4.5, 0, 1); parent.add(table);

    const chair = new THREE.Group();
    const seat = new THREE.Mesh(jitter(new THREE.BoxGeometry(1, 0.12, 1, 2, 1, 2), 0.03), mat(C.wood));
    seat.position.y = 1; seat.castShadow = true; chair.add(seat);
    const back = new THREE.Mesh(jitter(new THREE.BoxGeometry(1, 1.5, 0.12, 2, 2, 1), 0.03), mat(C.wood));
    back.position.set(0, 1.75, -0.44); back.castShadow = true; chair.add(back);
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        const cl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), mat(C.woodDark));
        cl.position.set(x * 0.4, 0.5, z * 0.4); chair.add(cl);
      }
    }
    chair.position.set(4.5, 0, 2.5); chair.rotation.y = Math.PI; parent.add(chair);

    // RUG & CHEST
    const rug = new THREE.Mesh(jitter(new THREE.BoxGeometry(5, 0.06, 4, 5, 1, 4), 0.03), mat(C.red));
    rug.position.set(0, 0.05, 1); rug.receiveShadow = true; parent.add(rug);
    const rugBorder = new THREE.Mesh(jitter(new THREE.BoxGeometry(5.4, 0.04, 4.4, 5, 1, 4), 0.03), mat(C.gold));
    rugBorder.position.set(0, 0.03, 1); rugBorder.receiveShadow = true; parent.add(rugBorder);

    const chest = new THREE.Group();
    const chestBody = new THREE.Mesh(jitter(new THREE.BoxGeometry(2.5, 1.2, 1.2, 2, 2, 2), 0.05), mat(C.wood));
    chestBody.position.y = 0.6; chestBody.castShadow = true; chest.add(chestBody);
    const chestLid = new THREE.Mesh(jitter(new THREE.BoxGeometry(2.6, 0.3, 1.3, 2, 1, 2), 0.04), mat(C.woodDark));
    chestLid.position.y = 1.35; chestLid.castShadow = true; chest.add(chestLid);
    for (let i = -1; i <= 1; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.25), mat(C.stoneDark));
      band.position.set(i * 0.8, 0.6, 0); chest.add(band);
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.1), mat(C.gold));
    lock.position.set(0, 0.8, 0.65); chest.add(lock);
    chest.position.set(-1.5, 0, 1.2); parent.add(chest);

    // TORCH
    function makeTorch(x: number, y: number, z: number, ry = 0) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(jitter(new THREE.BoxGeometry(0.15, 0.4, 0.3, 1, 2, 1), 0.02), mat(C.stoneDark)));
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 5), mat(C.woodDark));
      stick.position.y = 0.5; g.add(stick);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff9933 }));
      flame.scale.y = 1.8; flame.position.y = 1; g.add(flame);
      g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
      const tl = new THREE.PointLight(0xff8822, 1.2 * 100, 10); // Scaled intensity
      tl.position.set(x, y + 1.2, z); tl.castShadow = true; parent.add(tl);
      torchesList.push({ flame, light: tl, baseIntensity: 1.2 * 100, idx: Math.random() * 20 });
    }
    // Fireplace light
    const fpLight = new THREE.PointLight(0xff6622, 1.5 * 100, 10);
    fpLight.position.set(-6, 1, 3); fpLight.castShadow = true; parent.add(fpLight);
    torchesList.push({ light: fpLight, baseIntensity: 1.5 * 100, idx: 7 });
    makeTorch(-6.5, 4, -2); makeTorch(-6.5, 4, 3);

    // TAPESTRY / ARMOR
    const banner = new THREE.Mesh(jitter(new THREE.PlaneGeometry(2, 3, 3, 4), 0.08), new THREE.MeshStandardMaterial({ color: C.green1, flatShading: true, side: THREE.DoubleSide }));
    banner.position.set(3, 5, -5.6); parent.add(banner);
    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.4, 6), new THREE.MeshStandardMaterial({ color: C.gold, flatShading: true }));
    emblem.position.set(3, 5.3, -5.55); parent.add(emblem);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), mat(C.woodDark));
    rod.rotation.z = Math.PI / 2; rod.position.set(3, 6.5, -5.6); parent.add(rod);

    const armor = new THREE.Group();
    armor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.15, 6), mat(C.woodDark)));
    const aPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 5), mat(C.woodDark));
    aPole.position.y = 1.75; armor.add(aPole);
    const aChest = new THREE.Mesh(jitter(new THREE.BoxGeometry(1, 1.2, 0.6, 2, 2, 1), 0.04), mat(C.stoneLight));
    aChest.position.y = 2.5; armor.add(aChest);
    const aHelm = new THREE.Mesh(jitter(new THREE.SphereGeometry(0.35, 5, 4), 0.03), mat(C.stoneLight));
    aHelm.position.y = 3.4; armor.add(aHelm);
    for (let s = -1; s <= 1; s += 2) {
      const sh = new THREE.Mesh(jitter(new THREE.SphereGeometry(0.25, 4, 3), 0.03), mat(C.stoneMid));
      sh.position.set(s * 0.65, 2.9, 0); sh.scale.x = 1.3; armor.add(sh);
    }
    armor.position.set(5.5, 0, -0.5); parent.add(armor);

    // LIGHTING
    parent.add(new THREE.AmbientLight(0x3a4a3a, 0.4 * Math.PI));
    const moonlight = new THREE.DirectionalLight(0x6688aa, 0.3 * Math.PI);
    moonlight.position.set(0, 8, -10); moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(1024, 1024);
    Object.assign(moonlight.shadow.camera, { near: 0.5, far: 25, left: -10, right: 10, top: 10, bottom: -2 });
    moonlight.shadow.camera.updateProjectionMatrix();
    parent.add(moonlight);
    const windowLight = new THREE.SpotLight(0x6688aa, 0.6 * 100, 15, Math.PI / 4, 0.5);
    windowLight.position.set(0, 6, -5.5); windowLight.target.position.set(0, 0, 2);
    parent.add(windowLight); parent.add(windowLight.target);

    return { group: parent, candles: candlesList, torches: torchesList };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    candles.forEach((c: any, i: number) => {
      c.light.intensity = 0.6 + Math.sin(t * 8 + i * 2) * 0.15 + Math.sin(t * 13 + i) * 0.1;
      c.flame.scale.y = 1.3 + Math.sin(t * 10 + i) * 0.3;
      c.flame.scale.x = 1 + Math.sin(t * 7 + i * 3) * 0.15;
    });
    torches.forEach((tc: any, i: number) => {
      tc.light.intensity = 1 + Math.sin(t * 6 + i * 4) * 0.3 + Math.sin(t * 11 + i * 2) * 0.15;
      if (tc.flame) {
        tc.flame.scale.y = 1.6 + Math.sin(t * 9 + i * 2) * 0.4;
        tc.flame.scale.x = 1 + Math.sin(t * 8 + i) * 0.2;
      }
    });
  });

  return (
    <>
      <color attach="background" args={[0x2a3a2a]} />
      <fogExp2 attach="fog" args={[0x2a3a2a, 0.015]} />
      <primitive object={group} />

      {/* Dynamic Objects */}
      {objects.slice(0, 5).map((obj, i) => (
        <DynamicObject key={obj.id} objectData={obj} position={BEDROOM_SLOTS[i]} />
      ))}
    </>
  );
}
