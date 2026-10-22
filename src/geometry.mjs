import * as k from '../vendor/anatomy/kit/iso-kit.mjs';
import * as G from '../vendor/anatomy/kit/lathe.mjs';
import * as A from '../vendor/anatomy/kit/audit.mjs';
import {tubePieces,tubeSvg} from '../vendor/anatomy/kit/tube.mjs';
import {channels,stagger,spring} from './model.mjs';

const DEG=Math.PI/180, TAU=Math.PI*2;
export const W=920,H=900;
export const P=k.fitProjection([[-150,-150,-160],[150,150,-160],[-150,-150,662],[150,150,662]],W,H,{pad:38,azimuth:35,elevation:18});
export const V=G.viewOf(P);
export const F=G.frameOf([0,0,0],[0,0,1],[1,0,0],[0,1,0]);
const S=k.solidSvg,L=k.lineSvg,D=k.dotsSvg;
const polar=(a,r,z)=>[r*Math.cos(a*DEG),r*Math.sin(a*DEG),z];
const zero=[0,0,0];
const ppath=(points)=>k.pathOf(points.map(p=>k.iso(p,P)),true);

// All dimensional geometry uses 10 drawing units / meter of the public envelope.
// Internal stations and detail dimensions are intentionally illustrative.
export function makeGeometry(){
  const R=A.recorder(P,{order:stagger,spring});
  const put=(piece,name,at,svg,shape,ride=piece,extra={})=>{
    const shapes=[shape].flat().filter(Boolean).map(sh=>R.solid({...sh,name:sh.name??name}));
    return R.put({piece,name,at,svg,shapes,ride,move:channels[ride]??zero,...extra});
  };
  function turned(piece,name,frame,profile,{ride=piece,inner='',surface='',smooth=false,material='steel',meta={}}={}){
    const mid=(profile[0][0]+profile.at(-1)[0])/2;
    const shape=A.solid(frame,profile,{...meta,...(smooth?.radius?{radius:smooth.radius}:{})});
    return put(piece,name,G.add3(frame.o,G.mul3(frame.a,mid)),`<g class="material-${material}">${S(G.solidOf(profile,frame,P,{smooth,steps:80}),{tone:'hi',inner:inner+surface})}</g>`,shape,ride);
  }
  function ring(piece,name,z0,z1,ri,ro,{ride=piece,frame=F,bolts=0,material='steel',meta={}}={}){
    const zFace=G.dot3(frame.a,V)>0?z1:z0;
    // Rings wrap other parts: split at the camera's limb planes, and retain the
    // annular top instead of a convex hull that would paint over the opening.
    const phi=G.angleToward(frame,V),result=[];
    for(let q=0;q<4;q++){
      const a0=phi-Math.PI/2+q*Math.PI/2,a1=a0+Math.PI/2,poly=[];
      for(let i=0;i<=24;i++){const a=a0+(a1-a0)*i/24;poly.push([ro*Math.cos(a),ro*Math.sin(a)]);}
      for(let i=24;i>=0;i--){const a=a0+(a1-a0)*i/24;poly.push([ri*Math.cos(a),ri*Math.sin(a)]);}
      const paths=G.prismOf(frame,poly,z0,z1,P);
      const world=(s,[x,y])=>G.add3(G.pointOf(frame,s,0,0),G.add3(G.mul3(frame.u,x),G.mul3(frame.v,y)));
      const projected=(s,ps)=>ps.map(p=>k.iso(world(s,p),P));
      const orient=pts=>{let area=0;for(let j=0;j<pts.length;j++){const a=pts[j],b=pts[(j+1)%pts.length];area+=a[0]*b[1]-b[0]*a[1];}return area<0?[...pts].reverse():pts;};
      const faces=[k.pathOf(orient(projected(zFace,poly)),true)];
      for(let j=0;j<poly.length;j++){
        const a=poly[j],b=poly[(j+1)%poly.length],n=G.add3(G.mul3(frame.u,b[1]-a[1]),G.mul3(frame.v,a[0]-b[0]));
        if(G.dot3(n,V)>1e-8)faces.push(k.pathOf(orient([...projected(z0,[a,b]),...projected(z1,[b,a])]),true));
      }
      paths.fill=faces.join('');paths.outline='';paths.crease='';
      // Both circular rims meet at the neighboring sector's real edge.
      for(const r of [ri,ro])paths.outline+=k.pathOf(Array.from({length:33},(_,i)=>k.iso(G.pointOf(frame,zFace,r,a0+(a1-a0)*i/32),P)));
      const points=[];
      for(let i=0;i<bolts;i++){let a=TAU*i/bolts;while(a<a0)a+=TAU;while(a>=a0+TAU)a-=TAU;if(a<a1-1e-7)points.push(k.iso(G.pointOf(frame,zFace,(ri+ro)/2,a),P));}
      const detail=D(points,{size:.32,tone:'mid'});
      result.push(put(piece,`${name}.sector.${q}`,G.pointOf(frame,(z0+z1)/2,(ri+ro)/2,(a0+a1)/2),`<g class="material-${material}">${S(paths,{tone:'hi',inner:detail})}</g>`,A.prism(frame,poly,z0,z1,meta),ride));
    }
    return result;
  }
  function disc(piece,name,frame,s0,s1,r,{ride=piece,bolts=0,material='steel',meta={}}={}){
    const face=G.dot3(frame.a,V)>0?s1:s0;
    const detail=L(G.circleOf(frame,face,r*.77,P),{tone:'faint'})+(bolts?D(G.dotsOf(frame,face,r*.82,bolts,P,{all:true}),{size:.28,tone:'mid'}):'');
    return put(piece,name,G.pointOf(frame,(s0+s1)/2,0,0),`<g class="material-${material}">${S(G.disc(s0,s1,r,frame,P,{steps:48,bevel:.2}),{tone:'hi',inner:detail})}</g>`,A.disc(frame,s0,s1,r,meta),ride);
  }
  function box(piece,name,plan,z,h,{ride=piece,material='steel',meta={}}={}){
    const inner=L(k.planOutline(k.insetPlan(plan,.8),z+h,P,3),{tone:'faint'})+D(k.pointsAt(k.corners(plan,1.1).map(([x,y])=>[x,y,z+h]),P),{size:.28,tone:'mid'});
    return put(piece,name,[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],`<g class="material-${material}">${S(k.slabOf(plan,z,h,P,3,.3),{tone:'hi',inner})}</g>`,A.slab(plan,z,h,meta,3),ride);
  }
  function prism(piece,name,frame,poly,s0,s1,{ride=piece,material='steel',inner='',meta={}}={}){
    const centre=poly.reduce((p,q)=>[p[0]+q[0]/poly.length,p[1]+q[1]/poly.length],[0,0]);
    const at=G.add3(G.pointOf(frame,(s0+s1)/2,0,0),G.add3(G.mul3(frame.u,centre[0]),G.mul3(frame.v,centre[1])));
    return put(piece,name,at,`<g class="material-${material}">${S(G.prismOf(frame,poly,s0,s1,P),{tone:'hi',inner})}</g>`,A.prism(frame,poly,s0,s1,meta),ride);
  }

  // A conformal tile field, not a screen-space pattern: every vertex lives on the shell.
  // Closed outlines are the visible tile joints; their pitch is illustrative.
  function tiles(z0,z1,radius=()=>45,slope=()=>0,a0=20,a1=200){
    const groups=[[],[],[],[]], base=[[],[],[],[]];
    const da=3, dz=4;
    for(let z=z0;z<z1-.001;z+=dz){
      const zz=Math.min(z1,z+dz);
      for(let a=a0;a<a1-.01;a+=da){
        const aa=Math.min(a1,a+da),s=(z+zz)/2,t=(a+aa)/2*DEG;
        if(G.facingOf(F,t,P,slope(s))<0)continue;
        const points=[[a,z],[aa,z],[aa,zz],[a,zz]].map(([deg,h])=>polar(deg,radius(h)+.015,h));
        const facing=Math.max(0,G.facingOf(F,t,P,slope(s)));
        base[Math.min(3,Math.floor(facing*3.5))].push(ppath(points));
      }
    }
    const size=1.85, h=1.5*size, pitch=Math.sqrt(3)*size;
    for(let row=Math.floor(z0/h)-1;row<=Math.ceil(z1/h)+1;row++){
      const cz=row*h;
      for(let col=-2;col<70;col++){
        const u=col*pitch+(row%2?pitch/2:0),a=u/45/DEG;
        if(a<a0-4||a>a1+4)continue;
        const verts=Array.from({length:6},(_,i)=>{
          const t=i*Math.PI/3+Math.PI/6;return [u+size*.97*Math.cos(t),cz+size*.97*Math.sin(t)];
        });
        // Clip the hexagon in developed coordinates at real section/heatshield edges.
        let clipped=verts;
        for(const [axis,edge,keep] of [[0,a0*DEG*45,1],[0,a1*DEG*45,-1],[1,z0,1],[1,z1,-1]]){
          const out=[];
          for(let i=0;i<clipped.length;i++){
            const q=clipped[i],r=clipped[(i+1)%clipped.length],qi=(q[axis]-edge)*keep>=0,ri=(r[axis]-edge)*keep>=0;
            if(qi)out.push(q);
            if(qi!==ri){const t=(edge-q[axis])/(r[axis]-q[axis]);out.push([q[0]+t*(r[0]-q[0]),q[1]+t*(r[1]-q[1])]);}
          }
          clipped=out;
        }
        if(clipped.length<3)continue;
        const s=Math.max(z0,Math.min(z1,cz));
        if(radius(s)<1.9||G.facingOf(F,a*DEG,P,slope(s))<.025)continue;
        const pts=clipped.map(([u,z])=>polar(u/45/DEG,radius(z)+.018,z));
        groups[(row*7+col*3+4000)%4].push(ppath(pts));
      }
    }
    return `<g class="tps">${base.map((ds,i)=>`<path class="tps-ground tps-tone-${i}" d="${ds.join('')}"/>`).join('')}${groups.map((ds,i)=>`<path class="tps-tiles tps-variation-${i}" d="${ds.join('')}"/>`).join('')}</g>`;
  }
  function welds(z0,z1,radius=()=>45,slope=()=>0){
    let d='';for(let z=Math.ceil(z0/17.5)*17.5;z<z1-.1;z+=17.5)d+=G.arcOf(F,z,radius(z),P,{slope:slope(z)});
    for(const a of [-35,-5])d+=k.pathOf(Array.from({length:33},(_,i)=>{const z=z0+(z1-z0)*i/32;return k.iso(polar(a,radius(z),z),P);}));
    return L(d,{tone:'lo'});
  }
  function barrel(piece,name,z0,z1,{ride=piece,meta={}}={}){
    return turned(piece,name,F,[[z0,45],[z1,45]],{ride,inner:welds(z0,z1),surface:tiles(z0,z1),meta});
  }
  function dome(piece,name,z0,height,r=45,{ride=piece,up=true,material='steel'}={}){
    const rad=z=>r*Math.sqrt(Math.max(0,1-((up?z-z0:z0+height-z)/height)**2));
    const slope=z=>{const u=(up?z-z0:z0+height-z)/height;return (up?-1:1)*r*u/(height*Math.sqrt(Math.max(1e-8,1-u*u)));};
    const profile=Array.from({length:25},(_,i)=>{const z=z0+height*i/24;return[z,rad(z),1]});
    let meridians='';
    if(up)for(let i=0;i<8;i++){
      const a=i*TAU/8,flat=V[0]*Math.cos(a)+V[1]*Math.sin(a);
      const end=flat<0?Math.atan(-V[2]*r/(height*flat)):Math.PI/2;
      meridians+=k.pathOf(Array.from({length:49},(_,j)=>{const t=end*j/48;return k.iso([r*Math.sin(t)*Math.cos(a),r*Math.sin(t)*Math.sin(a),z0+height*Math.cos(t)],P);}));
    }
    return turned(piece,name,F,profile,{ride,smooth:{radius:rad,slope},material,inner:L(G.arcOf(F,z0+height*.48,rad(z0+height*.48),P,{slope:slope(z0+height*.48)})+meridians,{tone:'faint'})});
  }
  function shell(piece,name,z0,z1,a0,a1,ride){
    const poly=[];
    for(let a=a0;a<=a1+.01;a+=2.5)poly.push([45*Math.cos(a*DEG),45*Math.sin(a*DEG)]);
    for(let a=a1;a>=a0-.01;a-=2.5)poly.push([43.5*Math.cos(a*DEG),43.5*Math.sin(a*DEG)]);
    const body=k.extrude(poly,z0,z1-z0,P,{convex:false});
    // Restrict all surface detail to this actual angular panel.
    let seams='';for(let z=Math.ceil(z0/17.5)*17.5;z<z1;z+=17.5)seams+=G.arcOf(F,z,45,P,{from:a0*DEG,to:a1*DEG});
    const tile=tiles(z0,z1,()=>45,()=>0,Math.max(20,a0),Math.min(200,a1));
    const at=polar((a0+a1)/2,44.25,(z0+z1)/2);
    put(piece,name,at,`<g class="material-steel">${S(body,{tone:'hi',inner:L(seams,{tone:'lo'})+tile})}</g>`,A.extruded(poly,z0,z1-z0),ride);
  }

  // Pressure-bearing tank barrels. The common dome and the adjacent tank's matching
  // concave end share the same analytic surface, so the two volumes never intersect.
  barrel('oxygen','oxygen.barrel',80,250,{meta:{ground:true}});
  dome('oxygen','oxygen.aft-dome',60,20,43.5,{up:false});
  dome('oxygen','oxygen.common-dome',250,18);
  const lower=[[250,45],[270,45],[270,0],[268,0]];
  for(let i=23;i>=0;i--){const z=250+18*i/24;lower.push([z,45*Math.sqrt(Math.max(0,1-((z-250)/18)**2)),1]);}
  // From this fixed, elevated camera the concave underside is occluded by its
  // own barrel. Draw only the visible exterior/top, while auditing the exact
  // concave volume, so the internal dome cannot shade through the steel skin.
  put('methane','methane.common-dome-seat',[0,0,260],S(G.solidOf([[250,45],[270,45]],F,P,{steps:96,smooth:false}),{tone:'hi',inner:tiles(250,270)+welds(250,270)}),A.lathe(F,lower));
  barrel('methane','methane.barrel',270,355);
  dome('methane','methane.forward-dome',355,18,43.5);

  // Payload barrel: near-side skin lifts outward, while structural rings and a
  // deliberately generic accommodation rack remain with the bay.
  const shellAngles=[20,65,110,125,155,200,245,290,305,335,380];
  for(let i=0;i<shellAngles.length-1;i++){
    const a0=shellAngles[i],a1=shellAngles[i+1];
    shell('payload',`payload.skin.${i+1}`,355,410,a0,a1,a0<200?'payloadSkin':'payload');
  }
  for(const z of [374,389,408])ring('payload',`payload.frame.${z}`,z,z+1.2,40.4,43.5,{bolts:40});
  disc('payload','payload.floor',F,373,374,43.5,{bolts:32});
  for(let i=0;i<6;i++){
    const a=(i*60+20)*DEG,rad=[Math.cos(a),Math.sin(a),0],tan=[-Math.sin(a),Math.cos(a),0];
    const frame=G.frameOf(G.mul3(rad,41.2),[0,0,1],rad,tan);
    for(const [j,a,b] of [[1,375.2,389],[2,390.2,408]])prism('payload',`payload.longeron.${i+1}.${j}`,frame,[[-1,-1.2],[1,-1.2],[1,1.2],[-1,1.2]],a,b);
  }
  for(const x of [-21,21])box('payload',`payload.rail.${x}`,{x:x-1.1,y:-19,w:2.2,d:38,r:.4},374,31);
  for(let i=0;i<4;i++){
    box('payload',`payload.tray.${i+1}`,{x:-19.9,y:-17,w:39.8,d:34,r:1},378+i*7,2.2,{material:'payload'});
    box('payload',`payload.tray-stop.${i+1}`,{x:-4,y:-18,w:8,d:1,r:.2},378+i*7,2.2,{material:'darkmetal'});
  }

  const ogiveRadius=(45**2+110**2)/(2*45);
  const noseR=z=>Math.max(0,Math.sqrt(Math.max(0,ogiveRadius**2-(z-410)**2))+45-ogiveRadius);
  const noseSlope=z=>-(z-410)/Math.sqrt(Math.max(1e-8,ogiveRadius**2-(z-410)**2));
  const noseProfile=Array.from({length:49},(_,i)=>{const z=410+110*i/48;return[z,noseR(z),1]});
  turned('nose','nose.ogive',F,noseProfile,{smooth:{radius:noseR,slope:noseSlope},inner:welds(410,520,noseR,noseSlope),surface:tiles(410,520,noseR,noseSlope)});

  // Aft load path and separable near-side skirt. The engine deck is an explanatory
  // structural plate, not the removed V2 environmental close-out/shrouds.
  for(let i=0;i<shellAngles.length-1;i++)shell('aft',`aft.skin.${i+1}`,0,80,shellAngles[i],shellAngles[i+1],shellAngles[i]<200?'aftSkin':'aft');
  ring('aft','aft.lower-ring',0,1.3,41.6,43.5,{bolts:56});
  disc('aft','aft.thrust-deck',F,38,41,43.5,{bolts:48});
  for(let i=0;i<6;i++){
    const a=(i*60+20)*DEG,rad=[Math.cos(a),Math.sin(a),0],tan=[-Math.sin(a),Math.cos(a),0];
    const frame=G.frameOf(zero,tan,rad,[0,0,1]);
    prism('aft',`aft.thrust-web.${i+1}`,frame,[[8,41],[43.5,41],[43.5,59],[36,59]],-.9,.9);
  }
  for(const [i,a] of [[1,50],[2,170],[3,290]]){const [x,y]=polar(a,20,0);box('avionics',`avionics.aft-unit.${i}`,{x:x-3,y:y-3,w:6,d:6,r:1},41,4.5,{ride:'aft',material:'payload'});}

  // Six simplified Raptor 3 assemblies, with the large vacuum bells on the outside.
  function engine(piece,index,cx,cy,exitRadius){
    const ef=G.frameOf([cx,cy,0],[0,0,1],[1,0,0],[0,1,0]);
    const bell=z=>Math.sqrt(2.5**2+((Math.sqrt(exitRadius**2-2.5**2)/17)*(17-z))**2);
    const slope=z=>-((exitRadius**2-2.5**2)/289)*(17-z)/bell(z);
    const profile=Array.from({length:25},(_,i)=>{const z=17*i/24;return[z,bell(z),1]});
    const id=`${piece}.engine-${index}`;
    let inner='';for(const z of [1,5.5,10,14.5])inner+=L(G.arcOf(ef,z,bell(z),P,{slope:slope(z)}),{tone:'faint'});
    turned(piece,`${id}.bell`,ef,profile,{smooth:{radius:bell,slope},material:'engine',inner});
    ring(piece,`${id}.lip`,0,.6,exitRadius-.7,exitRadius,{frame:ef,material:'engine'});
    const jacket=k.fadedSvg(G.ribsOf(ef,19,30,3.4,36,P,{fade:[.05,.6],seams:true}),{tone:'faint'});
    turned(piece,`${id}.chamber`,ef,[[17,2.5],[19,3.4],[30,3.4]],{material:'engine',inner:jacket+L(G.arcOf(ef,24,3.4,P),{tone:'lo'})});
    const pumpFrame=G.frameAlong([cx,cy,26.5],[-1,0,0]);
    turned(piece,`${id}.turbomachinery-neck`,pumpFrame,[[Math.sqrt(3.4**2-1.1**2),1.1],[4.4,1.1]],{material:'engine'});
    disc(piece,`${id}.pump-flange`,pumpFrame,4.4,5,2.3,{material:'steel',bolts:8});
    turned(piece,`${id}.turbomachinery`,pumpFrame,[[5,2.15],[7.8,2.15]],{material:'engine',inner:L(G.arcOf(pumpFrame,6.2,2.15,P),{tone:'lo'})});
    disc(piece,`${id}.pump-end`,pumpFrame,7.8,8.4,2.3,{material:'steel',bolts:8});
    disc(piece,`${id}.injector`,ef,30,32,4.6,{bolts:12,material:'engine'});
    disc(piece,`${id}.mount`,ef,32,38,piece==='sea'?3.3:3.8,{bolts:8});
    const mountF=G.frameOf([cx,cy,0],[0,0,1],[1,0,0],[0,1,0]);
    // The matching seat stays on the thrust deck when the engine is withdrawn.
    ring('aft',`${id}.seat`,36.8,38,4.8,6,{frame:mountF,bolts:12});
    const portA=G.frameAlong([cx,cy,20],[1,0,0]),portB=G.frameAlong([cx,cy,28],[1,0,0]);
    for(const [n,frame] of [['a',portA],['b',portB]])disc(piece,`${id}.port-${n}`,frame,Math.sqrt(3.4**2-.85**2),5,.85,{material:'engine'});
    const reach=piece==='sea'&&index===1?8.5:10;
    const route=G.fillet([[cx+5,cy,20],[cx+reach,cy,20],[cx+reach,cy,28],[cx+5,cy,28]],2.5,12,{P,tube:.42});
    const total=G.pathLength(route),gaps=[[0,.65],[total-.65,total]];
    const owner=`${id}.feed`;
    R.route(owner,route,.42,{owner,piece,ride:piece,move:channels[piece],gaps});
    tubePieces(route,.42,P,{gaps,maxLength:10,spacing:.6,rings:{pitch:1.4,fade:[.05,.6]}}).forEach((t,j)=>{
      const shape=A.tube(t.points,t.radii);
      R.put({piece,ride:piece,move:channels[piece],name:`${owner}:${j}`,at:t.mid,svg:tubeSvg(t,{tone:'mid'}),shapes:[shape],route:owner,chunk:j});
    });
    for(const [n,at,axis,s0,s1] of [['start',[cx+5,cy,20],[1,0,0],0,.65],['end',[cx+5,cy,28],[1,0,0],0,.65]]){
      disc(piece,`${owner}.${n}`,G.frameAlong(at,axis),s0,s1,.85,{material:'steel',meta:{owner}});
    }
  }
  for(let i=0;i<3;i++){
    const a=(i*120+20)*DEG;engine('vac',i+1,27*Math.cos(a),27*Math.sin(a),12.7);
    const b=(i*120+80)*DEG;engine('sea',i+1,10.3*Math.cos(b),10.3*Math.sin(b),6.5);
  }

  // Aerodynamic surfaces are solid prisms. Their layered roots, hinge barrels,
  // fasteners and actuator housings keep the exposed joints legible at 4x.
  function flap(piece,side,angle,poly,z0,z1){
    const rad=polar(angle,1,0),tan=polar(angle+90,1,0),frame=G.frameOf(zero,tan,rad,[0,0,1]);
    const ride=`${piece}${side}`,base=`${piece}.${side}`;
    const face=G.dot3(tan,V)>0?1.1:-1.1;
    let tilesD='';
    // Closed, clipped rectangles represent the smaller tiles on the flap face.
    const minz=Math.min(...poly.map(p=>p[1])),maxz=Math.max(...poly.map(p=>p[1]));
    const inside=(r,z)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>z)!==(poly[j][1]>z)&&r<(poly[j][0]-poly[i][0])*(z-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])c=!c;return c;};
    for(let z=minz+2;z<maxz;z+=3.5)for(let r=47;r<90;r+=3.5){
      const ps=[[r,z],[r+3.1,z],[r+3.1,z+3.1],[r,z+3.1]];
      if(ps.every(([r,z])=>inside(r,z)))tilesD+=ppath(ps.map(([r,z])=>G.add3(G.mul3(tan,face),G.add3(G.mul3(rad,r),[0,0,z]))));
    }
    prism(piece,`${base}.panel`,frame,poly,-1.1,1.1,{ride,material:'flap',inner:`<path class="flap-tiles" d="${tilesD}"/>`});
    const hf=G.frameOf(G.mul3(rad,46.8),[0,0,1],rad,tan);
    const span=z1-z0;
    for(let i=0;i<3;i++){
      const a=z0+span*i/3,b=z0+span*(i+1)/3;
      disc(piece,`${base}.hinge.${i}`,hf,a,b,1.8,{ride,material:'darkmetal'});
    }
    for(const [a,b] of [[z0-.9,z0],[z1,z1+.9]])disc(piece,`${base}.hinge-pin.${a}`,hf,a,b,2.25,{ride,bolts:6});
    // A single actuator with three motor cans is shown on each V3 aft flap.
    const motorZ=z0+span*.3;
    const af=G.frameOf(G.add3(G.mul3(rad,51.8),[0,0,motorZ]),tan,rad,[0,0,1]);
    const lidPoints=[[-2.7,-4.5],[2.7,-4.5],[2.7,4.5],[-2.7,4.5]].map(([r,z])=>G.add3(af.o,G.add3(G.mul3(tan,5.5),G.add3(G.mul3(rad,r),[0,0,z]))));
    const lid=L(ppath(lidPoints),{tone:'lo'})+D(lidPoints.map(p=>k.iso(p,P)),{size:.32,tone:'mid'});
    prism(piece,`${base}.actuator`,af,[[-3.2,-5],[3.2,-5],[3.2,5],[-3.2,5]],1.1,5.5,{ride,material:'steel',inner:G.dot3(tan,V)>0?lid:''});
    const count=piece==='rear'?3:1;
    for(let m=0;m<count;m++){
      const mf=G.frameAlong(G.add3(G.mul3(rad,52),G.add3(G.mul3(tan,5.5),[0,0,motorZ+(m-(count-1)/2)*3])),tan);
      disc(piece,`${base}.motor.${m+1}`,mf,0,4.2,1.2,{ride,material:'darkmetal'});
    }
  }
  flap('forward','L',125,[[48.6,390],[73,394],[73,410],[48.6,449]],392,440);
  flap('forward','R',305,[[48.6,390],[73,394],[73,410],[48.6,449]],392,440);
  flap('rear','L',125,[[48.6,6],[84,10],[84,66],[48.6,131]],12,119);
  flap('rear','R',305,[[48.6,6],[84,10],[84,66],[48.6,131]],12,119);

  // Four leeward docking attachment representations and distributed small ports.
  // These remain attached to their host, even when highlighted as a separate system.
  for(const [i,z,host] of [[1,160,'oxygen'],[2,215,'oxygen'],[3,290,'methane'],[4,335,'methane']]){
    const angle=-17,rad=polar(angle,1,0),bf=G.frameAlong([0,0,z],rad);
    disc(host,`${host}.docking-pad.${i}`,bf,Math.sqrt(45**2-3.1**2),46.4,3.1);
    ring(host,`${host}.docking-face.${i}`,46.4,48,1.3,2.8,{frame:bf,bolts:8});
  }
  for(const [i,z,host,r] of [[1,120,'oxygen',45],[2,307,'methane',45],[3,430,'nose',noseR(430)]]){
    const angle=-36,rad=polar(angle,1,0),bf=G.frameAlong([0,0,z],rad);
    disc('avionics',`avionics.sensor-pad.${i}`,bf,Math.sqrt(r*r-2*2),r+1.2,2,{ride:host});
    if(i===2)disc('avionics',`avionics.sensor-cover.${i}`,bf,r+1.2,r+2,1.65,{ride:host,bolts:6,material:'darkmetal'});
    else {
      turned('avionics',`avionics.rcs-nozzle.${i}`,bf,[[r+1.2,1.1],[r+2.1,.85],[r+4.6,1.8]],{ride:host,material:'darkmetal'});
      ring('avionics',`avionics.rcs-lip.${i}`,r+4.6,r+4.9,1.3,1.8,{ride:host,frame:bf,material:'darkmetal'});
    }
  }
  return R;
}

export function svgItems(R){
  const unit=v=>{const a=k.iso(zero,P),b=k.iso(v,P);return[b[0]-a[0],b[1]-a[1]];};
  return {html:R.items.map((it,index)=>`<g class="it" data-piece="${it.piece}" data-ride="${it.ride}" data-k="${it.key}" data-m="${it.move.join(',')}" data-i="${index}" data-name="${it.name}">${it.svg}</g>`).join(''),vectors:{EX:unit([1,0,0]),EY:unit([0,1,0]),EZ:unit([0,0,1])},center:k.iso([0,0,260],P)};
}
