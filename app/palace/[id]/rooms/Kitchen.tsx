'use client';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mat, matMetal, matCopper, jitter, addMesh, makeTorch, animateFlicker, FlickerItem } from './roomUtils';
import { DynamicObject } from '../DynamicObject';

const KITCHEN_SLOTS: [number, number, number][] = [
  [0, 2, 2.5],         // On the main prep table
  [-5.5, 2, 3.5],      // On the side table 
  [6, 3, 3],           // On top of the barrels
  [0, 8.5, -7],        // On top of the hearth
  [-4.5, 2.5, -3]      // Hanging over the cauldron
];

export function Kitchen({ objects = [] }: { objects?: any[] }) {
  const { group, fl } = useMemo(() => {
    const p = new THREE.Group();
    const fl: FlickerItem[] = [];
    const C = {
      stoneL:0x6a7a72,stoneM:0x4a5a52,stoneD:0x3a4a42,wallBase:0x4a5a4a,wallD:0x2a3a2e,
      wood:0x4a3a2a,woodD:0x2a1e14,woodL:0x5a4a3a,
      gold:0x7a6a3a,iron:0x2e3034,ironL:0x3e4044,
      bread:0x8a7050,cheese:0xa89040,meat:0x6a3028,carrot:0x9a5020,cabbage:0x4a6a42,
      pumpkin:0x9a6020,fish:0x6a7a7a,ceramic:0x8a9a8a,
      warm:0x8a7a5a,candle:0xffcc66,
      copper:0x8a5a3a,copperL:0xaa7a4a,clay:0x7a6a5a,basket:0x6a5a3a,
      rope:0x8a7a5a,green1:0x4a6a4a,green2:0x3a5a3a,green3:0x5a7a5a,
      wine:0x3a2a3a,red:0x7a3a3a,stoneL2:0x5a6a5a,
      cloth:0x8a9a8a,clothD:0x5a6a5a,apron:0x9aaa9a,
      skin:0xb89070,skinD:0x9a7050,sausage:0x6a3a2a,garlic:0xcacaaa,
    };
    const RW=16,RH=9,RD=14;
    const A = (geo: THREE.BufferGeometry, material: THREE.Material, x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,par?: THREE.Object3D) => addMesh(geo,material,x,y,z,rx,ry,rz,sx,sy,sz,par||p);

    // Floor
    A(jitter(new THREE.BoxGeometry(RW,.4,RD,6,1,5),.05),mat(C.stoneD),0,-.2,0);
    for(let ix=-3;ix<=3;ix++)for(let iz=-3;iz<=3;iz++)
      A(jitter(new THREE.BoxGeometry(1.8+Math.random()*.3,.05,1.8+Math.random()*.3,2,1,2),.02),mat((ix+iz)%2===0?C.stoneM:C.stoneD),ix*2.1,.03,iz*2.1);

    // Walls
    const wb=(w:number,h:number,d:number,x:number,y:number,z:number,c?:number)=>A(jitter(new THREE.BoxGeometry(w,h,d,Math.max(1,Math.ceil(w/2)),Math.max(1,Math.ceil(h/2)),Math.max(1,Math.ceil(d/2))),.05),mat(c||C.wallBase),x,y,z);
    wb(RW,RH,.6,0,RH/2,-RD/2);wb(.6,RH,RD,-RW/2,RH/2,0);wb(.6,RH,RD,RW/2,RH/2,0);
    A(new THREE.BoxGeometry(RW,.3,RD),mat(C.wallD),0,RH+.15,0);

    // Beams
    for(let z=-5;z<=5;z+=2.5)A(jitter(new THREE.BoxGeometry(RW-1,.45,.4,5,1,1),.04),mat(C.woodD),0,RH-.2,z);
    for(let x=-5;x<=5;x+=5)A(jitter(new THREE.BoxGeometry(.35,.4,RD-1,1,1,5),.04),mat(C.woodD),x,RH-.4,0);

    // Bricks
    const bCols=[0x4a5a4a,0x5a6a5a,0x3a4a3a,0x6a7a6a,0x4a5a48,0x3a4a3e];
    for(let w=0;w<3;w++)for(let i=0;i<25;i++){
      let bx=0,by=0,bz=0,ry=0;by=.4+Math.random()*(RH-1);
      if(w===0){bx=(Math.random()-.5)*(RW-2);bz=-RD/2+.4;}
      else if(w===1){bz=(Math.random()-.5)*(RD-2);bx=-RW/2+.4;ry=Math.PI/2;}
      else{bz=(Math.random()-.5)*(RD-2);bx=RW/2-.4;ry=Math.PI/2;}
      A(jitter(new THREE.BoxGeometry(.7+Math.random()*1.5,.25+Math.random()*.5,.15,2,1,1),.02),mat(bCols[i%6]),bx,by,bz,0,ry,0);
    }

    // HEARTH
    const hearth=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(6,6,1.5,3,3,1),.08),mat(C.stoneD),0,3,0,0,0,0,1,1,1,hearth);
    A(new THREE.BoxGeometry(4,3.5,1.6),mat(0x0a0a0a),0,1.75,0,0,0,0,1,1,1,hearth);
    A(jitter(new THREE.BoxGeometry(7,.5,1.8,3,1,1),.05),mat(C.stoneL),0,6.2,0,0,0,0,1,1,1,hearth);
    for(let s=-1;s<=1;s+=2)A(jitter(new THREE.BoxGeometry(.8,6,.8,1,3,1),.05),mat(C.stoneM),s*2.6,3,.2,0,0,0,1,1,1,hearth);
    A(jitter(new THREE.BoxGeometry(4,3.5,1.2,2,2,1),.06),mat(C.stoneD),0,7.8,0,0,0,0,1,1,1,hearth);
    // Fire
    for(let i=0;i<8;i++){
      const h=.8+Math.random()*.8,r=.12+Math.random()*.15;
      const f=new THREE.Mesh(new THREE.ConeGeometry(r,h,4),new THREE.MeshBasicMaterial({color:[0xff4400,0xff6622,0xff9933,0xffcc44,0xff5511][i%5],transparent:true,opacity:.85}));
      f.position.set((Math.random()-.5)*1.2,.3+h/2+Math.random()*.2,(Math.random()-.5)*.5);
      hearth.add(f); fl.push({flame:f,idx:i*2+60});
    }
    hearth.position.set(0,0,-RD/2+.8);p.add(hearth);
    const hL=new THREE.PointLight(0xff6622, 4, 16);hL.position.set(0,3,-RD/2+2);hL.castShadow=true;p.add(hL);
    fl.push({light:hL,baseIntensity:4,idx:5});

    // SPIT ROAST
    const spit=new THREE.Group();
    for(let s=-1;s<=1;s+=2){A(jitter(new THREE.BoxGeometry(.12,2.2,.12,1,3,1),.02),matMetal(C.iron),s*1.2,1.1,0,0,0,0,1,1,1,spit);}
    A(new THREE.CylinderGeometry(.04,.04,2.6,5),matMetal(C.iron),0,2.1,0,0,0,Math.PI/2,1,1,1,spit);
    A(jitter(new THREE.SphereGeometry(.4,5,4),.06),mat(C.meat),0,2.1,0,0,0,0,1.8,.8,.8,spit);
    spit.position.set(0,0,-RD/2+1.8);p.add(spit);

    // CAULDRON + TRIPOD
    const trip=new THREE.Group();
    for(let i=0;i<3;i++){const a=(i/3)*Math.PI*2;
      A(jitter(new THREE.CylinderGeometry(.04,.06,2.5,5),.02),matMetal(C.iron),Math.cos(a)*.5,1.15,Math.sin(a)*.5,Math.sin(a)*.15,0,-Math.cos(a)*.15,1,1,1,trip);}
    A(jitter(new THREE.SphereGeometry(.5,6,5,0,Math.PI*2,0,Math.PI*.7),.04),matMetal(C.iron),0,1,0,0,0,0,1,1,1,trip);
    A(new THREE.TorusGeometry(.48,.04,4,7),matMetal(C.ironL),0,1.25,0,Math.PI/2,0,0,1,1,1,trip);
    trip.position.set(-4.5,0,-3);p.add(trip);
    const tpL=new THREE.PointLight(0xff6622, 1.5, 7);tpL.position.set(-4.5,1.5,-3);p.add(tpL);
    fl.push({light:tpL,baseIntensity:1.5,idx:12});

    // STONE OVEN
    const oven=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(3,2.5,2.5,2,2,2),.08),mat(C.stoneM),0,1.25,0,0,0,0,1,1,1,oven);
    A(jitter(new THREE.SphereGeometry(1.5,5,4,0,Math.PI*2,0,Math.PI/2),.06),mat(C.stoneD),0,2.5,0,0,0,0,1,1,1,oven);
    A(new THREE.BoxGeometry(1.2,1,.3),mat(0x0a0a0a),0,.8,1.2,0,0,0,1,1,1,oven);
    A(jitter(new THREE.CylinderGeometry(.25,.3,2,5),.03),mat(C.stoneD),0,3.8,0,0,0,0,1,1,1,oven);
    oven.position.set(RW/2-2,0,-3);p.add(oven);
    const oL=new THREE.PointLight(0xff4400, 1, 5);oL.position.set(RW/2-2,1,-1.8);p.add(oL);
    fl.push({light:oL,baseIntensity:1,idx:16});

    // POT RACK
    const rack=new THREE.Group();
    A(new THREE.CylinderGeometry(.05,.05,6,5),matMetal(C.iron),0,0,0,0,0,Math.PI/2,1,1,1,rack);
    A(new THREE.CylinderGeometry(.04,.04,2.5,5),matMetal(C.iron),0,0,0,Math.PI/2,0,0,1,1,1,rack);
    // Hanging pots
    for(const [hx,hy,sz] of [[-2,-.8,.3],[-.8,-.7,.25],[.5,-.9,.35],[1.8,-.75,.28]] as [number,number,number][]){
      const pg=new THREE.Group();
      A(jitter(new THREE.CylinderGeometry(sz*.8,sz,sz*1.2,6),.03),matMetal(C.iron),0,0,0,0,0,0,1,1,1,pg);
      A(new THREE.TorusGeometry(sz*.6,.02,4,5,Math.PI),matMetal(C.iron),0,sz,0,0,0,0,1,1,1,pg);
      pg.position.set(hx,hy,0);rack.add(pg);
    }
    // Hanging pans
    for(const [hx,hy] of [[-1.5,-.5],[1,-.4],[2.5,-.6]] as [number,number][]){
      const pg=new THREE.Group();
      A(jitter(new THREE.CylinderGeometry(.25,.25,.08,6),.02),matCopper(C.copper),0,0,0,0,0,0,1,1,1,pg);
      A(new THREE.CylinderGeometry(.03,.03,.35,4),matCopper(C.copperL),.35,0,0,0,0,Math.PI/2,1,1,1,pg);
      pg.position.set(hx,hy,.3);rack.add(pg);
    }
    rack.position.set(0,RH-1.5,1);p.add(rack);

    // MAIN TABLE
    const table=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(5,.2,2.2,4,1,2),.03),mat(C.wood),0,1.5,0,0,0,0,1,1,1,table);
    for(let x=-1;x<=1;x+=2)for(let z=-1;z<=1;z+=2)
      A(jitter(new THREE.BoxGeometry(.18,1.5,.18,1,2,1),.02),mat(C.woodD),x*2.1,.75,z*.85,0,0,0,1,1,1,table);
    table.position.set(0,0,2);p.add(table);
    const tY=1.62,tZ=2;
    // Bread
    A(jitter(new THREE.SphereGeometry(.25,5,4),.04),mat(C.bread),-.5,tY+.12,tZ+.3,0,0,0,1.3,.7,1);
    A(jitter(new THREE.SphereGeometry(.2,5,4),.03),mat(C.bread),-.2,tY+.1,tZ+.5,0,0,0,1.2,.6,1);
    // Cheese
    A(jitter(new THREE.CylinderGeometry(.3,.3,.15,7),.02),mat(C.cheese),.5,tY+.08,tZ-.4);
    // Carrots
    for(let i=0;i<4;i++) A(jitter(new THREE.ConeGeometry(.04,.35,5),.01),mat(C.carrot),1.2+i*.12,tY+.06,tZ+.1,0,0,Math.PI/2+(Math.random()-.5)*.3);
    // Cabbage
    A(jitter(new THREE.SphereGeometry(.2,5,4),.04),mat(C.cabbage),1.8,tY+.12,tZ+.4,0,0,0,1,.7,1);

    // SIDE TABLE
    const sT=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(3,.15,1.5,3,1,1),.03),mat(C.wood),0,1.3,0,0,0,0,1,1,1,sT);
    for(let x=-1;x<=1;x+=2)A(jitter(new THREE.BoxGeometry(.15,1.3,1.3,1,2,1),.02),mat(C.woodD),x*1.2,.65,0,0,0,0,1,1,1,sT);
    sT.position.set(-RW/2+2.5,0,3.5);p.add(sT);
    // Pumpkins
    A(jitter(new THREE.SphereGeometry(.3,6,5),.04),mat(C.pumpkin),-RW/2+3.3,1.55,3.3,0,0,0,1,.7,1);
    A(jitter(new THREE.SphereGeometry(.2,6,5),.03),mat(C.pumpkin),-RW/2+3.7,1.5,3.7,0,0,0,1,.7,1);

    // BARREL TABLE
    const bg=new THREE.Group();
    A(jitter(new THREE.CylinderGeometry(.55,.5,1.4,7,3),.04),mat(C.wood),0,.7,0,0,0,0,1,1,1,bg);
    for(let b=0;b<3;b++)A(new THREE.TorusGeometry(.53,.025,4,7),matMetal(C.iron),0,.2+b*.5,0,Math.PI/2,0,0,1,1,1,bg);
    A(jitter(new THREE.CylinderGeometry(.6,.6,.06,7),.02),mat(C.woodL),0,1.42,0,0,0,0,1,1,1,bg);
    bg.position.set(RW/2-2,0,3);p.add(bg);

    // STOOLS
    for(const [sx,sz] of [[-1.5,3.2],[1.5,3.2],[RW/2-2.8,3.5],[-4,0]] as [number,number][]){
      const sg=new THREE.Group();
      A(jitter(new THREE.CylinderGeometry(.3,.28,.08,6),.02),mat(C.wood),0,.9,0,0,0,0,1,1,1,sg);
      for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2;
        A(new THREE.CylinderGeometry(.04,.05,.85,4),mat(C.woodD),Math.cos(a)*.2,.42,Math.sin(a)*.2,0,0,0,1,1,1,sg);}
      sg.position.set(sx,0,sz);p.add(sg);
    }

    // STORAGE BARRELS
    for(const [bx,bz,bs] of [[RW/2-1.2,-5,1],[RW/2-1.2,-3.8,1],[RW/2-2.2,-4.5,.85]] as [number,number,number][]){
      const brg=new THREE.Group();
      A(jitter(new THREE.CylinderGeometry(.4*bs,.35*bs,1.2*bs,7,3),.03*bs),mat(C.wood),0,.6*bs,0,0,0,0,1,1,1,brg);
      for(let b=0;b<3;b++)A(new THREE.TorusGeometry(.38*bs,.02*bs,4,7),matMetal(C.iron),0,.2*bs+b*.4*bs,0,Math.PI/2,0,0,1,1,1,brg);
      brg.position.set(bx,0,bz);p.add(brg);
    }

    // CRATES
    for(const [cx,cy,cz,cs] of [[RW/2-1.5,0,-2,1],[RW/2-2.3,0,-2.2,.9],[RW/2-1.8,.7,-2.1,.8]] as [number,number,number,number][]){
      const cg=new THREE.Group();
      A(jitter(new THREE.BoxGeometry(.8*cs,.7*cs,.8*cs,2,2,2),.03*cs),mat(C.woodD),0,0,0,0,0,0,1,1,1,cg);
      cg.position.set(cx,cy+.35*cs,cz);p.add(cg);
    }

    // SACKS
    for(const [sx,sz,ss] of [[RW/2-1.5,5.5,1],[RW/2-2,5.8,.8],[-RW/2+1.5,5.5,1],[-RW/2+1,5,.9]] as [number,number,number][]){
      A(jitter(new THREE.SphereGeometry(.35*ss,5,4),.06*ss),mat(C.warm),sx,.25*ss,sz,0,0,0,1,.7,1);
    }

    // HANGING HERBS
    for(const [hx,hz] of [[-2,2],[-1.2,2],[-.3,2],[.5,2.2],[3,1.8],[4,2],[-3,-.5]] as [number,number][]){
      const hg=new THREE.Group();
      A(new THREE.CylinderGeometry(.01,.01,.3,3),mat(C.rope),0,.15,0,0,0,0,1,1,1,hg);
      for(let i=0;i<5;i++)
        A(jitter(new THREE.CylinderGeometry(.01,.02,.4+Math.random()*.2,4),.02),mat([C.green1,C.green2,C.green3,0x5a7a4a][i%4]),
          (Math.random()-.5)*.06,-.15-Math.random()*.1,(Math.random()-.5)*.06,0,0,(Math.random()-.5)*.15,1,1,1,hg);
      hg.position.set(hx,RH-.5,hz);p.add(hg);
    }

    // HANGING GARLIC
    for(const [gx,gz] of [[-4,0],[-3.5,.3],[2,-.5],[5,-.3]] as [number,number][]){
      const gg=new THREE.Group();
      A(new THREE.CylinderGeometry(.01,.01,.8,3),mat(C.rope),0,-.1,0,0,0,0,1,1,1,gg);
      for(let i=0;i<5;i++){
        A(jitter(new THREE.SphereGeometry(.07,4,3),.02),mat(C.garlic),0,-.1-i*.15,0,0,0,0,1,.8,1,gg);
      }
      gg.position.set(gx,RH-.5,gz);p.add(gg);
    }

    // SHELVES
    for(const [sx,sy,sz,sw,sry] of [
      [-RW/2+.6,3.5,3,3,Math.PI/2],[-RW/2+.6,5.5,3,3,Math.PI/2],
      [RW/2-.6,3.5,-.5,3,-Math.PI/2],[RW/2-.6,5.5,-.5,3,-Math.PI/2],
      [-5,4,-RD/2+.6,3,0],[5,4,-RD/2+.6,3,0]
    ] as [number,number,number,number,number][]){
      const sg=new THREE.Group();
      A(jitter(new THREE.BoxGeometry(sw,.1,.5,Math.ceil(sw),1,1),.02),mat(C.wood),0,0,0,0,0,0,1,1,1,sg);
      for(let s=-1;s<=1;s+=2)A(new THREE.BoxGeometry(.08,.3,.4),mat(C.woodD),s*(sw/2-.2),-.2,0,0,0,0,1,1,1,sg);
      sg.position.set(sx,sy,sz);sg.rotation.y=sry;p.add(sg);
    }
    // Shelf items
    for(let i=0;i<5;i++)A(jitter(new THREE.CylinderGeometry(.08+Math.random()*.04,.1,.25+Math.random()*.1,6),.02),mat([C.clay,C.ceramic,C.stoneM][i%3]),-RW/2+.6,3.7,1.8+i*.55);

    // PREP COUNTER
    const counter=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(1.5,1.6,5,1,2,3),.05),mat(C.wood),0,.8,0,0,0,0,1,1,1,counter);
    A(jitter(new THREE.BoxGeometry(1.7,.15,5.2,2,1,3),.03),mat(C.stoneM),0,1.65,0,0,0,0,1,1,1,counter);
    counter.position.set(-RW/2+1.2,0,-1.5);p.add(counter);

    // TORCHES
    makeTorch(p,fl,-RW/2+.5,4,-2,Math.PI/2,C.iron);
    makeTorch(p,fl,-RW/2+.5,4,4,Math.PI/2,C.iron);
    makeTorch(p,fl,RW/2-.5,4,2,-Math.PI/2,C.iron);
    makeTorch(p,fl,RW/2-.5,4,5,-Math.PI/2,C.iron);
    makeTorch(p,fl,0,5,-RD/2+.5,0,C.iron);
    makeTorch(p,fl,-5,5,-RD/2+.5,0,C.iron);
    makeTorch(p,fl,5,5,-RD/2+.5,0,C.iron);

    // CHEF
    const ch=new THREE.Group();
    A(jitter(new THREE.BoxGeometry(.7,.9,.45,2,2,1),.03),mat(C.cloth),0,1.35,0,0,0,0,1,1,1,ch);
    A(jitter(new THREE.BoxGeometry(.55,.75,.08,2,2,1),.02),mat(C.apron),0,1.2,.25,0,0,0,1,1,1,ch);
    for(let s=-1;s<=1;s+=2){
      A(jitter(new THREE.BoxGeometry(.25,.9,.25,1,2,1),.02),mat(C.clothD),s*.18,.45,0,0,0,0,1,1,1,ch);
      A(jitter(new THREE.BoxGeometry(.28,.25,.35),.02),mat(C.woodD),s*.18,.12,.05,0,0,0,1,1,1,ch);
    }
    A(jitter(new THREE.BoxGeometry(.45,.5,.4,2,2,1),.03),mat(C.skin),0,2.2,0,0,0,0,1,1,1,ch);
    A(jitter(new THREE.CylinderGeometry(.22,.27,.45,6,2),.04),mat(0xdddddd),0,2.75,0,0,0,0,1,1,1,ch);
    A(jitter(new THREE.SphereGeometry(.24,5,4),.04),mat(0xe0e0d8),0,3,0,0,0,0,1,.6,1,ch);
    ch.position.set(-3.8,0,-2.2);ch.rotation.y=-.3;p.add(ch);

    // LIGHTING
    p.add(new THREE.AmbientLight(0x3a4a42, 0.5 * Math.PI));
    const f1=new THREE.PointLight(0xffaa55, 2.2 * 100, 20);f1.position.set(0,RH-1,0);p.add(f1);
    const f2=new THREE.PointLight(0xffaa55, 1.5 * 100, 15);f2.position.set(-4,5,2);p.add(f2);
    const f3=new THREE.PointLight(0xffaa55, 1.5 * 100, 15);f3.position.set(4,5,2);p.add(f3);
    const f4=new THREE.PointLight(0xff8844, 1.0 * 100, 12);f4.position.set(0,3,4);p.add(f4);
    const cF=new THREE.DirectionalLight(0x4a6a5a, 0.3 * Math.PI);cF.position.set(0,8,10);p.add(cF);

    return { group: p, fl };
  }, []);

  useFrame(({ clock }) => animateFlicker(fl, clock.getElapsedTime()));

  return (
    <>
      <color attach="background" args={[0x1e2a22]} />
      <fogExp2 attach="fog" args={[0x1e2a22, 0.016]} />
      <primitive object={group} />

      {/* Dynamic Objects */}
      {objects.slice(0, 5).map((obj, i) => (
        <DynamicObject key={obj.id} objectData={obj} position={KITCHEN_SLOTS[i]} />
      ))}
    </>
  );
}
