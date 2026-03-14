'use client';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mat, matMetal, glow, jitter, addMesh, makeTorch, animateFlicker, FlickerItem } from './roomUtils';
import { DynamicObject } from '../DynamicObject';

const DUNGEON_SLOTS: [number, number, number][] = [
  [-2, 3.5, 0.5],       // Above the well
  [-4.5, 3, -3.5],      // On the alchemist's desk
  [4.5, 3, -3.5],       // Near the weapon rack
  [0, 4.5, -4.3],       // In front of the runic gate
  [3.5, 4.5, 2]         // Near the hanging cage
];

export function Dungeon({ objects = [], activeObjectIdx = -1, onCloseObject, onObjectOpen, onObjectClose, mode = 'learn' }: { objects?: any[]; activeObjectIdx?: number; onCloseObject?: () => void; onObjectOpen?: (id: string) => void; onObjectClose?: (id: string) => void; mode?: 'learn' | 'test' }) {
  const { group, fl } = useMemo(() => {
    const p = new THREE.Group();
    const fl: (FlickerItem & { isRune?: boolean; f2?: THREE.Mesh })[] = [];
    const C = {
      sL:0x8a7a6a, sM:0x5a4a3e, sD:0x3a3030, sDD:0x2a2222,
      w:0x5a3a28, wD:0x3a2218, wL:0x6a4a32, wM:0x4a3020,
      ir:0x2e2e30, irR:0x5a3a2a, brass:0x8a7a4a,
      bone:0xd0c8a8, skull:0xc8c0a0,
      gold:0xaa8a3a, goldL:0xccaa4a,
      potR:0xaa2222, potG:0x22aa44, potB:0x3344cc,
      parch:0xb8a878, leather:0x5a3a2a,
      runeB:0x5577dd,
    };
    const RW = 14, RH = 7, RD = 10;
    const A = (geo: THREE.BufferGeometry, material: THREE.Material, x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,par?: THREE.Object3D) => addMesh(geo,material,x,y,z,rx,ry,rz,sx,sy,sz,par||p);

    // ====== FLOOR ======
    A(jitter(new THREE.BoxGeometry(RW,.4,RD,5,1,4),.06),mat(C.sDD),0,-.2,0);
    for(let ix=-3;ix<=3;ix++)for(let iz=-2;iz<=2;iz++){
      A(jitter(new THREE.BoxGeometry(1.8+Math.random()*.3,.07,1.8+Math.random()*.3,2,1,2),.02),
        mat((ix+iz)%2===0?0x2e2828:0x252020),ix*2,.04,iz*2);
    }

    // ====== WALLS ======
    A(jitter(new THREE.BoxGeometry(RW,RH,.7,5,3,1),.07),mat(C.sD),0,RH/2,-RD/2);
    A(jitter(new THREE.BoxGeometry(.7,RH,RD,1,3,4),.07),mat(C.sD),-RW/2,RH/2,0);
    A(jitter(new THREE.BoxGeometry(.7,RH,RD,1,3,4),.07),mat(C.sD),RW/2,RH/2,0);
    A(new THREE.BoxGeometry(RW,.3,RD),mat(C.wD),0,RH+.15,0);

    // Stone bricks
    for(let w=0;w<3;w++)for(let i=0;i<30;i++){
      let bx=0, by=0, bz=0, bry=0;
      by=.3+Math.random()*(RH-1);
      if(w===0){bx=(Math.random()-.5)*(RW-2);bz=-RD/2+.46;}
      else if(w===1){bz=(Math.random()-.5)*(RD-2);bx=-RW/2+.46;bry=Math.PI/2;}
      else{bz=(Math.random()-.5)*(RD-2);bx=RW/2-.46;bry=Math.PI/2;}
      A(jitter(new THREE.BoxGeometry(.9+Math.random()*1.2,.3+Math.random()*.35,.13,2,1,1),.02),
        mat([0x3a3032,0x4a3a3a,0x2a2528,0x3a3538,0x4a4040][i%5]),bx,by,bz,0,bry);
    }

    // Water stains / mold
    for(let i=0;i<6;i++){
      A(new THREE.BoxGeometry(.9+Math.random(),.7+Math.random()*.4,.06),
        new THREE.MeshStandardMaterial({color:0x1a2a1a,flatShading:true,transparent:true,opacity:.18,roughness:1}),
        (Math.random()-.5)*(RW-.5),.4+Math.random()*1.2,-RD/2+.52);
    }

    // Ceiling beams
    for(let z=-4;z<=4;z+=2.5)A(jitter(new THREE.BoxGeometry(RW-.5,.5,.45,5,1,1),.04),mat(C.wD),0,RH-.15,z);
    for(let x=-5;x<=5;x+=3.3)A(jitter(new THREE.BoxGeometry(.45,.45,RD-.5,1,1,4),.04),mat(C.wD),x,RH-.35,0);

    // ====== FLOOR GRATES ======
    function mkGrate(gx: number, gz: number) {
      const g = new THREE.Group();
      A(new THREE.BoxGeometry(1.2,.07,.85),matMetal(C.ir),0,0,0,0,0,0,1,1,1,g);
      for(let i=-4;i<=4;i++)A(new THREE.BoxGeometry(.035,.09,.8),matMetal(0x0e0e0e),i*.12,0,0,0,0,0,1,1,1,g);
      for(let j=-2;j<=2;j++)A(new THREE.BoxGeometry(1.1,.09,.035),matMetal(0x0e0e0e),0,0,j*.25,0,0,0,1,1,1,g);
      g.position.set(gx,.03,gz); p.add(g);
    }
    mkGrate(-3.5,0); mkGrate(3.5,0);

    // ====== WALL TORCHES ======
    // Custom torch with intensity 1.3 and range 7
    const tI = 1.3 * 100, tR = 7;
    // Back wall
    makeTorch(p,fl,-4,3.5,-RD/2+.5,0,C.ir,tI,tR);
    makeTorch(p,fl,0,3.5,-RD/2+.5,0,C.ir,tI,tR);
    makeTorch(p,fl,4,3.5,-RD/2+.5,0,C.ir,tI,tR);
    // Side walls
    makeTorch(p,fl,-RW/2+.5,3.5,-2.5,Math.PI/2,C.ir,tI,tR);
    makeTorch(p,fl,-RW/2+.5,3.5,2.5,Math.PI/2,C.ir,tI,tR);
    makeTorch(p,fl,RW/2-.5,3.5,-2.5,-Math.PI/2,C.ir,tI,tR);
    makeTorch(p,fl,RW/2-.5,3.5,2.5,-Math.PI/2,C.ir,tI,tR);

    // ====== ALCHEMIST'S STATION (Left wall) ======
    {
      const al = new THREE.Group();
      // Big chunky desk
      const deskW=3.2, deskD=1.2, deskH=1.4;
      A(jitter(new THREE.BoxGeometry(deskW,.14,deskD,3,1,2),.02),mat(C.w),0,deskH,0,0,0,0,1,1,1,al);
      // Thick legs
      for(const lx of[-1.3,1.3])for(const lz of[-.4,.4])
        A(jitter(new THREE.BoxGeometry(.14,deskH,.14),.02),mat(C.wD),lx,deskH/2,lz,0,0,0,1,1,1,al);
      // Cross braces
      A(new THREE.BoxGeometry(2.4,.1,.1),mat(C.wD),0,.45,-.4,0,0,0,1,1,1,al);
      A(new THREE.BoxGeometry(2.4,.1,.1),mat(C.wD),0,.45,.4,0,0,0,1,1,1,al);
      // Drawer
      A(new THREE.BoxGeometry(.6,.2,.05),mat(C.wM),0,1.1,.62,0,0,0,1,1,1,al);
      A(new THREE.BoxGeometry(.08,.04,.06),matMetal(C.brass),0,1.1,.65,0,0,0,1,1,1,al);

      // Big shelf above
      A(jitter(new THREE.BoxGeometry(3.4,.1,.5,3,1,1),.01),mat(C.w),0,3.2,-.35,0,0,0,1,1,1,al);
      // Shelf supports
      for(const s of[-1.2,0,1.2]){
        A(new THREE.BoxGeometry(.1,.6,.08),matMetal(C.ir),s,2.9,-.35,0,0,0,1,1,1,al);
        // Decorative triangle bracket
        const tri = new THREE.Shape();
        tri.moveTo(0,0); tri.lineTo(.15,0); tri.lineTo(0,-.3); tri.closePath();
        const bk = new THREE.Mesh(new THREE.ShapeGeometry(tri), matMetal(C.ir));
        bk.position.set(s+.05,2.65,-.12); bk.castShadow=true; bk.receiveShadow=true; al.add(bk);
      }

      // Potion bottles
      const mkBottle = (bx: number, col: number) => {
        const b = new THREE.Group();
        A(new THREE.CylinderGeometry(.08,.08,.28,5),
          new THREE.MeshStandardMaterial({color:col,flatShading:true,roughness:.3,metalness:.1,transparent:true,opacity:.85}),
          0,.14,0,0,0,0,1,1,1,b);
        A(new THREE.CylinderGeometry(.035,.065,.08,4),
          new THREE.MeshStandardMaterial({color:col,flatShading:true,roughness:.3,transparent:true,opacity:.85}),
          0,.3,0,0,0,0,1,1,1,b);
        A(new THREE.CylinderGeometry(.04,.04,.05,4),mat(C.wD),0,.36,0,0,0,0,1,1,1,b);
        b.position.set(bx,3.26,-.35); al.add(b);
      }
      mkBottle(-1.2,C.potR); mkBottle(-.7,C.potG); mkBottle(-.2,C.potB);
      mkBottle(.4,C.potG); mkBottle(.9,C.potR); mkBottle(1.3,0x7744aa);

      // Skull inkwell
      const sk = new THREE.Group();
      A(jitter(new THREE.SphereGeometry(.18,5,4),.03),mat(C.skull),0,.16,0,0,0,0,1,1,1,sk);
      A(new THREE.BoxGeometry(.18,.07,.14),mat(C.skull),0,-.02,.04,0,0,0,1,1,1,sk);
      // Eyes
      A(new THREE.SphereGeometry(.04,3,2),glow(0x0a0a0a),-.06,.18,.15,0,0,0,1,1,1,sk);
      A(new THREE.SphereGeometry(.04,3,2),glow(0x0a0a0a),.06,.18,.15,0,0,0,1,1,1,sk);
      // Nose
      A(new THREE.BoxGeometry(.04,.04,.03),glow(0x0a0a0a),0,.12,.16,0,0,0,1,1,1,sk);
      // Teeth
      for(let t=-2;t<=2;t++)A(new THREE.BoxGeometry(.025,.025,.02),mat(0xbbbb99),t*.03,.02,.15,0,0,0,1,1,1,sk);
      // Quill
      A(new THREE.BoxGeometry(.02,.4,.015),mat(C.parch),.08,.32,0,0,0,-.45,1,1,1,sk);
      A(new THREE.BoxGeometry(.06,.12,.01),mat(0xdddddd),.2,.4,0,0,0,-.45,1,1,1,sk);
      sk.position.set(.9,deskH+.01,.2); al.add(sk);

      // Scrolls
      for(let i=0;i<5;i++){
        A(new THREE.CylinderGeometry(.04,.04,.35,6),mat(i%2?C.parch:0xa89868),
          -.8+i*.1,deskH+.05+i*.08,-.25,0,0,Math.PI/2+i*.15,1,1,1,al);
      }
      // Unrolled scroll
      A(new THREE.BoxGeometry(.5,.01,.35),mat(C.parch),-.3,deskH+.02,.2,0,.2,0,1,1,1,al);
      A(new THREE.CylinderGeometry(.035,.035,.35,5),mat(C.parch),-.55,deskH+.04,.2,Math.PI/2,0,0,1,1,1,al);

      // Mortar & pestle
      A(new THREE.CylinderGeometry(.12,.09,.15,6),mat(C.sM),.3,deskH+.08,.3,0,0,0,1,1,1,al);
      A(new THREE.CylinderGeometry(.02,.015,.25,4),mat(C.sL),.33,deskH+.2,.3,0,0,.45,1,1,1,al);

      // Oil lamp
      const lamp = new THREE.Group();
      A(new THREE.CylinderGeometry(.05,.06,.05,5),matMetal(C.irR),0,.025,0,0,0,0,1,1,1,lamp);
      A(jitter(new THREE.SphereGeometry(.07,4,3),.01),matMetal(C.irR),0,.09,0,0,0,0,1,.8,1,lamp);
      A(new THREE.BoxGeometry(.09,.03,.03),matMetal(C.irR),.08,.12,0,0,0,0,1,1,1,lamp);
      A(new THREE.CylinderGeometry(.01,.01,.06,3),matMetal(C.brass),0,.15,0,0,0,0,1,1,1,lamp);
      lamp.position.set(-1.1,deskH+.01,.25); al.add(lamp);

      // Candles on desk
      for(let i=0;i<3;i++){
        const cx=.1+i*.2, h=.12+Math.random()*.18;
        A(new THREE.CylinderGeometry(.02,.025,h,5),mat(0xcacab0),cx,deskH+h/2+.01,-.05,0,0,0,1,1,1,al);
        const cf=A(new THREE.SphereGeometry(.02,3,3),glow(0xffcc44),cx,deskH+h+.03,-.05,0,0,0,1,1.8,1,al);
        fl.push({flame:cf,idx:70+i});
      }

      al.position.set(-4.5,0,-3.5); p.add(al);
      const aL=new THREE.PointLight(0xffaa44,.7 * 100,5); aL.position.set(-4.5,2.5,-3); p.add(aL);
    }

    // ====== ANCIENT WELL (Center-Left) ======
    {
      const wl = new THREE.Group();
      // Rim
      A(jitter(new THREE.CylinderGeometry(.9,.9,.5,8),.04),mat(C.sL),0,.28,0,0,0,0,1,1,1,wl);
      A(jitter(new THREE.CylinderGeometry(1,1,.22,8),.03),mat(C.sM),0,.11,0,0,0,0,1,1,1,wl);
      // Dark hole
      A(new THREE.CylinderGeometry(.65,.65,.2,8),glow(0x030303),0,.22,0,0,0,0,1,1,1,wl);
      // Inner wall visible
      A(new THREE.CylinderGeometry(.7,.7,.5,8,1,true),
        new THREE.MeshStandardMaterial({color:0x1a1815,flatShading:true,roughness:1,side:THREE.BackSide}),
        0,.25,0,0,0,0,1,1,1,wl);

      // Wooden frame
      A(jitter(new THREE.BoxGeometry(.14,2.4,.14),.02),mat(C.wD),-.7,1.4,0,0,0,0,1,1,1,wl);
      A(jitter(new THREE.BoxGeometry(.14,2.4,.14),.02),mat(C.wD),.7,1.4,0,0,0,0,1,1,1,wl);
      A(new THREE.CylinderGeometry(.06,.06,1.5,4),mat(C.wM),0,2.6,.05,0,0,Math.PI/2,1,1,1,wl);
      // Rope on crossbar
      A(new THREE.CylinderGeometry(.025,.025,1.3,3),mat(0x8a7a5a),0,2.6,.12,0,0,Math.PI/2,1,1,1,wl);

      // Chain
      for(let i=0;i<16;i++){
        const link=new THREE.Mesh(new THREE.TorusGeometry(.04,.012,3,4),matMetal(C.ir));
        link.position.set(0,2.5-i*.14,0); link.rotation.y=i%2?Math.PI/2:0;
        link.castShadow=true; link.receiveShadow=true; wl.add(link);
      }
      // Bucket
      A(new THREE.CylinderGeometry(.1,.13,.2,5),mat(C.wD),0,.4,0,0,0,0,1,1,1,wl);
      A(new THREE.CylinderGeometry(.14,.14,.02,5),matMetal(C.ir),0,.31,0,0,0,0,1,1,1,wl);

      // Bones scattered
      const mkBone = (bx: number, bz: number, bry: number) => {
        const b = new THREE.Group();
        A(new THREE.CylinderGeometry(.02,.02,.3,3),mat(C.bone),0,0,0,0,0,Math.PI/2,1,1,1,b);
        A(new THREE.SphereGeometry(.03,3,2),mat(C.bone),.15,0,0,0,0,0,1,1,1,b);
        A(new THREE.SphereGeometry(.03,3,2),mat(C.bone),-.15,0,0,0,0,0,1,1,1,b);
        b.position.set(bx,.025,bz); b.rotation.y=bry; wl.add(b);
      }
      mkBone(-.6,.5,.3); mkBone(.7,.4,-.5); mkBone(.2,.9,1.2); mkBone(-.3,.8,-.8);

      // Big skull
      const skG = new THREE.Group();
      A(jitter(new THREE.SphereGeometry(.12,4,3),.02),mat(C.skull),0,.1,0,0,0,0,1,1,1,skG);
      A(new THREE.SphereGeometry(.03,3,2),glow(0x0a0a0a),-.04,.13,.1,0,0,0,1,1,1,skG);
      A(new THREE.SphereGeometry(.03,3,2),glow(0x0a0a0a),.04,.13,.1,0,0,0,1,1,1,skG);
      A(new THREE.BoxGeometry(.08,.04,.06),mat(C.skull),0,-.01,.04,0,0,0,1,1,1,skG);
      skG.position.set(-.45,.01,.7); skG.rotation.y=.4; wl.add(skG);

      wl.position.set(-2,0,.5); p.add(wl);
    }

    // ====== RUNIC GATE (Center back) ======
    {
      const gt = new THREE.Group();
      // Frame
      const fw=.7, fh=5.5;
      A(jitter(new THREE.BoxGeometry(fw,fh,.6,1,4,1),.05),mat(C.sL),-2.2,fh/2,0,0,0,0,1,1,1,gt);
      A(jitter(new THREE.BoxGeometry(fw,fh,.6,1,4,1),.05),mat(C.sL),2.2,fh/2,0,0,0,0,1,1,1,gt);
      A(jitter(new THREE.BoxGeometry(5.1,.7,.6),.05),mat(C.sL),0,fh+.1,0,0,0,0,1,1,1,gt);
      // Keystone
      A(jitter(new THREE.BoxGeometry(.7,.8,.65),.04),mat(C.sM),0,fh+.6,0,0,0,0,1,1,1,gt);
      // Arch
      A(jitter(new THREE.BoxGeometry(1.4,.5,.6),.03),mat(C.sL),-1.1,fh+.3,0,0,0,.2,1,1,1,gt);
      A(jitter(new THREE.BoxGeometry(1.4,.5,.6),.03),mat(C.sL),1.1,fh+.3,0,0,0,-.2,1,1,1,gt);

      // Gate bars
      for(let i=-5;i<=5;i++){
        A(new THREE.CylinderGeometry(.05,.05,4.8,4),matMetal(C.ir),i*.36,2.7,0,0,0,0,1,1,1,gt);
      }
      // Cross bars
      A(new THREE.BoxGeometry(3.8,.09,.09),matMetal(C.ir),0,1.5,0,0,0,0,1,1,1,gt);
      A(new THREE.BoxGeometry(3.8,.09,.09),matMetal(C.ir),0,3.5,0,0,0,0,1,1,1,gt);
      A(new THREE.BoxGeometry(3.8,.09,.09),matMetal(C.ir),0,4.5,0,0,0,0,1,1,1,gt);

      // Big studs
      for(let r=0;r<4;r++)for(let c=-5;c<=5;c++)
        A(new THREE.SphereGeometry(.04,3,2),matMetal(0x222228),c*.36,.7+r*1.2,.08,0,0,0,1,1,1,gt);

      // Portcullis
      const port = new THREE.Group();
      for(let i=-4;i<=4;i++)A(new THREE.CylinderGeometry(.035,.035,3,4),matMetal(C.irR),i*.42,1.5,0,0,0,0,1,1,1,port);
      A(new THREE.BoxGeometry(3.5,.07,.07),matMetal(C.irR),0,.6,0,0,0,0,1,1,1,port);
      A(new THREE.BoxGeometry(3.5,.07,.07),matMetal(C.irR),0,2.2,0,0,0,0,1,1,1,port);
      for(let i=-4;i<=4;i++){
        const spike=new THREE.Mesh(new THREE.ConeGeometry(.04,.18,4),matMetal(C.irR));
        spike.position.set(i*.42,-.1,0); spike.rotation.x=Math.PI;
        spike.castShadow=true; spike.receiveShadow=true; port.add(spike);
      }
      port.position.set(0,5,-.2); gt.add(port);

      // Runic lock
      A(new THREE.CylinderGeometry(.3,.3,.08,8),matMetal(0x1a1a22),0,2.8,.22,Math.PI/2,0,0,1,1,1,gt);
      // Outer rune ring
      const rr1=new THREE.Mesh(new THREE.TorusGeometry(.28,.03,4,8),glow(C.runeB,.7));
      rr1.position.set(0,2.8,.26); rr1.rotation.x=Math.PI/2; rr1.userData.t='rune';
      rr1.castShadow=true; rr1.receiveShadow=true; gt.add(rr1);
      // Inner rune ring
      const rr2=new THREE.Mesh(new THREE.TorusGeometry(.16,.02,4,6),glow(0x88aaff,.6));
      rr2.position.set(0,2.8,.27); rr2.rotation.x=Math.PI/2; rr2.userData.t='rune';
      rr2.castShadow=true; rr2.receiveShadow=true; gt.add(rr2);
      // Rune marks
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const rm=A(new THREE.BoxGeometry(.06,.03,.02),glow(C.runeB,.8),Math.cos(a)*.22,2.8+Math.sin(a)*.22,.28,0,0,a*.5,1,1,1,gt);
        rm.userData.t='rune';
      }
      // Center rune crystal
      const runeCrys=A(jitter(new THREE.SphereGeometry(.06,4,3),.01),glow(0x88bbff,.9),0,2.8,.3,0,0,0,1,1,1,gt);
      runeCrys.userData.t='rune';

      const rl=new THREE.PointLight(0x5577dd,.8 * 100,4); rl.position.set(0,2.8,.8); gt.add(rl);
      fl.push({light:rl,baseIntensity:.8 * 100,isRune:true,idx:200});

      gt.position.set(0,0,-4.3); p.add(gt);
    }

    // ====== TREASURE & ARMORY (Right wall) ======
    {
      const rt = new THREE.Group();

      // CHEST
      const ch = new THREE.Group();
      const cW=1.4, cH=.7, cD=.9;
      A(jitter(new THREE.BoxGeometry(cW,cH,cD,2,1,1),.03),mat(C.wD),0,cH/2,0,0,0,0,1,1,1,ch);
      A(jitter(new THREE.BoxGeometry(cW+.02,.18,cD+.02),.01),mat(C.w),0,cH+.03,0,0,0,0,1,1,1,ch);
      A(jitter(new THREE.BoxGeometry(cW-.02,.1,cD-.02),.01),mat(C.w),0,cH+.12,0,0,0,0,1,1,1,ch);
      // Iron bands
      A(new THREE.BoxGeometry(cW+.04,.06,cD+.04),matMetal(C.ir),0,cH*.4,0,0,0,0,1,1,1,ch);
      A(new THREE.BoxGeometry(cW+.04,.06,cD+.04),matMetal(C.ir),0,cH+.02,0,0,0,0,1,1,1,ch);
      // Vertical bands
      A(new THREE.BoxGeometry(.06,cH+.15,.06),matMetal(C.ir),-.5,cH/2+.05,.46,0,0,0,1,1,1,ch);
      A(new THREE.BoxGeometry(.06,cH+.15,.06),matMetal(C.ir),.5,cH/2+.05,.46,0,0,0,1,1,1,ch);
      // Big lock
      A(new THREE.BoxGeometry(.16,.16,.07),matMetal(C.gold),0,cH*.5,cD/2+.02,0,0,0,1,1,1,ch);
      A(new THREE.BoxGeometry(.05,.07,.03),glow(0x0a0a0a),0,cH*.5,cD/2+.05,0,0,0,1,1,1,ch);
      // Corner studs
      for(const sx of[-1,1])for(const sz of[-1,1]){
        A(new THREE.SphereGeometry(.035,3,2),matMetal(C.ir),sx*(cW/2-.05),.15,sz*(cD/2-.05),0,0,0,1,1,1,ch);
        A(new THREE.SphereGeometry(.035,3,2),matMetal(C.ir),sx*(cW/2-.05),cH-.05,sz*(cD/2-.05),0,0,0,1,1,1,ch);
      }
      ch.position.set(-.4,0,.8); rt.add(ch);

      // Gold coins scattered
      for(let i=0;i<12;i++){
        A(new THREE.CylinderGeometry(.04,.04,.012,5),matMetal(C.goldL),
          -.4+(Math.random()-.5)*1.2,.01+Math.random()*.02,.8+(Math.random()-.5)*.8,
          Math.random()>.3?Math.PI/2:Math.random(),.5,Math.random()*3,1,1,1,rt);
      }

      // WEAPON RACK
      const wr = new THREE.Group();
      A(jitter(new THREE.BoxGeometry(.18,3.5,.1),.02),mat(C.wD),0,1.75,0,0,0,0,1,1,1,wr);
      A(new THREE.BoxGeometry(.9,.1,.1),mat(C.w),.45,2.8,0,0,0,0,1,1,1,wr);
      A(new THREE.BoxGeometry(.9,.1,.1),mat(C.w),.45,1.8,0,0,0,0,1,1,1,wr);
      A(new THREE.BoxGeometry(.9,.1,.1),mat(C.w),.45,.8,0,0,0,0,1,1,1,wr);

      // Sword
      const sw = new THREE.Group();
      A(new THREE.BoxGeometry(.05,1,.03),matMetal(C.irR),0,.5,0,0,0,0,1,1,1,sw);
      // Blade point
      const bTip=new THREE.Mesh(new THREE.ConeGeometry(.03,.12,4),matMetal(C.irR));
      bTip.position.set(0,1.06,0); bTip.castShadow=true; bTip.receiveShadow=true; sw.add(bTip);
      // Fuller (groove)
      A(new THREE.BoxGeometry(.015,.7,.01),matMetal(0x3a3035),0,.5,.02,0,0,0,1,1,1,sw);
      A(new THREE.BoxGeometry(.22,.05,.04),matMetal(C.ir),0,0,0,0,0,0,1,1,1,sw);
      A(new THREE.BoxGeometry(.055,.25,.04),mat(C.leather),0,-.14,0,0,0,0,1,1,1,sw);
      // Leather wrap detail
      for(let w=0;w<4;w++)
        A(new THREE.BoxGeometry(.06,.015,.045),mat(0x4a2a18),0,-.08+w*.05,0,0,0,.15,1,1,1,sw);
      A(new THREE.SphereGeometry(.03,3,2),matMetal(C.ir),0,-.28,0,0,0,0,1,1,1,sw);
      sw.position.set(.6,2.2,.1); sw.rotation.z=.12; wr.add(sw);

      // Shield
      const sh = new THREE.Group();
      A(new THREE.CylinderGeometry(.4,.4,.05,6),
        new THREE.MeshStandardMaterial({color:0x6a4422,flatShading:true,roughness:.6,metalness:.3}),
        0,0,0,Math.PI/2,0,0,1,1,1,sh);
      A(jitter(new THREE.SphereGeometry(.09,4,3),.01),matMetal(C.ir),0,0,.04,0,0,0,1,1,1,sh);
      const sRim=new THREE.Mesh(new THREE.TorusGeometry(.38,.022,4,6),matMetal(C.ir));
      sRim.rotation.x=Math.PI/2; sRim.castShadow=true; sRim.receiveShadow=true; sh.add(sRim);
      // Shield cross emblem
      A(new THREE.BoxGeometry(.04,.35,.02),matMetal(C.brass),0,0,.04,0,0,0,1,1,1,sh);
      A(new THREE.BoxGeometry(.35,.04,.02),matMetal(C.brass),0,0,.04,0,0,0,1,1,1,sh);
      sh.position.set(.6,1.05,.1); wr.add(sh);

      wr.position.set(1,0,-.5); rt.add(wr);
      rt.position.set(4.5,0,-3.5); p.add(rt);
    }

    // ====== HANGING CAGE ======
    {
      const cg = new THREE.Group();
      for(let i=0;i<8;i++){
        const link=new THREE.Mesh(new THREE.TorusGeometry(.04,.012,3,4),matMetal(C.ir));
        link.position.set(0,RH-i*.13,0); link.rotation.y=i%2?Math.PI/2:0;
        link.castShadow=true; link.receiveShadow=true; cg.add(link);
      }
      const cageTop=RH-1.1;
      const r1=new THREE.Mesh(new THREE.TorusGeometry(.5,.03,4,6),matMetal(C.irR));
      r1.position.set(0,cageTop,0); r1.castShadow=true; r1.receiveShadow=true; cg.add(r1);
      const r2=new THREE.Mesh(new THREE.TorusGeometry(.5,.03,4,6),matMetal(C.irR));
      r2.position.set(0,cageTop-1.1,0); r2.castShadow=true; r2.receiveShadow=true; cg.add(r2);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        A(new THREE.CylinderGeometry(.02,.02,1.2,3),matMetal(C.irR),Math.cos(a)*.48,cageTop-.55,Math.sin(a)*.48,0,0,0,1,1,1,cg);
      }
      A(new THREE.CylinderGeometry(.45,.15,.14,6),matMetal(0x1a1a1a),0,cageTop-1.3,0,0,0,0,1,1,1,cg);
      // Skeleton
      A(jitter(new THREE.SphereGeometry(.12,4,3),.02),mat(C.bone),0,cageTop-.2,0,0,.3,0,1,1,1,cg);
      A(new THREE.BoxGeometry(.1,.45,.08),mat(C.bone),0,cageTop-.65,0,0,0,0,1,1,1,cg);
      A(new THREE.BoxGeometry(.05,.35,.05),mat(C.bone),-.07,cageTop-1,0,0,0,.12,1,1,1,cg);
      A(new THREE.BoxGeometry(.05,.35,.05),mat(C.bone),.07,cageTop-1,0,0,0,-.12,1,1,1,cg);
      A(new THREE.BoxGeometry(.05,.25,.04),mat(C.bone),-.15,cageTop-.5,.2,.3,0,.3,1,1,1,cg);
      A(new THREE.BoxGeometry(.05,.25,.04),mat(C.bone),.15,cageTop-.5,-.1,-.2,0,-.25,1,1,1,cg);
      cg.position.set(3.5,0,2); p.add(cg);
    }

    // ====== CEILING TORCH HOLDER ======
    {
      const ct = new THREE.Group();
      A(new THREE.CylinderGeometry(.08,.08,1,6),matMetal(C.ir),0,RH-.3,0,0,0,0,1,1,1,ct);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.06,4,8),matMetal(C.ir));
      ring.position.set(0,RH-1,0); ring.castShadow=true; ring.receiveShadow=true; ct.add(ring);
      [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach((a,i) => {
        A(new THREE.BoxGeometry(.85,.06,.06),matMetal(C.ir),Math.cos(a)*.7,RH-1,Math.sin(a)*.7,0,a,0,1,1,1,ct);
        A(new THREE.CylinderGeometry(.12,.08,.15,5),matMetal(C.irR),Math.cos(a)*1.15,RH-1.05,Math.sin(a)*1.15,0,0,0,1,1,1,ct);
        const f=A(new THREE.SphereGeometry(.1,4,4),glow(0xffaa33),Math.cos(a)*1.15,RH-.75,Math.sin(a)*1.15,0,0,0,1.2,1.8,1.2,ct);
        fl.push({flame:f,idx:90+i});
      });
      const cl=new THREE.PointLight(0xff8822,1.5 * 100,9); cl.position.set(0,RH-.5,0); ct.add(cl);
      fl.push({light:cl,baseIntensity:1.5 * 100,idx:99});
      for(let i=0;i<4;i++){
        const a=Math.PI/4+i*Math.PI/2;
        for(let j=0;j<4;j++){
          const link=new THREE.Mesh(new THREE.TorusGeometry(.035,.01,3,4),matMetal(C.ir));
          link.position.set(Math.cos(a)*.4,RH-.1+j*.12,Math.sin(a)*.4);
          link.rotation.x=j%2?Math.PI/2:0;
          link.castShadow=true; link.receiveShadow=true; ct.add(link);
        }
      }
      ct.position.set(0,0,0); p.add(ct);
    }

    // ====== BRAZIERS ======
    function mkBrazier(bx: number, bz: number) {
      const b = new THREE.Group();
      A(new THREE.CylinderGeometry(.35,.25,.28,6),matMetal(C.ir),0,.65,0,0,0,0,1,1,1,b);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3;
        const leg=A(new THREE.BoxGeometry(.06,.55,.06),matMetal(C.ir),Math.cos(a)*.2,.28,Math.sin(a)*.2,0,0,0,1,1,1,b);
        leg.rotation.z=Math.cos(a)*.15; leg.rotation.x=-Math.sin(a)*.15;
      }
      // Ring detail
      A(new THREE.CylinderGeometry(.36,.36,.04,6,1,true),matMetal(C.irR),0,.8,0,0,0,0,1,1,1,b);
      for(let i=0;i<7;i++){
        const coal=A(new THREE.SphereGeometry(.05+Math.random()*.03,3,2),glow(0xcc3300,.9),(Math.random()-.5)*.28,.76+Math.random()*.05,(Math.random()-.5)*.28,0,0,0,1,1,1,b);
        coal.userData.t='coal';
      }
      const f1=A(new THREE.SphereGeometry(.16,4,4),glow(0xffaa33,.9),0,1,0,0,0,0,1.2,2,1.2,b);
      const f2=A(new THREE.SphereGeometry(.1,3,3),glow(0xffffaa,.9),0,.95,.05,0,0,0,1,1.8,1,b);
      fl.push({flame:f1,idx:bx*10},{flame:f2,idx:bx*10+1});
      const bl=new THREE.PointLight(0xff7722,1.2 * 100,6); bl.position.set(0,1.3,0); b.add(bl);
      fl.push({light:bl,baseIntensity:1.2 * 100,idx:bx*10+2});
      b.position.set(bx,0,bz); p.add(b);
    }
    mkBrazier(-1,2.5); mkBrazier(3,2);

    // ====== PUDDLES ======
    function mkPuddle(px: number, pz: number, ps: number) {
      A(new THREE.CylinderGeometry(ps,ps*.85,.012,6),
        new THREE.MeshStandardMaterial({color:0x223344,flatShading:true,transparent:true,opacity:.45,roughness:.08,metalness:.7}),
        px,.02,pz);
    }
    mkPuddle(-4,.5,.5); mkPuddle(2,-1,.35); mkPuddle(5.5,1,.3);

    // ====== CROSSBOW BOLTS ======
    function mkBolt(bx: number, bz: number, bry: number) {
      const b = new THREE.Group();
      A(new THREE.CylinderGeometry(.01,.01,.4,3),mat(C.wD),0,0,0,0,0,Math.PI/2,1,1,1,b);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.022,.06,3),matMetal(C.ir));
      tip.rotation.z=-Math.PI/2; tip.position.set(.22,0,0);
      tip.castShadow=true; tip.receiveShadow=true; b.add(tip);
      // Fletching
      A(new THREE.BoxGeometry(.005,.04,.08),mat(0x885533),-.18,.01,0,0,0,0,1,1,1,b);
      b.position.set(bx,.028,bz); b.rotation.y=bry; p.add(b);
    }
    mkBolt(-3,1,.3); mkBolt(2,1.5,-.6); mkBolt(5,.5,.9);

    // ====== COBWEBS ======
    function mkWeb(wx: number, wy: number, wz: number, ws: number, wry: number) {
      const shape=new THREE.Shape();
      shape.moveTo(0,0); shape.lineTo(ws,0); shape.lineTo(0,ws); shape.closePath();
      const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:.15,side:THREE.DoubleSide}));
      m.position.set(wx,wy,wz); m.rotation.y=wry||0; p.add(m);
    }
    mkWeb(-RW/2+.5,RH-.3,-RD/2+.5,1,Math.PI/4);
    mkWeb(RW/2-.5,RH-.3,-RD/2+.5,.9,-Math.PI/4);
    mkWeb(-RW/2+.5,RH-.3,RD/2-.5,.8,Math.PI*3/4);
    mkWeb(RW/2-.5,RH-.3,RD/2-.5,.8,-Math.PI*3/4);

    // ====== SPIDER ======
    {
      const sp = new THREE.Group();
      A(new THREE.SphereGeometry(.05,3,3),glow(0x1a1a1a),0,0,0,0,0,0,1,1,1,sp);
      A(new THREE.SphereGeometry(.07,3,3),glow(0x151515),0,-.07,0,0,0,0,1,1,1,sp);
      for(const s of[-1,1])for(let i=0;i<4;i++){
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.18,2),glow(0x1a1a1a));
        leg.position.set(s*(.04+i*.018),-.05,.025-i*.025); leg.rotation.z=s*(-.5-i*.15); sp.add(leg);
      }
      sp.position.set(-3.5,.4,0); sp.rotation.y=.5; p.add(sp);
    }

    // ====== LIGHTING ======
    p.add(new THREE.AmbientLight(0x2a2030, .55 * Math.PI));
    const hemi = new THREE.HemisphereLight(0x443322, 0x1a1520, .45 * Math.PI);
    p.add(hemi);
    const oh=new THREE.PointLight(0xffaa55, 1.2 * 100, 16); oh.position.set(0,RH-1,0); p.add(oh);
    const dir=new THREE.DirectionalLight(0xff9955, .35 * Math.PI);
    dir.position.set(2,7,3); dir.castShadow=true;
    dir.shadow.mapSize.set(512,512); dir.shadow.camera.near=1; dir.shadow.camera.far=16;
    dir.shadow.camera.left=-8; dir.shadow.camera.right=8; dir.shadow.camera.top=8; dir.shadow.camera.bottom=-6;
    p.add(dir);
    const sf1=new THREE.PointLight(0xff8844, .7 * 100, 10); sf1.position.set(-4,2.5,0); p.add(sf1);
    const sf2=new THREE.PointLight(0xff8844, .7 * 100, 10); sf2.position.set(4,2.5,0); p.add(sf2);
    const cool=new THREE.DirectionalLight(0x334466, .12 * Math.PI); cool.position.set(0,10,4); p.add(cool);

    return { group: p, fl };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Standard flicker animation for non-rune items
    fl.forEach(f => {
      const n = f.idx || 0;
      if (f.light) {
        const b = f.baseIntensity || 1;
        if ((f as any).isRune) {
          f.light.intensity = b * (.6 + .4 * Math.sin(t * 1.5 + n));
        } else {
          f.light.intensity = b + Math.sin(t * 8 + n) * b * .2 + Math.sin(t * 14 + n * 2) * b * .12;
        }
      }
      if (f.flame) {
        f.flame.scale.y = 1.5 + Math.sin(t * 9 + n) * .4;
        f.flame.scale.x = 1 + Math.sin(t * 7 + n * 3) * .2;
      }
      if ((f as any).f2) {
        (f as any).f2.scale.y = 1.8 + Math.sin(t * 11 + n) * .3;
        (f as any).f2.scale.x = 1 + Math.sin(t * 8 + n * 2) * .15;
      }
    });
    // Rune opacity + coal opacity
    group.traverse((o: THREE.Object3D) => {
      if (o.userData.t === 'rune') {
        ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = .35 + .45 * (.5 + .5 * Math.sin(t * 2));
      }
      if (o.userData.t === 'coal') {
        ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = .7 + .3 * Math.sin(t * 3 + o.position.x * 10);
      }
    });
  });

  return (
    <>
      <color attach="background" args={[0x12101a]} />
      <fogExp2 attach="fog" args={[0x12101a, 0.018]} />
      <primitive object={group} />
      {objects.slice(0, 5).map((obj, i) => (
        <DynamicObject key={obj.id} objectData={obj} position={DUNGEON_SLOTS[i]} forceOpen={i === activeObjectIdx} onClose={onCloseObject} onObjectOpen={onObjectOpen} onObjectClose={onObjectClose} mode={mode} />
      ))}
    </>
  );
}
