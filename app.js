'use strict';
const $=id=>document.getElementById(id),P=GaussPhysics;
const value=id=>Number($(id).value),fmt=(x,d=3)=>Number.isFinite(x)?x.toFixed(d):'—';
let geometry,result,charges,yaw=.65,pitch=.4,frame=0,startTime=null;
function metric(label,val,unit=''){return `<div class="metric"><span>${label}</span><strong>${val}</strong> <small>${unit}</small></div>`;}
function canvasSetup(id){const c=$(id),rect=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr);const ctx=c.getContext('2d');ctx.scale(dpr,dpr);return {ctx,w:rect.width,h:rect.height};}
function updateSurface(){
 const shape=$('shape').value,a=value('size'),x=value('position'),q=value('charge'),n=value('resolution');
 $('sizeOut').textContent=fmt(a,2)+' m';$('positionOut').textContent=fmt(x,2)+' m';$('chargeOut').textContent=fmt(q,1)+' nC';$('resolutionOut').textContent=n+' subdivisions';
 charges=[{p:[x,0,0],q}];if($('pair').checked)charges.push({p:[-.6,0,0],q:-q});
 geometry=P.surface(shape,a,n);result=P.flux(geometry,charges,shape);
 $('fluxResults').innerHTML=metric('Enclosed charge',fmt(result.enclosed),'nC')+metric('Numerical Φₑ',fmt(result.total),'N m²/C')+metric('Qenc / ε₀',result.boundary?'—':fmt(result.expected),'N m²/C')+metric('Normalized error',result.boundary?'—':fmt(result.error),'%');
 $('surfaceNote').textContent=result.boundary?'Charge on the surface: singular boundary case. Move it slightly to either side.':'Error is normalized by the total absolute-charge flux scale. Near a crossing, narrow field peaks may be missed; increase resolution. Zero net flux does not imply zero electric field.';
 $('colorScale').textContent=`E · n̂: ${fmt(-result.maxDensity,2)} to ${fmt(result.maxDensity,2)} N/C · ${geometry.points.length.toLocaleString()} patches · scale changes with configuration`;
 drawSurface();
}
function drawSurface(){
 if(!geometry||$('surface').hidden)return;
 const {ctx,w,h}=canvasSetup('surfaceCanvas'),scale=Math.min(w/7.8,h/6.8);
 function project(p){const u=Math.cos(yaw)*p[0]-Math.sin(yaw)*p[1],v=Math.sin(yaw)*p[0]+Math.cos(yaw)*p[1];return [w/2+scale*u,h/2-scale*(Math.cos(pitch)*p[2]-Math.sin(pitch)*v),Math.cos(pitch)*v+Math.sin(pitch)*p[2]];}
 function line(a,b,color){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
 ctx.font='12px system-ui';ctx.lineWidth=1;
 for(let k=0;k<3;k++){const a=[0,0,0],b=[0,0,0];a[k]=-3.2;b[k]=3.2;line(project(a),project(b),'#c8d9df');const t=project(b);ctx.fillStyle='#56717b';ctx.fillText(['x (m)','y (m)','z (m)'][k],t[0]-12,t[1]-8);}
 const samples=geometry.points.map((s,i)=>({...s,i,screen:project(s.p)})).sort((a,b)=>a.screen[2]-b.screen[2]);
 const stride=Math.max(1,Math.floor(geometry.points.length/90));
 for(const s of samples){
  const t=s.density/(result.maxDensity||1),c=Math.round(248-190*Math.abs(t));ctx.fillStyle=t>=0?`rgb(218,${c},${c})`:`rgb(${c},${c},218)`;
  ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(s.screen[0],s.screen[1],value('resolution')<20?3:1.8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  if(s.i%stride===0){const len=Math.hypot(...s.E);if(len>0){const end=project(s.p.map((v,k)=>v+.21*s.E[k]/len));line(s.screen,end,'#344b56');const angle=Math.atan2(end[1]-s.screen[1],end[0]-s.screen[0]);line(end,[end[0]-4*Math.cos(angle-.5),end[1]-4*Math.sin(angle-.5)],'#344b56');line(end,[end[0]-4*Math.cos(angle+.5),end[1]-4*Math.sin(angle+.5)],'#344b56');}}
 }
 for(const c of charges){const p=project(c.p);ctx.fillStyle=c.q<0?'#2457d8':c.q>0?'#c52c2c':'#62737a';ctx.strokeStyle='white';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#183544';ctx.font='bold 13px system-ui';ctx.fillText(`${c.q>0?'+':''}${fmt(c.q,1)} nC`,p[0]+12,p[1]-12);}
 ctx.fillStyle='#56717b';ctx.font='12px system-ui';ctx.fillText('Drag to rotate · arrow keys also rotate',12,20);
}
const derivations={
 sphere:`<h2>Uniformly charged solid sphere</h2><p>A concentric Gaussian sphere has a radial field of constant magnitude over its surface.</p><div class="equation">Φ<sub>E</sub> = E(r) · 4πr² = Q<sub>enc</sub> / ε₀</div><p><b>Inside, r ≤ R:</b> Q<sub>enc</sub> = ρ · (4/3)πr³</p><div class="equation">E(r) = ρr / (3ε₀)</div><p><b>Outside, r &gt; R:</b> Q<sub>enc</sub> = ρ · (4/3)πR³</p><div class="equation">E(r) = ρR³ / (3ε₀r²)</div><p>E = 0 at the center; the field is continuous at R.</p>`,
 cylinder:`<h2>Infinite uniformly charged solid cylinder</h2><p>Choose a coaxial Gaussian cylinder of radius r and length L. The field is radial; the end caps contribute zero flux.</p><div class="equation">Φ<sub>E</sub> = E(r) · 2πrL = Q<sub>enc</sub> / ε₀</div><p><b>Inside, r ≤ R:</b> Q<sub>enc</sub> = ρπr²L</p><div class="equation">E(r) = ρr / (2ε₀)</div><p><b>Outside, r &gt; R:</b> Q<sub>enc</sub> = ρπR²L</p><div class="equation">E(r) = ρR² / (2ε₀r)</div><p>L cancels. This is an ideal infinite source.</p>`,
 sheet:`<h2>Infinite uniform thin sheet</h2><p>For a nonconducting sheet, choose a pillbox with face area A. The field is perpendicular to the sheet. Each face contributes EA; the side contributes zero.</p><div class="equation">Φ<sub>E</sub> = 2EA = σA / ε₀</div><p>Cancel the area A:</p><div class="equation">E = σ / (2ε₀)</div><p>The field is independent of distance, with opposite directions on opposite sides. At the sheet the normal field is discontinuous. The probe stays off the sheet.</p>`
};
function updateSymmetry(){
 const m=$('model').value,R=value('radius'),d=value('density'),r=value('probe'),sheet=m==='sheet';
 $('radiusLabel').hidden=sheet;$('radiusOut').textContent=fmt(R,2)+' m';$('densityName').textContent=sheet?'Surface density σ':'Volume density ρ';$('densityOut').textContent=fmt(d,1)+(sheet?' nC/m²':' nC/m³');$('probeOut').textContent=fmt(r,2)+' m';
 $('fieldResult').innerHTML=metric('Signed field at probe',fmt(P.field(m,r,R,d)),'N/C');$('derivation').innerHTML=derivations[m];drawField();
}
function drawField(){
 if($('symmetry').hidden)return;
 const {ctx,w,h}=canvasSetup('fieldCanvas'),m=$('model').value,R=value('radius'),d=value('density'),r=value('probe');
 const points=Array.from({length:601},(_,i)=>[i/150,P.field(m,i/150,R,d)]);let low=Math.min(0,...points.map(p=>p[1])),high=Math.max(0,...points.map(p=>p[1]));if(low===high){low=-1;high=1;}const pad=(high-low)*.12;low-=pad;high+=pad;
 const left=65,right=w-24,top=28,bottom=h-53,X=x=>left+x/4*(right-left),Y=y=>bottom-(y-low)/(high-low)*(bottom-top);
 ctx.font='12px system-ui';ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=low+(high-low)*i/4;ctx.strokeStyle='#e0e9ec';ctx.beginPath();ctx.moveTo(left,Y(y));ctx.lineTo(right,Y(y));ctx.stroke();ctx.fillStyle='#56717b';ctx.fillText(y.toFixed(1),5,Y(y)+4);}
 for(let i=0;i<=4;i++){ctx.fillStyle='#56717b';ctx.fillText(i,X(i)-4,bottom+20);}
 ctx.strokeStyle='#8aa3ad';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
 if(m!=='sheet'){ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(R),top);ctx.lineTo(X(R),bottom);ctx.stroke();ctx.setLineDash([]);ctx.fillText('R',X(R)+5,top+14);}
 ctx.strokeStyle='#006c78';ctx.lineWidth=2.5;ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(X(p[0]),Y(p[1]));else ctx.lineTo(X(p[0]),Y(p[1]));});ctx.stroke();
 ctx.fillStyle='#d46a20';ctx.beginPath();ctx.arc(X(r),Y(P.field(m,r,R,d)),5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#183544';ctx.fillText('Signed E (N/C)',left,16);ctx.fillText('Distance r (m)',(left+right)/2-40,h-10);
}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;startTime=null;$('animate').textContent='Animate crossing';}
$('animate').addEventListener('click',()=>{if(frame){stop();return;} $('animate').textContent='Stop animation';function step(t){if(startTime===null)startTime=t;const progress=Math.min((t-startTime)/9000,1);$('position').value=-3+6*progress;updateSurface();if(progress<1)frame=requestAnimationFrame(step);else stop();}frame=requestAnimationFrame(step);});
for(const id of ['shape','size','position','charge','pair','resolution'])$(id).addEventListener('input',()=>{stop();updateSurface();});
$('preset').addEventListener('change',()=>{stop();$('shape').value='sphere';$('size').value=1;$('charge').value=1;$('pair').checked=$('preset').value==='pair';$('position').value=({center:0,offset:.65,external:1.8,pair:.6})[$('preset').value];updateSurface();});
for(const id of ['model','radius','density','probe'])$(id).addEventListener('input',updateSymmetry);
for(const which of ['surface','symmetry'])$(which+'Tab').addEventListener('click',()=>{stop();for(const name of ['surface','symmetry']){const selected=name===which;$(name).hidden=!selected;$(name+'Tab').classList.toggle('active',selected);$(name+'Tab').setAttribute('aria-pressed',selected);}if(which==='surface')drawSurface();else updateSymmetry();});
let drag=null;const canvas=$('surfaceCanvas');canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.01;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-drag[1])*.01));drag=[e.clientX,e.clientY];drawSurface();});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();yaw+=e.key==='ArrowRight'?.1:e.key==='ArrowLeft'?-.1:0;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.key==='ArrowDown'?.1:e.key==='ArrowUp'?-.1:0)));drawSurface();});
window.addEventListener('resize',()=>{drawSurface();drawField();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});updateSurface();updateSymmetry();
