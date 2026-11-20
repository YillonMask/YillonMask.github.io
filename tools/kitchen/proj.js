(az)=>{
  const cam=__camera, out=[];
  for (const P of __parts){
    const C=P.center.clone().add(P.off);
    const R=P.radius, h=P.height/2;
    const pr=v=>{const q=v.clone().project(cam);return [(q.x+1)/2,(1-q.y)/2]};
    const c=pr(C);
    let l=1,r=0,t=1,b=0;
    for(let s=0;s<8;s++){const q=pr(C.clone().add({x:(s&1?R:-R),y:(s&4?h:-h),z:(s&2?R:-R)}));l=Math.min(l,q[0]);r=Math.max(r,q[0]);t=Math.min(t,q[1]);b=Math.max(b,q[1]);}
    out.push({id:P.def.id,c,rect:[l,t,r,b]});
  }
  return out;
}