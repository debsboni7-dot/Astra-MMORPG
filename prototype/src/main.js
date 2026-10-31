// ASTRA custom prototype engine — WebGL 2, no Unity/Unreal/third-party game engine.
const canvas = document.querySelector("#viewport");
const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#error");
const gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
if (!gl) fail("WebGL 2 n'est pas disponible sur cet appareil ou navigateur.");

function fail(message) { errorBox.hidden = false; errorBox.textContent = message; loading.hidden = true; throw new Error(message); }

const vertexShader = `#version 300 es
in vec3 aPosition;
in vec3 aColor;
uniform mat4 uMvp;
out vec3 vColor;
void main(){ gl_Position=uMvp*vec4(aPosition,1.0); vColor=aColor; }`;
const fragmentShader = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;
void main(){ outColor=vec4(vColor,1.0); }`;
function compile(type, source) {
  const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) fail(gl.getShaderInfoLog(shader)||"Erreur shader");
  return shader;
}
const program=gl.createProgram();
gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexShader));
gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentShader));
gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS)) fail(gl.getProgramInfoLog(program)||"Erreur programme GPU");
gl.useProgram(program);

const cubeFaces = [
  // positions and face normals are represented by face colors for a clean prototype.
  [[-1,-1,1],[1,-1,1],[1,1,1],[-1,-1,1],[1,1,1],[-1,1,1]],
  [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1]],
  [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,-1,-1],[-1,1,1],[-1,1,-1]],
  [[1,-1,1],[1,-1,-1],[1,1,-1],[1,-1,1],[1,1,-1],[1,1,1]],
  [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,1],[1,1,-1],[-1,1,-1]],
  [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,-1],[1,-1,1],[-1,-1,1]]
];
const faceShade=[1,.72,.82,.64,1,.52];
const verts=[];
for(let f=0;f<cubeFaces.length;f++) for(const p of cubeFaces[f]) verts.push(...p,faceShade[f]);
const cubeVao=gl.createVertexArray(); gl.bindVertexArray(cubeVao);
const cubeBuffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,cubeBuffer);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
const stride=4*4;
const posLoc=gl.getAttribLocation(program,"aPosition"), colLoc=gl.getAttribLocation(program,"aColor");
gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,stride,0);
gl.enableVertexAttribArray(colLoc); gl.vertexAttribPointer(colLoc,1,gl.FLOAT,false,stride,12);
gl.disableVertexAttribArray(colLoc);
gl.vertexAttrib3f(colLoc,1,1,1);
const mvpLoc=gl.getUniformLocation(program,"uMvp");

const mat4={
  identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
  multiply:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
  translate:(x,y,z)=>{const m=mat4.identity();m[12]=x;m[13]=y;m[14]=z;return m;},
  scale:(x,y,z)=>{const m=mat4.identity();m[0]=x;m[5]=y;m[10]=z;return m;},
  rotateX:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);},
  rotateY:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);},
  rotateZ:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);},
  perspective:(fovy,aspect,near,far)=>{const f=1/Math.tan(fovy/2),nf=1/(near-far),m=new Float32Array(16);m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;},
  lookAt:(eye,center,up)=>{let z=norm(sub(eye,center)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
};
const sub=(a,b)=>a.map((v,i)=>v-b[i]), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
function model(x,y,z,sx,sy,sz,ry=0,rx=0){return mat4.multiply(mat4.translate(x,y,z),mat4.multiply(mat4.rotateY(ry),mat4.multiply(mat4.rotateX(rx),mat4.scale(sx,sy,sz))));}
function draw(mvp,color){gl.uniformMatrix4fv(mvpLoc,false,mvp);gl.vertexAttrib3fv(colLoc,color);gl.drawArrays(gl.TRIANGLES,0,36);}
function compose(vp,m,color){draw(mat4.multiply(vp,m),color);}

const player={x:0,z:0,yaw:0,walk:0,run:false};
const keys=new Set(); let stick={x:0,y:0}; let cameraYaw=0, cameraPitch=.32;
addEventListener("keydown",e=>{keys.add(e.key.toLowerCase()); if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
const runButton=document.querySelector("#run");runButton.addEventListener("pointerdown",e=>{player.run=true;runButton.classList.add("active");});["pointerup","pointercancel","pointerleave"].forEach(n=>runButton.addEventListener(n,()=>{player.run=false;runButton.classList.remove("active");}));
const stickEl=document.querySelector("#stick"), knob=document.querySelector("#stick-knob");let stickPointer=null;
stickEl.addEventListener("pointerdown",e=>{stickPointer=e.pointerId;stickEl.setPointerCapture(e.pointerId);moveStick(e);});
stickEl.addEventListener("pointermove",e=>{if(e.pointerId===stickPointer)moveStick(e);});
function moveStick(e){const r=stickEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=(e.clientX-cx)/43,dy=(e.clientY-cy)/43,l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}stick={x:dx,y:dy};knob.style.transform=`translate(${dx*30}px,${dy*30}px)`;}
function resetStick(){stick={x:0,y:0};stickPointer=null;knob.style.transform="translate(0,0)";}
["pointerup","pointercancel","lostpointercapture"].forEach(n=>stickEl.addEventListener(n,resetStick));
let dragging=false,lastX=0,lastY=0;
canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){dragging=true;lastX=e.clientX;lastY=e.clientY;}});
addEventListener("pointerup",()=>dragging=false);
addEventListener("pointermove",e=>{if(dragging){cameraYaw-=(e.clientX-lastX)*.005;cameraPitch=Math.max(-.05,Math.min(.85,cameraPitch+(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;}});
function resize(){const dpr=Math.min(devicePixelRatio||1,1.7),w=Math.floor(canvas.clientWidth*dpr),h=Math.floor(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function part(vp,x,y,z,sx,sy,sz,color,ry=0,rx=0){compose(vp,model(x,y,z,sx,sy,sz,ry,rx),color);}
function drawWorld(vp,t){
  // Ground platform and a simple low-poly grove to test scale, depth and camera.
  part(vp,0,-.18,0,28,.18,28,[.19,.25,.22]);
  for(let i=-5;i<=5;i++)for(let j=-5;j<=5;j++)if((i+j)%2===0)part(vp,i*4,-.005,j*4,1.96,.012,1.96,[.23,.29,.25]);
  for(const [x,z] of [[-7,-7],[7,-8],[-9,5],[9,4],[-4,10],[5,10]]){
    part(vp,x,.9,z,.22,.95,.22,[.27,.17,.11]);
    part(vp,x,2.15,z,.95,1.05,.95,[.13,.29,.18]);
    part(vp,x,3.1,z,.62,.72,.62,[.18,.37,.22]);
  }
  // A stone path marker.
  part(vp,0,.04,-7,1.2,.08,.42,[.42,.39,.32]);
}
function drawPlayer(vp,t){
  const x=player.x,z=player.z,a=player.walk;
  const swing=Math.sin(a)*.58, bob=Math.abs(Math.sin(a*2))*.055;
  const root=mat4.multiply(mat4.translate(x,bob,z),mat4.rotateY(player.yaw));
  const P=(px,py,pz,sx,sy,sz,c,rx=0,ry=0)=>{const local=mat4.multiply(root,model(px,py,pz,sx,sy,sz,ry,rx));compose(vp,local,c);};
  // Neutral humanoid blockout. The production source mesh will be authored in T-pose and rigged separately.
  P(0,1.35,0,.38,.58,.23,[.31,.34,.39]);
  P(0,2.12,0,.25,.28,.24,[.67,.48,.34]);
  P(0,2.48,0,.28,.07,.26,[.2,.2,.23]);
  P(-.49,1.37,0,.15,.47,.15,[.67,.48,.34],swing);
  P(.49,1.37,0,.15,.47,.15,[.67,.48,.34],-swing);
  P(-.2,.48,0,.18,.5,.19,[.2,.23,.29],-swing);
  P(.2,.48,0,.18,.5,.19,[.2,.23,.29],swing);
  P(-.2,.08,.1,.2,.12,.31,[.12,.13,.16]);
  P(.2,.08,.1,.2,.12,.31,[.12,.13,.16]);
  // Shoulder guards and a simple belt accent.
  P(-.43,1.76,0,.2,.16,.2,[.53,.39,.22]);
  P(.43,1.76,0,.2,.16,.2,[.53,.39,.22]);
  P(0,.94,0,.4,.09,.25,[.55,.38,.19]);
}
let previous=performance.now();
function frame(now){
  resize();const dt=Math.min((now-previous)/1000,.04);previous=now;const t=now/1000;
  const forward=(keys.has("w")||keys.has("z")||keys.has("arrowup")?1:0)-(keys.has("s")||keys.has("arrowdown")?1:0)-stick.y;
  const strafe=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("q")||keys.has("arrowleft")?1:0)+stick.x;
  if(keys.has("arrowleft"))cameraYaw+=dt*1.5;if(keys.has("arrowright"))cameraYaw-=dt*1.5;
  const moving=Math.hypot(forward,strafe)>.08;
  if(moving){const fx=Math.sin(cameraYaw),fz=Math.cos(cameraYaw);const dx=strafe*Math.cos(cameraYaw)+forward*fx,dz=forward*fz-strafe*fx;const l=Math.hypot(dx,dz)||1;const speed=player.run?6.2:3.2;player.x+=dx/l*speed*dt;player.z+=dz/l*speed*dt;player.yaw=Math.atan2(dx/l,dz/l);player.walk+=dt*(player.run?13:8);}
  player.x=Math.max(-24,Math.min(24,player.x));player.z=Math.max(-24,Math.min(24,player.z));
  gl.enable(gl.DEPTH_TEST);gl.clearColor(.36,.48,.54,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const aspect=canvas.width/Math.max(1,canvas.height),proj=mat4.perspective(Math.PI/3,aspect,.1,120);
  const dist=8, eye=[player.x-Math.sin(cameraYaw)*dist,3.1+cameraPitch*3,player.z-Math.cos(cameraYaw)*dist],target=[player.x,1.15,player.z];
  const view=mat4.lookAt(eye,target,[0,1,0]),vp=mat4.multiply(proj,view);
  drawWorld(vp,t);drawPlayer(vp,t);
  requestAnimationFrame(frame);
}
loading.hidden=true;
requestAnimationFrame(frame);
