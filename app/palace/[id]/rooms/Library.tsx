'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mat, matMetal, glow, jitter, addMesh, makeTorch, animateFlicker, FlickerItem } from './roomUtils';

export function Library() {
  const crystalRef = useRef<THREE.Mesh>(null);
  const crystInnerRef = useRef<THREE.Mesh>(null);

  const { group, fl } = useMemo(() => {
    const p = new THREE.Group();
    const fl: FlickerItem[] = [];
    const C = {
      sL:0x8a7a6a,sM:0x5a4a3e,sD:0x3a3030,sDD:0x2a2222,
      w:0x5a3a28,wD:0x3a2218,wL:0x6a4a32,wM:0x4a3020,wR:0x7a5a3a,
      gold:0xaa8a3a,goldL:0xccaa4a,ir:0x2e2e30,
      red:0x8a2a1a,redD:0x6a1a0a,
      crystal:0x4a8acc,crystalL:0x6aaaee,crystalGlow:0x3a7abb,
      candle:0xffcc66,
    };
    const bkC=[0x8a3a3a,0x3a4a7a,0x5a7a3a,0x7a5a2a,0x6a3a5a,0x3a6a6a,0x7a4a1a,0x4a3a6a,0x8a6a2a,0x5a3a3a,0xaa6a3a,0x3a5a4a,0x9a5a6a,0x6a6a2a,0xcc8844,0x4488aa];
    const RW=18,RH=12,RD=16;

    const A = (geo: THREE.BufferGeometry, material: THREE.Material, x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,par?: THREE.Object3D) => addMesh(geo,material,x,y,z,rx,ry,rz,sx,sy,sz,par||p);

    // Floor
    A(jitter(new THREE.BoxGeometry(RW,.4,RD,6,1,5),.06),mat(C.sDD),0,-.2,0);
    for(let ix=-4;ix<=4;ix++)for(let iz=-3;iz<=3;iz++)
      A(jitter(new THREE.BoxGeometry(1.8+Math.random()*.3,.05,1.8+Math.random()*.3,2,1,2),.02),mat((ix+iz)%2===0?C.sD:C.sDD),ix*2,.03,iz*2.2);

    // Walls
    A(jitter(new THREE.BoxGeometry(RW,RH,.7,6,4,1),.06),mat(C.sD),0,RH/2,-RD/2);
    A(jitter(new THREE.BoxGeometry(.7,RH,RD,1,4,5),.06),mat(C.sD),-RW/2,RH/2,0);
    A(jitter(new THREE.BoxGeometry(.7,RH,RD,1,4,5),.06),mat(C.sD),RW/2,RH/2,0);
    A(new THREE.BoxGeometry(RW,.3,RD),mat(C.wD),0,RH+.15,0);

    // Dark stone bricks
    for(let w=0;w<3;w++)for(let i=0;i<35;i++){
      let bx=0,by=0,bz=0,ry=0;by=.3+Math.random()*(RH-1);
      if(w===0){bx=(Math.random()-.5)*(RW-2);bz=-RD/2+.45;}
      else if(w===1){bz=(Math.random()-.5)*(RD-2);bx=-RW/2+.45;ry=Math.PI/2;}
      else{bz=(Math.random()-.5)*(RD-2);bx=RW/2-.45;ry=Math.PI/2;}
      A(jitter(new THREE.BoxGeometry(.8+Math.random()*1.4,.3+Math.random()*.4,.12,2,1,1),.02),mat([0x3a3032,0x4a3a3a,0x2a2528,0x3a3538,0x4a4040][i%5]),bx,by,bz,0,ry);
    }

    // Beams
    for(let z=-6;z<=6;z+=3)A(jitter(new THREE.BoxGeometry(RW-.5,.55,.5,6,1,1),.04),mat(C.wD),0,RH-.2,z);
    for(let x=-6;x<=6;x+=4)A(jitter(new THREE.BoxGeometry(.5,.5,RD-.5,1,1,5),.04),mat(C.wD),x,RH-.45,0);
    // Vertical wooden pillars
    for(let s=-1;s<=1;s+=2)
      for(let z=-5;z<=5;z+=5)
        A(jitter(new THREE.BoxGeometry(.4,RH,.4,1,4,1),.04),mat(C.wM),s*(RW/2-.5),RH/2,z);

    // MEZZANINE
    const mezH=6.5,mezW=3;
    A(jitter(new THREE.BoxGeometry(mezW,.25,RD-2,3,1,5),.04),mat(C.wD),-RW/2+mezW/2,mezH,0);
    A(jitter(new THREE.BoxGeometry(mezW,.25,RD-2,3,1,5),.04),mat(C.wD),RW/2-mezW/2,mezH,0);
    A(jitter(new THREE.BoxGeometry(RW-mezW*2,.25,mezW,4,1,2),.04),mat(C.wD),0,mezH,-RD/2+mezW/2);
    A(jitter(new THREE.BoxGeometry(3,.25,mezW,2,1,2),.04),mat(C.wD),-RW/2+mezW/2+1.5,mezH,RD/2-mezW/2);
    A(jitter(new THREE.BoxGeometry(3,.25,mezW,2,1,2),.04),mat(C.wD),RW/2-mezW/2-1.5,mezH,RD/2-mezW/2);

    // Inner railing
    A(jitter(new THREE.BoxGeometry(.18,.12,RD-mezW*2),.03),mat(C.wL),-RW/2+mezW,mezH+1.1,0);
    for(let z=-6;z<=6;z+=2)A(new THREE.BoxGeometry(.12,.95,.12),mat(C.wM),-RW/2+mezW,mezH+.55,z);
    A(jitter(new THREE.BoxGeometry(.18,.12,RD-mezW*2),.03),mat(C.wL),RW/2-mezW,mezH+1.1,0);
    for(let z=-6;z<=6;z+=2)A(new THREE.BoxGeometry(.12,.95,.12),mat(C.wM),RW/2-mezW,mezH+.55,z);
    A(jitter(new THREE.BoxGeometry(RW-mezW*2,.12,.18),.03),mat(C.wL),0,mezH+1.1,-RD/2+mezW);
    for(let x=-5;x<=5;x+=2.5)A(new THREE.BoxGeometry(.12,.95,.12),mat(C.wM),x,mezH+.55,-RD/2+mezW);

    // Support brackets
    for(let z=-5;z<=5;z+=3.3){
      A(jitter(new THREE.BoxGeometry(.5,.5,1),.03),mat(C.wD),-RW/2+1.5,mezH-.3,z);
      A(jitter(new THREE.BoxGeometry(.5,.5,1),.03),mat(C.wD),RW/2-1.5,mezH-.3,z);
    }

    // BOOKSHELVES (function)
    function mkShelf(x:number,z:number,ry:number,rows=4,sw=2.5,sd=.6){
      const g=new THREE.Group();
      A(jitter(new THREE.BoxGeometry(sw,rows*1.1+.2,sd,2,rows,1),.03),mat(C.wD),0,(rows*1.1+.2)/2,0,0,0,0,1,1,1,g);
      for(let s=0;s<rows;s++){const sy=.2+s*1.1;
        A(new THREE.BoxGeometry(sw+.04,.08,sd+.04),mat(C.w),0,sy,0,0,0,0,1,1,1,g);
        let cx=-sw/2+.1;
        while(cx<sw/2-.1){const bw=.06+Math.random()*.08,bh=.55+Math.random()*.4;
          A(new THREE.BoxGeometry(bw,bh,sd-.15),mat(bkC[Math.floor(Math.random()*bkC.length)]),cx+bw/2,sy+.04+bh/2,sd/2-.15,0,0,(Math.random()-.5)*.05,1,1,1,g);
          cx+=bw+.008;if(Math.random()<.06)cx+=.08;}}
      A(jitter(new THREE.BoxGeometry(sw+.06,.12,sd+.06),.02),mat(C.w),0,rows*1.1+.2,0,0,0,0,1,1,1,g);
      g.position.set(x,0,z);g.rotation.y=ry;p.add(g);return g;
    }

    // Upper level shelves
    for(let z=-5.5;z<=5.5;z+=2.8){const sh=mkShelf(-RW/2+1.2,z,Math.PI/2,3,2.2,.55);sh.position.y=mezH;}
    for(let z=-5.5;z<=5.5;z+=2.8){const sh=mkShelf(RW/2-1.2,z,-Math.PI/2,3,2.2,.55);sh.position.y=mezH;}
    for(let x=-5;x<=5;x+=3.5){const sh=mkShelf(x,-RD/2+1.2,0,3,2.8,.55);sh.position.y=mezH;}

    // Lower bookshelves
    mkShelf(-6,-RD/2+1,0,5,3,.6);
    mkShelf(6,-RD/2+1,0,5,3,.6);
    mkShelf(0,-RD/2+1,0,5,3,.6);
    for(let z=-5;z<=5;z+=2.8){mkShelf(-RW/2+1,z,Math.PI/2,5,2.4,.6);mkShelf(RW/2-1,z,-Math.PI/2,5,2.4,.6);}

    // FLOOR BOOK STACKS
    function mkBookPile(x:number,z:number,n=5){
      for(let i=0;i<n;i++){const bw=.3+Math.random()*.3,bd=.2+Math.random()*.2,bh=.04+Math.random()*.03;
        A(new THREE.BoxGeometry(bw,bh,bd),mat(bkC[Math.floor(Math.random()*bkC.length)]),x+(Math.random()-.5)*.15,.02+i*(bh+.005),z+(Math.random()-.5)*.15,0,(Math.random()-.5)*.3);}}
    mkBookPile(-4,2,6);mkBookPile(-3.5,2.5,4);mkBookPile(-5,3,5);
    mkBookPile(4,2,7);mkBookPile(3.5,3,4);mkBookPile(5,2.5,5);
    mkBookPile(-3,5,4);mkBookPile(3,5,3);mkBookPile(0,-4,5);

    // GRAND RED CARPET
    A(jitter(new THREE.BoxGeometry(7,.04,10,5,1,6),.03),mat(C.red),0,.15,0);
    A(jitter(new THREE.BoxGeometry(7.4,.03,10.4,5,1,6),.02),mat(C.gold),0,.12,0);
    A(jitter(new THREE.BoxGeometry(5,.05,7,4,1,5),.02),mat(C.redD),0,.18,0);
    A(jitter(new THREE.BoxGeometry(5.3,.045,7.3,4,1,5),.02),mat(C.goldL),0,.16,0);

    // CENTRAL ARCHWAY MONUMENT
    const arch=new THREE.Group();
    A(jitter(new THREE.CylinderGeometry(3,3.3,.5,6),.06),mat(C.sL),0,.25,0,0,0,0,1,1,1,arch);
    A(jitter(new THREE.CylinderGeometry(2.5,2.8,.3,6),.04),mat(C.sM),0,.55,0,0,Math.PI/6,0,1,1,1,arch);

    // Four main pillars
    for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2+Math.PI/4;
      const px=Math.cos(a)*1.8,pz=Math.sin(a)*1.8;
      A(jitter(new THREE.BoxGeometry(.8,.6,.8,1,1,1),.04),mat(C.sL),px,.9,pz,0,a,0,1,1,1,arch);
      A(jitter(new THREE.BoxGeometry(.5,4,.5,1,4,1),.04),mat(C.sL),px,3.2,pz,0,a,0,1,1,1,arch);
      A(jitter(new THREE.BoxGeometry(.7,.4,.7,1,1,1),.03),mat(C.sM),px,5.4,pz,0,a,0,1,1,1,arch);
    }

    // Gothic arches connecting pillars
    for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2+Math.PI/4;
      const a2=((i+1)/4)*Math.PI*2+Math.PI/4;
      const mx=(Math.cos(a)+Math.cos(a2))/2*1.8;
      const mz=(Math.sin(a)+Math.sin(a2))/2*1.8;
      A(jitter(new THREE.BoxGeometry(2,.3,.25,2,1,1),.03),mat(C.sM),mx,5.6,mz,0,(a+a2)/2+Math.PI/2,0,1,1,1,arch);
      A(jitter(new THREE.BoxGeometry(.3,.35,.22),.02),mat(C.sM),mx*0.95,6.8,mz*0.95,0,(a+a2)/2+Math.PI/2,0,1,1,1,arch);
    }

    // Top spire
    A(jitter(new THREE.CylinderGeometry(.3,1.2,1.5,4),.06),mat(C.wR),0,7,0,0,Math.PI/4,0,1,1,1,arch);
    A(jitter(new THREE.CylinderGeometry(.05,.3,.8,4),.04),mat(C.wD),0,7.9,0,0,Math.PI/4,0,1,1,1,arch);

    // Central pedestal
    A(jitter(new THREE.BoxGeometry(1,.3,1),.03),mat(C.sM),0,.85,0,0,0,0,1,1,1,arch);
    A(jitter(new THREE.CylinderGeometry(.3,.4,1.2,6),.03),mat(C.sL),0,1.5,0,0,0,0,1,1,1,arch);
    A(jitter(new THREE.BoxGeometry(.7,.15,.7),.02),mat(C.sM),0,2.15,0,0,Math.PI/4,0,1,1,1,arch);

    // CRYSTAL
    const crystalMat=new THREE.MeshStandardMaterial({color:C.crystal,flatShading:true,roughness:.1,metalness:.3,transparent:true,opacity:.8,emissive:C.crystalGlow,emissiveIntensity:.5});
    const crys=A(jitter(new THREE.OctahedronGeometry(0.7,0),.05),crystalMat,0,3.2,0,0,0,0,1,1,1,arch);
    (crys as any).__isCrystal = true;
    const crystInner=A(new THREE.OctahedronGeometry(.5,0),glow(C.crystalL,.6),0,3.2,0,0,0,0,1,1,1,arch);
    (crystInner as any).__isCrystalInner = true;

    arch.position.set(0,0,0);p.add(arch);

    const crystLight=new THREE.PointLight(C.crystal, 3, 12);crystLight.position.set(0,3.5,0);p.add(crystLight);

    // Small cyan orbs around archway
    for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;
      const ox=Math.cos(a)*2.2,oz=Math.sin(a)*2.2;
      A(new THREE.SphereGeometry(.06,4,3),glow(C.crystalL,.9),ox,5.8+Math.sin(a*2)*.2,oz,0,0,0,1,1,1,arch);
      const ol=new THREE.PointLight(C.crystal, .3, 3);ol.position.set(ox,5.8,oz);arch.add(ol);
    }

    // SMALL DESKS
    function mkSmallDesk(x:number,z:number,ry:number){const d=new THREE.Group();
      A(jitter(new THREE.BoxGeometry(1.2,.1,.8,2,1,1),.02),mat(C.w),0,1.2,0,0,0,0,1,1,1,d);
      for(let lx=-1;lx<=1;lx+=2)for(let lz=-1;lz<=1;lz+=2)
        A(new THREE.BoxGeometry(.1,1.2,.1),mat(C.wD),lx*.5,.6,lz*.3,0,0,0,1,1,1,d);
      for(let i=0;i<2;i++)A(new THREE.BoxGeometry(.25,.04,.18),mat(bkC[Math.floor(Math.random()*bkC.length)]),(Math.random()-.5)*.5,1.25+i*.045,(Math.random()-.5)*.3,0,Math.random()*.4,0,1,1,1,d);
      d.position.set(x,0,z);d.rotation.y=ry;p.add(d);}
    mkSmallDesk(-4,4,0.2);mkSmallDesk(4,4,-0.2);
    mkSmallDesk(-3,-4,0.1);mkSmallDesk(3,-4,-0.1);

    // STOOLS
    for(const [sx,sz] of [[-4,4.8],[4,4.8],[-3,-4.8],[3,-4.8]] as [number,number][]){
      const s=new THREE.Group();
      A(jitter(new THREE.CylinderGeometry(.22,.2,.06,6),.01),mat(C.w),0,.7,0,0,0,0,1,1,1,s);
      for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2;
        A(new THREE.CylinderGeometry(.03,.04,.68,4),mat(C.wD),Math.cos(a)*.14,.34,Math.sin(a)*.14,0,0,0,1,1,1,s);}
      s.position.set(sx,0,sz);p.add(s);
    }

    // SCROLL CHESTS
    for(const [cx,cz,cs] of [[-5,6,1],[5,6,1],[-6,-5,.8],[6,-5,.8]] as [number,number,number][]){
      const ch=new THREE.Group();
      A(jitter(new THREE.BoxGeometry(1*cs,.6*cs,.6*cs,2,1,1),.03),mat(C.wD),0,.3*cs,0,0,0,0,1,1,1,ch);
      A(jitter(new THREE.BoxGeometry(1.02*cs,.1*cs,.62*cs),.02),mat(C.wM),0,.62*cs,0,0,0,0,1,1,1,ch);
      for(let b=-1;b<=1;b++)A(new THREE.BoxGeometry(.05,.6*cs,.62*cs),matMetal(C.ir),b*.35*cs,.3*cs,0,0,0,0,1,1,1,ch);
      ch.position.set(cx,0,cz);p.add(ch);
    }

    // CANDLE CLUSTERS
    function mkCandles(x:number,y:number,z:number,n=3){
      for(let i=0;i<n;i++){const h=.12+Math.random()*.2;
        A(new THREE.CylinderGeometry(.02+Math.random()*.015,.03,h,5),mat(0xcacab0),x+(Math.random()-.5)*.12,y+h/2,z+(Math.random()-.5)*.12);
        const f=A(new THREE.SphereGeometry(.018,3,3),glow(C.candle),x+(Math.random()-.5)*.1,y+h+.015,z+(Math.random()-.5)*.1,0,0,0,1,1.5,1);
        fl.push({flame:f,idx:50+i+x*3});
      }
      const l=new THREE.PointLight(0xff8822, 1 * 100, 5);l.position.set(x,y+.3,z);p.add(l);
    }
    mkCandles(-4.5,0,2.5,3);mkCandles(4.5,0,2.5,3);
    mkCandles(-4,0,-3,2);mkCandles(4,0,-3,2);
    mkCandles(-2,.25,5.5,4);mkCandles(2,.25,5.5,3);

    // STAIRS
    const nSteps=Math.ceil(mezH/.35);
    for(const side of [1,-1]){
      const stairs=new THREE.Group();
      for(let i=0;i<nSteps;i++)
        A(jitter(new THREE.BoxGeometry(1.3,.2,.6),.02),mat(C.sM),0,i*.35+.1,-i*.5,0,0,0,1,1,1,stairs);
      for(let i=0;i<nSteps;i+=2){
        A(new THREE.BoxGeometry(.08,.8,.08),mat(C.wD),.6,i*.35+.5,-i*.5,0,0,0,1,1,1,stairs);
        A(new THREE.BoxGeometry(.08,.8,.08),mat(C.wD),-.6,i*.35+.5,-i*.5,0,0,0,1,1,1,stairs);
      }
      stairs.position.set(side*(RW/2-2.5),0,RD/2-1);p.add(stairs);
    }

    // TORCHES
    makeTorch(p,fl,-RW/2+.5,5,-4,Math.PI/2,C.ir);
    makeTorch(p,fl,-RW/2+.5,5,4,Math.PI/2,C.ir);
    makeTorch(p,fl,RW/2-.5,5,-4,-Math.PI/2,C.ir);
    makeTorch(p,fl,RW/2-.5,5,4,-Math.PI/2,C.ir);
    makeTorch(p,fl,-RW/2+.5,8.5,0,Math.PI/2,C.ir);
    makeTorch(p,fl,RW/2-.5,8.5,0,-Math.PI/2,C.ir);
    makeTorch(p,fl,-3,4,-RD/2+.5,0,C.ir);
    makeTorch(p,fl,3,4,-RD/2+.5,0,C.ir);

    // LIGHTING
    p.add(new THREE.AmbientLight(0x1a2233, 0.4 * Math.PI));
    const centerL = new THREE.PointLight(0xaa6644, 2 * 100, 15);
    centerL.position.set(0, 4, 0); centerL.castShadow = true; p.add(centerL);
    fl.push({ light: centerL, baseIntensity: 2 * 100, idx: 54 });
    const cool=new THREE.DirectionalLight(0x3344aa, 0.15 * Math.PI);cool.position.set(0,12,0);p.add(cool);
    const upL = new THREE.PointLight(C.crystal, 1.5 * 100, 8);
    upL.position.set(0, 1, 0); p.add(upL);
    fl.push({ light: upL, baseIntensity: 1.5 * 100, idx: 105 });

    return { group: p, fl };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    animateFlicker(fl, t);
    // Crystal rotation + pulse
    group.traverse((child: THREE.Object3D) => {
      if ((child as any).__isCrystal) {
        child.rotation.y = t * .3;
        child.rotation.x = Math.sin(t * .5) * .1;
        const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = .3 + (.7 + Math.sin(t * 2) * .3) * .3;
      }
      if ((child as any).__isCrystalInner) {
        child.rotation.y = -t * .5;
        child.rotation.z = t * .2;
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = .4 + (.7 + Math.sin(t * 2) * .3) * .2;
      }
    });
  });

  return (
    <>
      <color attach="background" args={[0x12101a]} />
      <fogExp2 attach="fog" args={[0x12101a, 0.015]} />
      <primitive object={group} />
    </>
  );
}
