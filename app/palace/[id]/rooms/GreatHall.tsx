'use client';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mat, matMetal, jitter, addMesh, makeTorch, animateFlicker, FlickerItem } from './roomUtils';
import { DynamicObject } from '../DynamicObject';

const GREAT_HALL_SLOTS: [number, number, number][] = [
  [0, 5, -8],          // On the throne
  [-3, 2.5, 3],        // On the left banquet table
  [3, 2.5, 3],         // On the right banquet table
  [-7, 5, -2],         // On the left balcony
  [7, 5, -2]           // On the right balcony
];

export function GreatHall({ objects = [] }: { objects?: any[] }) {
  const { group, flickerLights } = useMemo(() => {
    const parent = new THREE.Group();
    const fl: any[] = [];

    const C = {
      stoneL: 0x8a7a5a, stoneM: 0x6a5a3a, stoneD: 0x4a3a20,
      wallBase: 0x5a4a30, wallD: 0x3a2a18,
      green1: 0x4a6a3a, green2: 0x3a5a2a, green3: 0x6a8a4a,
      wood: 0x5a4a3a, woodD: 0x3a2a1a, woodL: 0x6a5a4a,
      gold: 0x8a7a3a, goldL: 0xaa9a4a,
      fabric: 0x3a4a5a, red: 0x6a3a3a, redD: 0x4a2a2a,
      warm: 0xaa8a5a, candle: 0xffcc66, iron: 0x3a3a3a,
    };

    function mat(color: number, flat = true) {
      return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: 0.85, metalness: 0.05 });
    }
    function matMetal(color: number) {
      return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.4, metalness: 0.6 });
    }

    function jitter(geo: THREE.BufferGeometry, amt = 0.05) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        p.setX(i, p.getX(i) + (Math.random() - 0.5) * amt);
        p.setY(i, p.getY(i) + (Math.random() - 0.5) * amt);
        p.setZ(i, p.getZ(i) + (Math.random() - 0.5) * amt);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    const RW = 28, RH = 14, RD = 18;

    // FLOOR
    const floor = new THREE.Mesh(jitter(new THREE.BoxGeometry(RW, 0.5, RD, 8, 1, 6), 0.06), mat(C.stoneD));
    floor.position.y = -0.25; floor.receiveShadow = true; parent.add(floor);

    for (let ix = -6; ix <= 6; ix++) {
      for (let iz = -4; iz <= 4; iz++) {
        const sw = 1.6 + Math.random() * 0.4, sd = 1.6 + Math.random() * 0.4;
        const tile = new THREE.Mesh(jitter(new THREE.BoxGeometry(sw, 0.06, sd, 2, 1, 2), 0.02), mat((ix + iz) % 2 === 0 ? C.stoneM : C.stoneD));
        tile.position.set(ix * 2, 0.04, iz * 2); tile.receiveShadow = true; parent.add(tile);
      }
    }

    // WALLS WITH WINDOW OPENINGS
    const leftWinZ = [-5.5, -1.7, 2.1, 5.9];
    const winW = 2.5, winBot = 1.5, winTop = 12;

    function wallBox(w: number, h: number, d: number, x: number, y: number, z: number, c = C.wallBase) {
      const m = new THREE.Mesh(jitter(new THREE.BoxGeometry(w, h, d, Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2)), Math.max(1, Math.ceil(d / 2))), 0.05), mat(c));
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    }

    // Left wall
    {
      const wx = -RW / 2;
      const thick = 0.8;
      wallBox(thick, winBot, RD, wx, winBot / 2, 0);
      const topH = RH - winTop;
      wallBox(thick, topH, RD, wx, winTop + topH / 2, 0);

      const edges = [-RD / 2];
      leftWinZ.forEach(wz => { edges.push(wz - winW / 2); edges.push(wz + winW / 2); });
      edges.push(RD / 2);
      for (let i = 0; i < edges.length; i += 2) {
        const z0 = edges[i], z1 = edges[i + 1];
        const segD = z1 - z0;
        if (segD > 0.05) {
          const segH = winTop - winBot;
          wallBox(thick, segH, segD, wx, winBot + segH / 2, (z0 + z1) / 2);
        }
      }
    }

    // Right wall
    const rightWinZ = [-3, 3];
    {
      const wx = RW / 2;
      const thick = 0.8;
      wallBox(thick, winBot, RD, wx, winBot / 2, 0);
      const topH = RH - winTop;
      wallBox(thick, topH, RD, wx, winTop + topH / 2, 0);
      const edges = [-RD / 2];
      rightWinZ.forEach(wz => { edges.push(wz - winW / 2); edges.push(wz + winW / 2); });
      edges.push(RD / 2);
      for (let i = 0; i < edges.length; i += 2) {
        const z0 = edges[i], z1 = edges[i + 1];
        const segD = z1 - z0;
        if (segD > 0.05) {
          const segH = winTop - winBot;
          wallBox(thick, segH, segD, wx, winBot + segH / 2, (z0 + z1) / 2);
        }
      }
    }

    // Back wall
    const backWinX = [-5.5, 0, 5.5];
    {
      const wz = -RD / 2;
      const thick = 0.8;
      wallBox(RW, winBot, thick, 0, winBot / 2, wz);
      const topH = RH - winTop;
      wallBox(RW, topH, thick, 0, winTop + topH / 2, wz);
      const edges = [-RW / 2];
      backWinX.forEach(bx => { edges.push(bx - winW / 2); edges.push(bx + winW / 2); });
      edges.push(RW / 2);
      for (let i = 0; i < edges.length; i += 2) {
        const x0 = edges[i], x1 = edges[i + 1];
        const segW = x1 - x0;
        if (segW > 0.05) {
          const segH = winTop - winBot;
          wallBox(segW, segH, thick, (x0 + x1) / 2, winBot + segH / 2, wz);
        }
      }
    }

    // GOTHIC WINDOW DRESSING
    function makeGothicWindow(x: number, y: number, z: number, ry: number) {
      const g = new THREE.Group();
      const wH = winTop - winBot;

      for (let s = -1; s <= 1; s += 2) {
        const archSide = new THREE.Mesh(
          jitter(new THREE.BoxGeometry(winW / 2 + 0.15, 0.3, 0.5, 2, 1, 1), 0.02), mat(0x6a5a3a));
        archSide.position.set(s * winW / 4, wH - 0.3, 0);
        archSide.rotation.z = s * 0.45; g.add(archSide);
      }
      const keystone = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.4, 0.5, 0.35), 0.03), mat(0x7a6a4a));
      keystone.position.set(0, wH + 0.3, 0); g.add(keystone);

      for (let s = -1; s <= 1; s += 2) {
        const col = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.12, 0.15, wH, 6, 4), 0.03), mat(0x6a5a3a));
        col.position.set(s * (winW / 2 + 0.1), wH / 2, 0.2); g.add(col);
        const cap = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.45, 0.25, 0.35), 0.02), mat(0x7a6a4a));
        cap.position.set(s * (winW / 2 + 0.1), wH + 0.05, 0.2); g.add(cap);
      }

      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, wH, 0.12), mat(0x5a4a30));
      mullion.position.set(0, wH / 2, 0.2); g.add(mullion);

      for (let ty = 0; ty < 3; ty++) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.2, 0.08, 0.1), mat(0x5a4a30));
        t.position.set(0, 1.5 + ty * 2.8, 0.2); g.add(t);
      }

      const sky = new THREE.Mesh(
        new THREE.PlaneGeometry(winW - 0.2, wH - 0.2),
        new THREE.MeshBasicMaterial({ color: 0x070b16, side: THREE.DoubleSide })
      );
      sky.position.set(0, wH / 2, -0.1); g.add(sky);

      for (let si = 0; si < 15; si++) {
        const star = new THREE.Mesh(
          new THREE.CircleGeometry(0.02 + Math.random() * 0.04, 4),
          new THREE.MeshBasicMaterial({ color: 0xeeeeff })
        );
        star.position.set((Math.random() - 0.5) * (winW - 0.6), 0.5 + Math.random() * (wH - 1), 0.02);
        g.add(star);
      }

      if (Math.random() > 0.6) {
        const moon = new THREE.Mesh(new THREE.CircleGeometry(0.35, 7), new THREE.MeshBasicMaterial({ color: 0xddeeff }));
        moon.position.set(0.3, wH - 1.5, 0.02); g.add(moon);
      }

      const sill = new THREE.Mesh(jitter(new THREE.BoxGeometry(winW + 0.8, 0.25, 0.8, 2, 1, 1), 0.03), mat(0x7a6a4a));
      sill.position.y = -0.1; sill.castShadow = true; g.add(sill);

      const wLight = new THREE.SpotLight(0x3355aa, 0.3 * 100, 10, Math.PI / 5, 0.7);
      wLight.position.set(0, wH / 2, -0.5);
      const tgt = new THREE.Object3D();
      tgt.position.set(0, 0, 6);
      g.add(tgt); wLight.target = tgt; g.add(wLight);

      g.position.set(x, y, z); g.rotation.y = ry;
      parent.add(g);
    }

    leftWinZ.forEach(wz => makeGothicWindow(-RW / 2 + 0.4, winBot, wz, Math.PI / 2));
    rightWinZ.forEach(wz => makeGothicWindow(RW / 2 - 0.4, winBot, wz, -Math.PI / 2));
    backWinX.forEach(bx => makeGothicWindow(bx, winBot, -RD / 2 + 0.4, 0));

    // WALL BRICKS (avoiding window openings)
    const warmColors = [0x6a5a3a, 0x7a6a4a, 0x5a4a2a, 0x8a7a5a, 0x6a5a40, 0x4a3a2a, 0x7a6a3a];
    for (let w = 0; w < 3; w++) {
      for (let i = 0; i < 30; i++) {
        const bw = 0.8 + Math.random() * 1.8, bh = 0.3 + Math.random() * 0.7;
        let bx = 0, by = 0, bz = 0;
        by = 0.5 + Math.random() * (RH - 1);
        if (w === 0) { bx = (Math.random() - 0.5) * (RW - 2); bz = -RD / 2 + 0.5; }
        else if (w === 1) { bz = (Math.random() - 0.5) * (RD - 2); bx = -RW / 2 + 0.5; }
        else { bz = (Math.random() - 0.5) * (RD - 2); bx = RW / 2 - 0.5; }

        let blocked = false;
        if (by >= winBot && by <= winTop) {
          const wins = w === 0 ? backWinX : w === 1 ? leftWinZ : rightWinZ;
          const coord = w === 0 ? bx : bz;
          for (const wc of wins) {
            if (coord > wc - winW / 2 - 0.3 && coord < wc + winW / 2 + 0.3) { blocked = true; break; }
          }
        }
        if (blocked) continue;
        const bg = jitter(new THREE.BoxGeometry(bw, bh, 0.18, 2, 1, 1), 0.02);
        const b = new THREE.Mesh(bg, mat(warmColors[i % 7] as number));
        b.position.set(bx, by, bz);
        if (w >= 1) b.rotation.y = Math.PI / 2;
        b.receiveShadow = true; parent.add(b);
      }
    }

    // CEILING
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.4, RD), mat(C.wallD));
    ceil.position.y = RH + 0.2; parent.add(ceil);

    for (let z = -7; z <= 7; z += 2.8) {
      const beam = new THREE.Mesh(jitter(new THREE.BoxGeometry(RW - 2, 0.6, 0.5, 6, 1, 1), 0.05), mat(C.woodD));
      beam.position.set(0, RH - 0.3, z); beam.castShadow = true; parent.add(beam);
    }
    for (let x = -10; x <= 10; x += 5) {
      const cb = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.4, 0.5, RD - 2, 1, 1, 5), 0.04), mat(C.woodD));
      cb.position.set(x, RH - 0.6, 0); parent.add(cb);
    }

    // PILLARS
    function makePillar(x: number, z: number) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.4, 0.6, 1.4, 2, 1, 2), 0.04), mat(C.stoneL));
      base.position.y = 0.3; g.add(base);
      const shaft = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.45, 0.5, RH - 2, 7, 6), 0.06), mat(C.stoneM));
      shaft.position.y = RH / 2; shaft.castShadow = true; g.add(shaft);
      const cap = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.6, 0.8, 1.6, 2, 1, 2), 0.04), mat(C.stoneL));
      cap.position.y = RH - 0.6; g.add(cap);
      const corbel = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.2, 0.4, 1.2, 2, 1, 2), 0.03), mat(C.stoneD));
      corbel.position.y = RH - 1.2; g.add(corbel);
      g.position.set(x, 0, z); parent.add(g);
    }
    for (let z = -6; z <= 6; z += 4) { makePillar(-8, z); makePillar(8, z); }

    // DAIS
    const dais = new THREE.Mesh(jitter(new THREE.BoxGeometry(16, 0.6, 5, 6, 1, 3), 0.06), mat(C.stoneL));
    dais.position.set(0, 0.3, -7); dais.receiveShadow = true; dais.castShadow = true; parent.add(dais);
    const step = new THREE.Mesh(jitter(new THREE.BoxGeometry(18, 0.3, 1, 6, 1, 1), 0.04), mat(C.stoneM));
    step.position.set(0, 0.15, -4.2); step.receiveShadow = true; parent.add(step);

    // TABLES
    function makeTable(px: number, pz: number, tw: number, td: number) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(jitter(new THREE.BoxGeometry(tw, 0.2, td, Math.ceil(tw), 1, Math.ceil(td)), 0.04), mat(C.wood));
      top.position.y = 1.6; top.castShadow = true; top.receiveShadow = true; g.add(top);
      for (let e = -1; e <= 1; e += 2) {
        const tr = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.3, 1.5, td * 0.8, 1, 2, 2), 0.04), mat(C.woodD));
        tr.position.set(e * (tw / 2 - 0.5), 0.8, 0); tr.castShadow = true; g.add(tr);
        const ft = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.5, 0.2, td * 0.9, 1, 1, 2), 0.03), mat(C.woodD));
        ft.position.set(e * (tw / 2 - 0.5), 0.1, 0); g.add(ft);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(tw - 1.2, 0.2, 0.15), mat(C.woodD));
      bar.position.y = 0.6; g.add(bar);
      g.position.set(px, 0, pz); parent.add(g);
    }
    makeTable(0, 0, 16, 2.4);
    makeTable(0, -7, 12, 2);

    // THRONES
    function makeThrone(x: number, z: number, scale = 1) {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.4, 0.15, 1.2, 2, 1, 2), 0.03), mat(C.woodD));
      seat.position.y = 1.2; g.add(seat);
      const cush = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.2, 0.2, 1, 2, 1, 2), 0.04), mat(C.red));
      cush.position.y = 1.4; g.add(cush);
      const back = new THREE.Mesh(jitter(new THREE.BoxGeometry(1.4, 3, 0.2, 2, 3, 1), 0.05), mat(C.woodD));
      back.position.set(0, 2.7, -0.5); back.castShadow = true; g.add(back);
      const panel = new THREE.Mesh(jitter(new THREE.BoxGeometry(1, 2, 0.1, 2, 2, 1), 0.03), mat(C.red));
      panel.position.set(0, 2.5, -0.38); g.add(panel);
      for (let i = -1; i <= 1; i++) {
        const spike = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.2, 0.5, 0.15, 1, 2, 1), 0.03), mat(C.gold));
        spike.position.set(i * 0.35, 4.4, -0.5); g.add(spike);
      }
      for (let s = -1; s <= 1; s += 2) {
        const arm = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.2, 0.8, 1.2, 1, 2, 2), 0.03), mat(C.woodD));
        arm.position.set(s * 0.8, 1.6, 0); g.add(arm);
      }
      for (let sx = -1; sx <= 1; sx += 2) {
        for (let sz = -1; sz <= 1; sz += 2) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), mat(C.woodD));
          leg.position.set(sx * 0.55, 0.6, sz * 0.45); g.add(leg);
        }
      }
      g.scale.setScalar(scale);
      g.position.set(x, 0.6, z); parent.add(g);
    }
    makeThrone(0, -7.5, 1.15);
    makeThrone(-3, -7.5, 0.9);
    makeThrone(3, -7.5, 0.9);

    // BENCHES
    function makeBench(x: number, z: number, bw: number) {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(jitter(new THREE.BoxGeometry(bw, 0.15, 0.7, Math.ceil(bw), 1, 1), 0.03), mat(C.wood));
      seat.position.y = 0.9; seat.castShadow = true; g.add(seat);
      for (let e = -1; e <= 1; e += 2) {
        const leg = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.2, 0.85, 0.6, 1, 2, 1), 0.03), mat(C.woodD));
        leg.position.set(e * (bw / 2 - 0.4), 0.45, 0); g.add(leg);
      }
      g.position.set(x, 0, z); parent.add(g);
    }
    makeBench(0, 1.8, 14);
    makeBench(0, -1.8, 14);

    // TABLE ITEMS
    function makePlate(x: number, y: number, z: number) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.06, 7), mat(C.stoneL));
      plate.position.set(x, y, z); parent.add(plate);
    }
    function makeGoblet(x: number, y: number, z: number) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 6), matMetal(C.gold)));
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 5), matMetal(C.gold));
      stem.position.y = 0.12; g.add(stem);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.2, 6), matMetal(C.goldL));
      cup.position.y = 0.3; g.add(cup);
      g.position.set(x, y, z); parent.add(g);
    }
    for (let i = -6; i <= 6; i += 1.5) {
      makePlate(i, 1.72, 0.4); makePlate(i, 1.72, -0.4);
      if (Math.random() > 0.4) makeGoblet(i + 0.4, 1.72, 0.5);
      if (Math.random() > 0.4) makeGoblet(i - 0.4, 1.72, -0.5);
    }
    for (let i = -4; i <= 4; i += 1.5) {
      makePlate(i, 2.32, -6.7); makeGoblet(i + 0.35, 2.32, -6.5);
    }
    for (let i = -5; i <= 5; i += 3.3) {
      const platter = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.5, 0.45, 0.08, 6), 0.02), matMetal(C.warm));
      platter.position.set(i, 1.76, 0); parent.add(platter);
      const food = new THREE.Mesh(jitter(new THREE.SphereGeometry(0.3, 4, 3), 0.06), mat(C.woodL));
      food.position.set(i, 1.9, 0); food.scale.y = 0.6; parent.add(food);
    }

    // BANNERS
    function makeBanner(x: number, z: number, ry = 0, color = C.green1) {
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), mat(C.woodD));
      rod.rotation.z = Math.PI / 2; g.add(rod);
      const cloth = new THREE.Mesh(
        jitter(new THREE.PlaneGeometry(2, 4, 3, 5), 0.1),
        new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide })
      );
      cloth.position.y = -2.2; g.add(cloth);
      const emb = new THREE.Mesh(new THREE.CircleGeometry(0.45, 6), new THREE.MeshStandardMaterial({ color: C.gold, flatShading: true }));
      emb.position.set(0, -1.6, 0.05); g.add(emb);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 0.05), mat(C.goldL));
      trim.position.y = -4.2; g.add(trim);
      const point = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0, 0.3, 0.8, 3), 0.03),
        new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
      point.position.y = -4.6; point.rotation.y = Math.PI / 6; g.add(point);
      g.position.set(x, RH - 2, z); g.rotation.y = ry; parent.add(g);
    }
    const bannerColors = [C.green1, C.red, C.green2, C.fabric];
    for (let i = 0; i < 4; i++) {
      makeBanner(-8, -5 + i * 3.5, Math.PI / 2, bannerColors[i % 4]);
      makeBanner(8, -5 + i * 3.5, -Math.PI / 2, bannerColors[i % 4]);
    }
    makeBanner(-5, -RD / 2 + 1.5, 0, C.red);
    makeBanner(5, -RD / 2 + 1.5, 0, C.red);
    makeBanner(0, -RD / 2 + 1.5, 0, C.green1);

    // CHANDELIERS
    function makeChandelier(x: number, z: number) {
      const g = new THREE.Group();
      for (let cy = 0; cy < 4; cy++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 5), matMetal(C.iron));
        link.position.y = cy * 0.3; link.rotation.x = cy % 2 === 0 ? 0 : Math.PI / 2; g.add(link);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 8), matMetal(C.iron));
      ring.position.y = -0.8; ring.rotation.x = Math.PI / 2; g.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 5, 7), matMetal(C.iron));
      ring2.position.y = -0.8; ring2.rotation.x = Math.PI / 2; g.add(ring2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), matMetal(C.iron));
        spoke.position.set(Math.cos(a) * 0.6, -0.8, Math.sin(a) * 0.6); spoke.rotation.y = -a; g.add(spoke);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, cx = Math.cos(a) * 1.2, cz = Math.sin(a) * 1.2;
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 5), matMetal(C.gold));
        h.position.set(cx, -0.7, cz); g.add(h);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 5), mat(0xddd8c8));
        c.position.set(cx, -0.48, cz); g.add(c);
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 3, 3), new THREE.MeshBasicMaterial({ color: C.candle }));
        f.scale.y = 1.5; f.position.set(cx, -0.27, cz); g.add(f);
        fl.push({ flame: f, idx: i });
      }
      g.position.set(x, RH - 0.5, z); parent.add(g);
      const pl = new THREE.PointLight(0xffaa44, 2.5 * 100, 18);
      pl.position.set(x, RH - 2, z); pl.castShadow = true; pl.shadow.mapSize.set(512, 512); parent.add(pl);
      fl.push({ light: pl, baseIntensity: 2.5 * 100, idx: Math.random() * 10 });
    }
    makeChandelier(0, -2);
    makeChandelier(0, 3);

    // WALL TORCHES
    function makeTorch(x: number, y: number, z: number, ry = 0) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(jitter(new THREE.BoxGeometry(0.2, 0.5, 0.35, 1, 2, 1), 0.02), matMetal(C.iron)));
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 5), mat(C.woodD));
      stick.position.y = 0.55; g.add(stick);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff9933 }));
      flame.scale.y = 1.8; flame.position.y = 1.05; g.add(flame);
      g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
      const tl = new THREE.PointLight(0xff8822, 1.2 * 100, 10);
      tl.position.set(x, y + 1.3, z); tl.castShadow = true; parent.add(tl);
      fl.push({ flame, light: tl, baseIntensity: 1.2 * 100, idx: Math.random() * 20 });
    }
    for (let z = -6; z <= 6; z += 4) {
      makeTorch(-RW / 2 + 0.6, 5, z, Math.PI / 2);
      makeTorch(RW / 2 - 0.6, 5, z, -Math.PI / 2);
    }
    makeTorch(-8, 5, -RD / 2 + 0.6, 0);
    makeTorch(8, 5, -RD / 2 + 0.6, 0);

    // FIREPLACE
    const fp = new THREE.Group();
    const fpSurround = new THREE.Mesh(jitter(new THREE.BoxGeometry(5, 5, 1.2, 3, 3, 1), 0.08), mat(C.stoneD));
    fpSurround.position.y = 2.5; fp.add(fpSurround);
    const fpOpen = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 1.3), mat(0x1a1a1a));
    fpOpen.position.y = 1.5; fp.add(fpOpen);
    const mantel = new THREE.Mesh(jitter(new THREE.BoxGeometry(6, 0.4, 1.5, 3, 1, 1), 0.05), mat(C.stoneL));
    mantel.position.y = 5.2; mantel.castShadow = true; fp.add(mantel);
    const fpKey = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.8, 0.6, 0.3), 0.04), mat(C.stoneL));
    fpKey.position.set(0, 4.8, 0.5); fp.add(fpKey);
    const fireGlow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 4, 3), new THREE.MeshBasicMaterial({ color: 0xff6622 }));
    fireGlow.position.set(0, 0.8, 0); fireGlow.scale.set(1.5, 1, 1); fp.add(fireGlow);
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.15, 0.18, 1.8, 5), 0.04), mat(C.woodD));
      log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      log.position.set((Math.random() - 0.5) * 0.5, 0.4 + i * 0.2, (Math.random() - 0.5) * 0.2); fp.add(log);
    }
    fp.position.set(RW / 2 - 0.6, 0, 0); fp.rotation.y = -Math.PI / 2; parent.add(fp);
    const fpLight = new THREE.PointLight(0xff6622, 2 * 100, 12);
    fpLight.position.set(RW / 2 - 2, 2, 0); fpLight.castShadow = true; parent.add(fpLight);
    fl.push({ light: fpLight, baseIntensity: 2 * 100, idx: 7 });
    const chimney = new THREE.Mesh(jitter(new THREE.BoxGeometry(4, 8, 1, 2, 4, 1), 0.06), mat(C.stoneD));
    chimney.position.set(RW / 2 - 0.5, 9, 0); parent.add(chimney);

    // SHIELDS & SWORDS
    function makeShield(x: number, y: number, z: number) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(jitter(new THREE.CircleGeometry(0.6, 6), 0.04),
        new THREE.MeshStandardMaterial({ color: [C.green1, C.red, C.fabric][Math.floor(Math.random() * 3)], flatShading: true, side: THREE.DoubleSide })));
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), matMetal(C.gold));
      boss.position.z = 0.05; g.add(boss);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 4, 6), matMetal(C.iron)));
      g.position.set(x, y, z); parent.add(g);
    }
    function makeSwords(x: number, y: number, z: number) {
      for (let s = -1; s <= 1; s += 2) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 0.03), matMetal(C.stoneL));
        sw.position.set(x, y, z); sw.rotation.z = s * 0.4; parent.add(sw);
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.05), matMetal(C.gold));
        hilt.position.set(x - s * 0.35, y - 0.85, z); hilt.rotation.z = s * 0.4; parent.add(hilt);
      }
    }
    makeShield(-8, 8, -RD / 2 + 0.7); makeSwords(-8, 8, -RD / 2 + 0.6);
    makeShield(8, 8, -RD / 2 + 0.7); makeSwords(8, 8, -RD / 2 + 0.6);

    // Deer head
    const dh = new THREE.Group();
    dh.add(new THREE.Mesh(jitter(new THREE.CircleGeometry(0.7, 6), 0.03),
      new THREE.MeshStandardMaterial({ color: C.woodD, flatShading: true, side: THREE.DoubleSide })));
    const skull = new THREE.Mesh(jitter(new THREE.BoxGeometry(0.5, 0.6, 0.5, 2, 2, 1), 0.05), mat(C.stoneL));
    skull.position.z = 0.3; dh.add(skull);
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const a = new THREE.Mesh(jitter(new THREE.CylinderGeometry(0.02, 0.04, 0.6, 4), 0.02), mat(C.warm));
        a.position.set(s * (0.2 + i * 0.15), 0.4 + i * 0.25, 0.3);
        a.rotation.z = s * (0.3 + i * 0.2); a.rotation.x = -0.2; dh.add(a);
      }
    }
    dh.position.set(RW / 2 - 0.4, 7.5, 0); dh.rotation.y = -Math.PI / 2; parent.add(dh);

    // NIGHT SKY BOX (visible outside windows)
    const skyGeo = new THREE.BoxGeometry(RW + 20, RH + 20, RD + 20);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x070b16, side: THREE.BackSide });
    const skyBox = new THREE.Mesh(skyGeo, skyMat);
    skyBox.position.y = RH / 2; parent.add(skyBox);

    // LIGHTING
    parent.add(new THREE.AmbientLight(0x2a2a1a, 0.3 * Math.PI));
    const moon = new THREE.DirectionalLight(0x5577aa, 0.15 * Math.PI);
    moon.position.set(-20, 12, 5); moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    Object.assign(moon.shadow.camera, { near: 1, far: 50, left: -20, right: 20, top: 16, bottom: -2 });
    moon.shadow.camera.updateProjectionMatrix();
    parent.add(moon);

    return { group: parent, flickerLights: fl };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    flickerLights.forEach((f: any) => {
      const n = f.idx || 0;
      if (f.light) {
        const b = f.baseIntensity || 1;
        f.light.intensity = b + Math.sin(t * 7 + n) * b * 0.15 + Math.sin(t * 13 + n * 2) * b * 0.1;
      }
      if (f.flame) {
        f.flame.scale.y = 1.5 + Math.sin(t * 9 + n) * 0.35;
        f.flame.scale.x = 1 + Math.sin(t * 7 + n * 3) * 0.2;
      }
    });
  });

  return (
    <>
      <color attach="background" args={[0x0a0e18]} />
      <fogExp2 attach="fog" args={[0x1e2e1e, 0.008]} />
      <primitive object={group} />

      {/* Dynamic Objects */}
      {objects.slice(0, 5).map((obj, i) => (
        <DynamicObject key={obj.id} objectData={obj} position={GREAT_HALL_SLOTS[i]} />
      ))}
    </>
  );
}
