import {makeGeometry,P} from '../src/geometry.mjs';
import {channels,stagger,spring} from '../src/model.mjs';
import {sharesAt,advanceSpring} from '../src/motion.mjs';
import * as A from '../vendor/anatomy/kit/audit.mjs';
import {writeFileSync} from 'node:fs';

const ids=Object.keys(channels),dt=1/60;
const scripts=[
  {name:'quarter stops',events:[[0,.25],[1.8,.5],[3.6,.75],[5.4,1],[7.2,.5],[9,0]],end:11},
  {name:'continuous drag',events:Array.from({length:61},(_,i)=>[i/30,i<=30?i/30:2-i/30]),end:4},
  {name:'rapid reversal',events:[[0,1],[.095,0],[.18,.8],[.31,.2],[.43,.65],[.56,0],[.71,1],[.9,.4],[1.3,0]],end:3.5},
];
const frames=[];
for(const clip of scripts){
  const state={x:0,v:0};let target=0,next=0;
  for(let frame=0;frame<=clip.end/dt;frame++){
    const clock=frame*dt;
    while(next<clip.events.length&&clip.events[next][0]<=clock+1e-9)target=clip.events[next++][1];
    advanceSpring(state,target,dt,spring);
    frames.push({label:`${clip.name} ${clock.toFixed(3)}s`,shares:sharesAt(Math.max(0,Math.min(1,state.x)),stagger,spring.phase)});
  }
}
const R=makeGeometry();
const depth=[...Array.from({length:1001},(_,i)=>({label:`path ${i/1000}`,shares:sharesAt(i/1000,stagger,spring.phase)})),...frames.filter((_,i)=>i%4===0)];
A.settle(R,P,{states:depth});
const solids=[],tubes=[];
const mounts=A.mountsOf(R.tubes,R.solids);
for(const state of frames){
  solids.push(...A.solidClearances(R.solids,{state}));
  tubes.push(...A.clearances(R.tubes,R.solids,{state,mounts,only:'through'}));
}
const order=A.depthOrder(R.items,P,{overlaps:R.settled.overlaps,solved:R.settled.solved});
const summary={frames:frames.length,depthStates:depth.length,solidIntersections:solids.length,tubeIntersections:tubes.length,orderProblems:order.problems.length,missing:order.missing.length};
console.log(JSON.stringify(summary,null,2));
for(const [name,list] of [['solids',solids],['tubes',tubes],['order',order.problems]])if(list.length)console.log(name,JSON.stringify(list.slice(0,20),null,2));
writeFileSync(new URL('qa/continuous-motion.json',import.meta.url),JSON.stringify(summary,null,2));
const fail=solids.length+tubes.length+order.problems.length+order.missing.length;
console.log(fail?'continuous motion FAILED':'continuous motion passed');process.exitCode=fail?1:0;
