// One spring follows user progress. Each assembly occupies a fixed phase of the
// same reversible path, so rapid slider changes cannot starve a later assembly.
export function sharesAt(progress,order,phase){
  const span=1-phase*(order.length-1);
  return Object.fromEntries(order.map((id,index)=>{
    const u=Math.max(0,Math.min(1,(progress-index*phase)/span));
    return [id,u*u*(3-2*u)];
  }));
}

export function advanceSpring(s,target,dt,spring,calm=false){
  if(calm){s.x=target;s.v=0;return false;}
  for(let i=0;i<spring.substeps;i++){
    const h=dt/spring.substeps;
    s.v+=((target-s.x)*spring.stiffness-s.v*spring.damping)*h;
    s.x+=s.v*h;
  }
  if(Math.abs(s.x-target)<.0002&&Math.abs(s.v)<.0002){s.x=target;s.v=0;return false;}
  return true;
}
