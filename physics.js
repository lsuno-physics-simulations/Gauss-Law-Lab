/* Physics functions shared by the browser and automated numerical checks. */
(function(root){
'use strict';
const EPS0=8.8541878128e-12;
function surface(shape,a,n){
 const axes=shape==='ellipsoid'?[a,.7*a,1.3*a]:[a,a,a], points=[];
 if(shape==='cube'){
  for(let k=0;k<3;k++)for(const sign of [-1,1]){
   const other=[0,1,2].filter(i=>i!==k);
   for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const p=[0,0,0],av=[0,0,0];p[k]=sign*axes[k];
    p[other[0]]=axes[other[0]]*(-1+2*(i+.5)/n);
    p[other[1]]=axes[other[1]]*(-1+2*(j+.5)/n);
    av[k]=sign*4*axes[other[0]]*axes[other[1]]/(n*n);points.push({p,av});
   }
  }
 }else{
  const factor=axes.reduce((x,y)=>x*y,1)*2*Math.PI/(n*n);
  for(let i=0;i<n;i++)for(let j=0;j<2*n;j++){
   const z=-1+2*(i+.5)/n,phi=(j+.5)*Math.PI/n,r=Math.sqrt(1-z*z);
   const u=[r*Math.cos(phi),r*Math.sin(phi),z];
   points.push({p:u.map((v,k)=>v*axes[k]),av:u.map((v,k)=>v/axes[k]*factor)});
  }
 }
 return {axes,points};
}
function flux(geometry,charges,shape){
 let enclosed=0,boundary=false,total=0;
 for(const c of charges){
  const level=shape==='cube'?Math.max(...c.p.map((v,k)=>Math.abs(v)/geometry.axes[k])):Math.hypot(...c.p.map((v,k)=>v/geometry.axes[k]));
  if(Math.abs(level-1)<1e-8&&c.q!==0)boundary=true;
  if(level<1)enclosed+=c.q;
 }
 let maxDensity=0;
 for(const s of geometry.points){
  const E=[0,0,0];
  if(!boundary)for(const c of charges){
   if(c.q===0)continue;
   const d=s.p.map((v,k)=>v-c.p[k]),r=Math.hypot(...d);
   const factor=c.q*1e-9/(4*Math.PI*EPS0*r*r*r);
   for(let k=0;k<3;k++)E[k]+=factor*d[k];
  }
  const contribution=E.reduce((sum,v,k)=>sum+v*s.av[k],0);
  s.E=E;s.density=contribution/Math.hypot(...s.av);total+=contribution;
  maxDensity=Math.max(maxDensity,Math.abs(s.density));
 }
 const expected=enclosed*1e-9/EPS0,scale=charges.reduce((sum,c)=>sum+Math.abs(c.q),0)*1e-9/EPS0;
 return {enclosed,boundary,total:boundary?NaN:total,expected,maxDensity,error:scale?100*Math.abs(total-expected)/scale:0};
}
function field(model,r,R,density){
 const d=density*1e-9;
 if(model==='sheet')return d/(2*EPS0);
 if(model==='sphere')return r<=R?d*r/(3*EPS0):d*R**3/(3*EPS0*r*r);
 return r<=R?d*r/(2*EPS0):d*R*R/(2*EPS0*r);
}
const api={EPS0,surface,flux,field};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GaussPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
