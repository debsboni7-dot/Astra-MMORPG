/**
 * ASTREA environment runtime. 1 Three.js unit = 1 metre.
 * Global continental coordinates; only nearby 1 km terrain cells are generated.
 */
export const ASTREA_CONTINENT = Object.freeze({ width:1200000, height:900000, areaKm2:1080000, chunkSize:1000, activeRadius:1 });
export const ASTREA_REGIONS = Object.freeze([
 {id:'aube',name:"Plaine d'Aube",biome:'plains',x:0,z:0,altitude:'80–300 m'},
 {id:'sylve',name:'Bois de Sylve',biome:'forest',x:-160000,z:-50000,altitude:'150–850 m'},
 {id:'greniers',name:"Greniers d'Or",biome:'farmland',x:180000,z:25000,altitude:'100–500 m'},
 {id:'veyr',name:'Hautes Terres de Veyr',biome:'highlands',x:20000,z:-280000,altitude:'700–3 600 m'},
 {id:'miroirs',name:'Lac des Miroirs',biome:'lake',x:260000,z:-200000,altitude:'250–900 m'},
 {id:'eloria',name:"Bassin d'Eloria",biome:'riverlands',x:100000,z:220000,altitude:'30–500 m'},
 {id:'marches',name:"Marches de l'Ouest",biome:'coastal',x:-340000,z:-180000,altitude:'0–1 000 m'},
 {id:'brumes',name:'Côte des Brumes',biome:'wetlands',x:-260000,z:300000,altitude:'0–450 m'}
]); 
export const ASTREA_LANDMARKS=Object.freeze([
 {regionId:'sylve',name:'Cœur-Vert',kind:'ancient-tree',x:-160000,z:-50000},
 {regionId:'greniers',name:'Moulin des Moissons',kind:'windmill',x:180000,z:25000},
 {regionId:'veyr',name:'Aiguille de Veyr',kind:'spire',x:20000,z:-280000},
 {regionId:'miroirs',name:'Phare des Miroirs',kind:'lighthouse',x:260000,z:-200000},
 {regionId:'eloria',name:'Aqueduc d’Eloria',kind:'aqueduct',x:100000,z:220000},
 {regionId:'marches',name:'Tour des Marches',kind:'watchtower',x:-340000,z:-180000},
 {regionId:'brumes',name:'Saule des Brumes',kind:'glowing-willow',x:-260000,z:300000}
]);
export const ASTREA_ACTIVITIES=[
  {id:'herb',x:-7,z:3,kind:'herb',prompt:'Cueillir des plantes médicinales',resource:'herbs',min:1,max:3},
  {id:'wood',x:-145,z:75,kind:'wood',prompt:'Récupérer du bois',resource:'wood',min:1,max:3},
  {id:'ore',x:155,z:45,kind:'ore',prompt:'Extraire du minerai',resource:'stone',min:1,max:2},
  {id:'fish',x:550,z:65,kind:'fish',prompt:'Pêcher dans la rivière',resource:'fish',min:1,max:2},
  {id:'crops',x:-125,z:-255,kind:'crop',prompt:'Récolter les céréales',resource:'crops',min:1,max:3},
  {id:'shrine',x:190,z:-165,kind:'relic',prompt:'Examiner le sanctuaire lumineux',resource:'relics',min:1,max:1}
 ,
 {id:'sylve-herb',x:-160080,z:-49920,kind:'herb',prompt:'Cueillir les simples du Bois de Sylve',resource:'herbs',min:2,max:4},
 {id:'sylve-wood',x:-160180,z:-50090,kind:'wood',prompt:'Ramasser du bois de Sylve',resource:'wood',min:2,max:4},
 {id:'greniers-crop',x:180090,z:25060,kind:'crop',prompt:'Récolter les céréales des Greniers d’Or',resource:'crops',min:2,max:5},
 {id:'greniers-herb',x:180210,z:24920,kind:'herb',prompt:'Cueillir les herbes des champs',resource:'herbs',min:1,max:3},
 {id:'veyr-ore',x:20080,z:-280100,kind:'ore',prompt:'Extraire le minerai des Hautes Terres',resource:'stone',min:2,max:4},
 {id:'veyr-relic',x:19890,z:-279850,kind:'relic',prompt:'Étudier une rune ancienne de Veyr',resource:'relics',min:1,max:2},
 {id:'miroirs-fish',x:260100,z:-199900,kind:'fish',prompt:'Pêcher dans le Lac des Miroirs',resource:'fish',min:2,max:4},
 {id:'miroirs-relic',x:259850,z:-200120,kind:'relic',prompt:'Examiner le vestige immergé',resource:'relics',min:1,max:2},
 {id:'eloria-crop',x:100100,z:220100,kind:'crop',prompt:'Récolter dans le Bassin d’Eloria',resource:'crops',min:2,max:5},
 {id:'eloria-fish',x:99850,z:219900,kind:'fish',prompt:'Pêcher dans les eaux d’Eloria',resource:'fish',min:1,max:3},
 {id:'marches-ore',x:-339900,z:-179900,kind:'ore',prompt:'Extraire la pierre des Marches de l’Ouest',resource:'stone',min:1,max:3},
 {id:'marches-wood',x:-340120,z:-180100,kind:'wood',prompt:'Récupérer du bois côtier',resource:'wood',min:1,max:2},
 {id:'brumes-herb',x:-259900,z:300100,kind:'herb',prompt:'Cueillir les plantes des marais',resource:'herbs',min:2,max:4},
 {id:'brumes-fish',x:-260120,z:299900,kind:'fish',prompt:'Pêcher sur la Côte des Brumes',resource:'fish',min:1,max:3}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const gauss=(d,r)=>Math.exp(-((d/r)**2));
const riverX=z=>500+Math.sin(z/80000)*40000;
export function getAstreaRegionAt(x,z){let best=ASTREA_REGIONS[0],d0=Infinity;for(const r of ASTREA_REGIONS){const d=Math.hypot(x-r.x,z-r.z);if(d<d0){best=r;d0=d;}}return best;}
export function getAstreaBiomeAt(x,z){return getAstreaRegionAt(x,z).biome;}
export function getAstreaTerrainHeight(x,z){
 const biome=getAstreaBiomeAt(x,z);
 let h=17+Math.sin(x*.00125)*7+Math.cos(z*.00105)*8+Math.sin((x+z)*.00063)*4+Math.cos((x-z)*.00031)*3;
 h-=13*gauss(Math.abs(x-riverX(z)),210);
 if(biome==='forest')h+=28+Math.sin(x*.0008)*24+Math.cos(z*.0007)*18;
 if(biome==='farmland')h+=8+Math.sin(x*.0004)*7+Math.cos(z*.0005)*6;
 if(biome==='highlands'){const north=smooth(120000,310000,-z),ridge=.25+.75*gauss(x-(20000+Math.sin(z*.000018)*72000),150000),peaks=Math.pow(Math.abs(Math.sin(x*.000021+z*.000013)*Math.cos(z*.000017)),1.35);h+=north*ridge*(950+peaks*2700);}
 if(biome==='lake')h-=75*gauss(Math.hypot(x-260000,z+200000),80000);
 if(biome==='riverlands')h-=20*gauss(Math.abs(x-riverX(z)),900);
 if(biome==='coastal')h+=80*gauss(x+340000,100000)+45*Math.sin(z*.00045);
 if(biome==='wetlands')h-=15+20*gauss(z-300000,80000);
 h+=62*gauss(z+7200,4300)*(.35+.65*Math.pow(Math.sin(x*.0011),2));
 const coast=Math.min(600000-Math.abs(x),450000-Math.abs(z));if(coast<26000)h=h*smooth(-5000,26000,coast)-2;
 return clamp(h,-35,3600);
}
function hash(x,z){let h=Math.imul(x|0,374761393)+Math.imul(z|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0;}
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

export function createAstreaWorld(THREE,world,{scene,keyLight,rimLight,npcFactory,camera}={}){
 world.userData.dispose?.();world.clear();world.userData={};
 const size=ASTREA_CONTINENT.chunkSize,chunks=new Map(),activities=[],waterMeshes=[],glows=[],npcs=[],landmarks=[],sharedMats=new Set(),sharedGeos=new Set();
 const mat=(c,r=.95,e={})=>new THREE.MeshStandardMaterial({color:c,roughness:r,...e});
 const TEXTURE_URLS={
 'grass004-color.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/2ad6d645-d90b-4c2f-94a8-b043f796601f.jpg',
 'grass004-normal.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/57ec646d-655f-40ce-ae8f-62f6e3259441.jpg',
 'grass004-roughness.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/f553264c-3f61-4c18-9b41-ab903da0bd7c.jpg',
 'ground106-color.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/444aba04-1b41-40cb-b6f6-963991ee224b.jpg',
 'ground106-normal.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/47f9616b-c63a-442e-884d-618ea8ba92b1.jpg',
 'ground106-roughness.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/cc6ad5ab-5ad6-4ea5-be78-dad326297931.jpg',
 'rock064-color.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/dcdc5915-52cc-4d53-9b1a-c8c143af2263.jpg',
 'rock064-normal.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/26fced80-b920-4eb7-bc5d-92a659ce6d41.jpg',
 'rock064-roughness.jpg':'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/6f87dfda-b6c2-4383-8a18-7eb8640aabeb.jpg'
};
 const tex=(name,color=false)=>{const t=new THREE.TextureLoader().load(TEXTURE_URLS[name]);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;return t;};
 const grass=mat(0xffffff,1,{map:tex('grass004-color.jpg',true),normalMap:tex('grass004-normal.jpg'),roughnessMap:tex('grass004-roughness.jpg')});
 const forest=mat(0xffffff,1,{map:tex('ground106-color.jpg',true),normalMap:tex('ground106-normal.jpg'),roughnessMap:tex('ground106-roughness.jpg')});
 const rock=mat(0xffffff,.98,{map:tex('rock064-color.jpg',true),normalMap:tex('rock064-normal.jpg')});
 const dirt=mat(0xffffff,.98,{map:tex('ground106-color.jpg',true),normalMap:tex('ground106-normal.jpg')});
 const stone=mat(0x88887e),wood=mat(0x725039),darkWood=mat(0x392a20),plaster=mat(0xc5b18c),roof=mat(0x685044);
 const water=new THREE.MeshPhysicalMaterial({color:0x4c9dbb,roughness:.16,transparent:true,opacity:.82,clearcoat:.8,side:THREE.DoubleSide});
 const glowBlue=mat(0xa9edff,.25,{emissive:0x3ac9f2,emissiveIntensity:2.5}),glowGold=mat(0xffe2a0,.25,{emissive:0xff9c37,emissiveIntensity:2}),glowGreen=mat(0xcaff9d,.3,{emissive:0x63e65d,emissiveIntensity:1.7});
 [grass,forest,rock,dirt,stone,wood,darkWood,plaster,roof,water,glowBlue,glowGold,glowGreen].forEach(m=>sharedMats.add(m));
 if(scene){scene.background=new THREE.Color(0x9cc8df);scene.fog=new THREE.Fog(0x9cc8df,9000,26000);}if(camera){camera.far=30000;camera.updateProjectionMatrix();}
 const hemi=new THREE.HemisphereLight(0xd9efff,0x687451,1.45);world.add(hemi);
 if(keyLight){keyLight.color.setHex(0xffe3c0);keyLight.intensity=2.4;keyLight.position.set(-250,420,220);}
 if(rimLight){rimLight.color.setHex(0x83c9ff);rimLight.intensity=.8;}
 const trunkGeo=new THREE.CylinderGeometry(.34,.62,7,7),crownGeo=new THREE.IcosahedronGeometry(3.8,1),grassGeo=new THREE.BufferGeometry();
 grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.08,0,0,.02,.82,0,.08,0,0,0,0,-.08,.02,.68,.02,0,0,.08,-.06,0,.02,.02,.56,.08,.06,0,-.02],3));grassGeo.setIndex([0,1,2,3,4,5,6,7,8]);grassGeo.computeVertexNormals();
 const flowerGeo=new THREE.IcosahedronGeometry(.12,0),rockGeo=new THREE.IcosahedronGeometry(1,1);
 [trunkGeo,crownGeo,grassGeo,flowerGeo,rockGeo].forEach(g=>sharedGeos.add(g));
 const trunkMat=mat(0x705035),leafMat=mat(0xffffff,.98,{vertexColors:true}),grassMat=mat(0x8eb76c,.9,{side:THREE.DoubleSide}),flowerMat=mat(0xffe4a2,.7),rockMat=mat(0xffffff,.98,{map:tex('rock064-color.jpg',true)});
 [trunkMat,leafMat,grassMat,flowerMat,rockMat].forEach(m=>sharedMats.add(m));
 const activityDefs=ASTREA_ACTIVITIES;
 const makeTerrain=(ox,oz)=>{const n=36,p=[],norm=[],uv=[],idx=[],step=size/n;for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const wx=ox+x*step,wz=oz+z*step,y=getAstreaTerrainHeight(wx,wz),dx=getAstreaTerrainHeight(wx+2,wz)-getAstreaTerrainHeight(wx-2,wz),dz=getAstreaTerrainHeight(wx,wz+2)-getAstreaTerrainHeight(wx,wz-2),v=new THREE.Vector3(-dx/4,1,-dz/4).normalize();p.push(x*step,y,z*step);norm.push(v.x,v.y,v.z);uv.push(wx/28,wz/28);}for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;idx.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeBoundingSphere();return g;};
 const addRibbon=(group,pts,width,material,ox,oz,off=.3)=>{if(pts.length<2)return null;const p=[],uv=[],idx=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,sx=-dz/l*width/2,sz=dx/l*width/2,q=pts[i],y=getAstreaTerrainHeight(q.x,q.z)+off;p.push(q.x-sx-ox,y,q.z-sz-oz,q.x+sx-ox,y,q.z+sz-oz);uv.push(0,i/Math.max(1,pts.length-1)*8,1,i/Math.max(1,pts.length-1)*8);if(i<pts.length-1){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,material);group.add(m);return m;};
 const clip=(x1,z1,x2,z2,minX,minZ,maxX,maxZ)=>{let a=0,b=1,dx=x2-x1,dz=z2-z1,pp=[-dx,dx,-dz,dz],qq=[x1-minX,maxX-x1,z1-minZ,maxZ-z1];for(let i=0;i<4;i++){if(Math.abs(pp[i])<1e-9){if(qq[i]<0)return null;}else{const r=qq[i]/pp[i];if(pp[i]<0){if(r>b)return null;if(r>a)a=r;}else{if(r<a)return null;if(r<b)b=r;}}}return[{x:x1+dx*a,z:z1+dz*a},{x:x1+dx*b,z:z1+dz*b}];};
 const addRoads=(g,ox,oz)=>{for(const r of ASTREA_REGIONS.filter(r=>r.id!=='aube')){const s=clip(0,0,r.x,r.z,ox-10,oz-10,ox+size+10,oz+size+10);if(s)addRibbon(g,s,8,dirt,ox,oz,.35);}for(const [a,b] of [[[-95,-155],[500,0]],[[-95,-155],[-125,-255]]]){const s=clip(a[0],a[1],b[0],b[1],ox-10,oz-10,ox+size+10,oz+size+10);if(s)addRibbon(g,s,6.5,dirt,ox,oz,.42);}};
 const addNature=(g,ox,oz,biome,random)=>{const count=biome==='forest'?76:biome==='highlands'?32:biome==='riverlands'?24:biome==='farmland'?8:biome==='wetlands'?18:biome==='coastal'?20:biome==='lake'?14:14,trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count),crowns=new THREE.InstancedMesh(crownGeo,leafMat,count),dummy=new THREE.Object3D();let placed=0,tries=0;while(placed<count&&tries++<count*8){const x=30+random()*(size-60),z=30+random()*(size-60),wx=ox+x,wz=oz+z;if(Math.hypot(wx+95,wz+155)<250||Math.abs(wx-riverX(wz))<65)continue;const s=.75+random()*.7,y=getAstreaTerrainHeight(wx,wz);dummy.position.set(x,y+3.5*s,z);dummy.rotation.y=random()*6.28;dummy.scale.setScalar(s);dummy.updateMatrix();trunks.setMatrixAt(placed,dummy.matrix);dummy.position.y=y+7.8*s;dummy.scale.set(s*1.2,s*1.35,s*1.2);dummy.updateMatrix();crowns.setMatrixAt(placed,dummy.matrix);const colors=biome==='forest'?[0x426d43,0x5d824b,0x779657]:[0x5a844a,0x789a58,0x91a85d];crowns.setColorAt(placed,new THREE.Color(colors[Math.floor(random()*colors.length)]));placed++;}trunks.count=crowns.count=placed;g.add(trunks,crowns);
  const blades=new THREE.InstancedMesh(grassGeo,grassMat,190);for(let i=0;i<190;i++){const x=random()*size,z=random()*size,wx=ox+x,wz=oz+z,dummy2=new THREE.Object3D();if(Math.hypot(wx+95,wz+155)<190||Math.abs(wx-riverX(wz))<45){dummy2.position.set(0,-1000,0);dummy2.scale.setScalar(0);}else{dummy2.position.set(x,getAstreaTerrainHeight(wx,wz),z);dummy2.rotation.y=random()*6.28;const s=.6+random();dummy2.scale.set(s,s,s);}dummy2.updateMatrix();blades.setMatrixAt(i,dummy2.matrix);}g.add(blades);
  const rocks=new THREE.InstancedMesh(rockGeo,rockMat,18);for(let i=0;i<18;i++){const x=random()*size,z=random()*size,s=.5+random()*1.8;dummy.position.set(x,getAstreaTerrainHeight(ox+x,oz+z)+s*.3,z);dummy.rotation.set(random(),random()*6,random());dummy.scale.set(s,s*.7,s*1.2);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}g.add(rocks);
  const flowers=new THREE.InstancedMesh(flowerGeo,flowerMat,32);for(let i=0;i<32;i++){const x=random()*size,z=random()*size;dummy.position.set(x,getAstreaTerrainHeight(ox+x,oz+z)+.6,z);dummy.scale.setScalar(.7+random());dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);}g.add(flowers);
 };
 const addHouse=(g,x,z,s=1)=>{const h=new THREE.Group();h.position.set(x,getAstreaTerrainHeight(x,z),z);h.scale.setScalar(s);g.add(h);const base=new THREE.Mesh(new THREE.BoxGeometry(15,1,12),stone);base.position.y=.5;h.add(base);const body=new THREE.Mesh(new THREE.BoxGeometry(14,7,11),plaster);body.position.y=4.2;h.add(body);for(const xx of [-6.5,6.5])for(const zz of [-5.1,5.1]){const beam=new THREE.Mesh(new THREE.BoxGeometry(.3,7.2,.3),darkWood);beam.position.set(xx,4.1,zz);h.add(beam);}for(const [z0,rot] of [[-2.3,-.48],[2.3,.48]]){const panel=new THREE.Mesh(new THREE.BoxGeometry(16,.5,7),roof);panel.position.set(0,8,z0);panel.rotation.x=rot;h.add(panel);}const door=new THREE.Mesh(new THREE.BoxGeometry(2,4,.2),wood);door.position.set(0,2.5,5.7);h.add(door);for(const xw of [-4.2,4.2]){const win=new THREE.Mesh(new THREE.BoxGeometry(2,2,.15),glowBlue);win.position.set(xw,4.7,5.7);h.add(win);}const chimney=new THREE.Mesh(new THREE.BoxGeometry(1.4,3,1.4),stone);chimney.position.set(4,9,-3);h.add(chimney);};
 const buildVillage=g=>{const plaza=new THREE.Mesh(new THREE.PlaneGeometry(95,72),stone);plaza.rotation.x=-Math.PI/2;plaza.position.set(-95,getAstreaTerrainHeight(-95,-155)+.3,-155);g.add(plaza);[[-150,-205,1.05],[-65,-245,.92],[8,-205,1.1],[-190,-130,.9],[-20,-105,1],[95,-205,1],[105,-105,.85]].forEach(a=>addHouse(g,...a));const fountain=new THREE.Group();fountain.position.set(-95,getAstreaTerrainHeight(-95,-155),-155);g.add(fountain);const basin=new THREE.Mesh(new THREE.CylinderGeometry(7,7.6,1.1,16),stone);basin.position.y=.55;fountain.add(basin);const top=new THREE.Mesh(new THREE.CylinderGeometry(6.1,6.1,.12,24),water);top.position.y=1.12;fountain.add(top);const pillar=new THREE.Mesh(new THREE.CylinderGeometry(1,1.4,4.8,8),stone);pillar.position.y=3.2;fountain.add(pillar);const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(1.25,1),glowBlue);crystal.position.y=6.1;fountain.add(crystal);const light=new THREE.PointLight(0x61d7ff,2.2,34,2);light.position.y=5.8;fountain.add(light);glows.push({light,base:2.2,phase:.7,owner:g});
  for(let i=0;i<3;i++){const stall=new THREE.Group();stall.position.set(-155+i*31,getAstreaTerrainHeight(-155+i*31,-155),-155);g.add(stall);const table=new THREE.Mesh(new THREE.BoxGeometry(12,1.4,5),wood);table.position.y=1.4;stall.add(table);const canopy=new THREE.Mesh(new THREE.BoxGeometry(14,.5,7),mat([0xb5a16c,0x8d4d46,0x4f7891][i]));canopy.position.y=7;stall.add(canopy);for(const x of [-5.5,5.5])for(const z of [-2.5,2.5]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,6.8,6),darkWood);post.position.set(x,3.5,z);stall.add(post);}}
  const forge=new THREE.Group();forge.position.set(65,getAstreaTerrainHeight(65,-155),-155);g.add(forge);const base=new THREE.Mesh(new THREE.BoxGeometry(13,5,10),stone);base.position.y=2.5;forge.add(base);const fire=new THREE.Mesh(new THREE.SphereGeometry(1.3,12,10),glowGold);fire.position.set(0,5.2,3);forge.add(fire);const fireLight=new THREE.PointLight(0xff8a38,2.8,30,2);fireLight.position.copy(fire.position);forge.add(fireLight);glows.push({light:fireLight,base:2.8,phase:2.1,owner:g});
  const well=new THREE.Group();well.position.set(-35,getAstreaTerrainHeight(-35,-95),-95);g.add(well);const ring=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3,1.4,12),stone);ring.position.y=.7;well.add(ring);const cap=new THREE.Mesh(new THREE.ConeGeometry(3.4,2.6,4),roof);cap.position.y=4.4;cap.rotation.y=Math.PI/4;well.add(cap);
 };
 const buildBridge=g=>{const b=new THREE.Group();b.position.set(500,getAstreaTerrainHeight(500,0)+1.2,0);g.add(b);const deck=new THREE.Mesh(new THREE.BoxGeometry(62,1.4,13),stone);b.add(deck);for(const side of [-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(62,1.2,.55),stone);rail.position.set(0,1.15,side*6.1);b.add(rail);for(let i=-5;i<=5;i++){const post=new THREE.Mesh(new THREE.BoxGeometry(.7,1.7,.7),stone);post.position.set(i*5.3,1.45,side*6.1);b.add(post);}}};
 const addRiver=(g,ox,oz)=>{const pts=[];for(let i=0;i<=24;i++){const z=oz-15+(size+30)*i/24,x=riverX(z);if(x>ox-90&&x<ox+size+90)pts.push({x,z});}if(pts.length<2)return;const m=addRibbon(g,pts,38,water,ox,oz,.72);if(m)waterMeshes.push({mesh:m,base:m.geometry.attributes.position.array.slice(),phase:oz*.001,owner:g});};
 const addRegionalLandmark=(g,d,ox,oz)=>{const root=new THREE.Group();root.position.set(d.x-ox,getAstreaTerrainHeight(d.x,d.z),d.z-oz);g.add(root);const add=(geo,material,x,y,z,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};const light=(color,intensity,range,y)=>{const l=new THREE.PointLight(color,intensity,range,2);l.position.y=y;root.add(l);glows.push({light:l,base:intensity,phase:1.1,owner:g});};
  if(d.kind==='ancient-tree'){add(new THREE.CylinderGeometry(5,9,34,10),wood,0,17,0);for(let i=0;i<5;i++){const c=add(new THREE.IcosahedronGeometry(17+i%2*3,1),leafMat,Math.sin(i*1.25)*11,37+(i%2)*5,Math.cos(i*1.25)*10);c.material=leafMat.clone();c.material.color.setHex([0x477c50,0x6c9d60,0x86b875][i%3]);}for(let i=0;i<4;i++)add(new THREE.TorusGeometry(8+i*2,.18,6,40),glowGreen,0,2+i*.7,0,Math.PI/2);light(0x78ffad,2.4,90,20);}
  else if(d.kind==='windmill'){add(new THREE.CylinderGeometry(5,7,22,8),plaster,0,11,0);add(new THREE.ConeGeometry(7,8,8),roof,0,26,0);add(new THREE.SphereGeometry(1.5,10,8),glowGold,0,22,6);for(let i=0;i<4;i++)add(new THREE.BoxGeometry(1.1,19,2),wood,0,22,6,0,0,i*Math.PI/2);light(0xffd47a,1.4,45,14);}
  else if(d.kind==='spire'){for(let i=0;i<5;i++)add(new THREE.CylinderGeometry(4-i*.55,8-i*.5,17+i*4,6),rock,Math.sin(i*1.3)*2,9+i*14,Math.cos(i*1.3)*2);add(new THREE.OctahedronGeometry(5,1),glowBlue,0,93,0);light(0x65d9ff,3.2,110,82);}
  else if(d.kind==='lighthouse'){add(new THREE.CylinderGeometry(5,8,32,12),plaster,0,16,0);add(new THREE.CylinderGeometry(6,5,3,12),wood,0,33,0);add(new THREE.ConeGeometry(7,6,8),roof,0,38,0);add(new THREE.SphereGeometry(2.2,12,10),glowBlue,0,34,0);light(0x68dfff,3.8,130,34);}
  else if(d.kind==='aqueduct'){for(let i=0;i<5;i++){const x=(i-2)*13;add(new THREE.BoxGeometry(2,18,3),stone,x,9,0);add(new THREE.TorusGeometry(6,1.1,8,18,Math.PI),stone,x,15,0,Math.PI/2,Math.PI,0);}add(new THREE.BoxGeometry(72,2.5,8),stone,0,20,0);add(new THREE.BoxGeometry(68,.6,4),glowBlue,0,21.4,0);light(0x64dfff,1.5,70,22);}
  else if(d.kind==='watchtower'){add(new THREE.CylinderGeometry(5,7,28,8),stone,0,14,0);add(new THREE.ConeGeometry(8,7,8),roof,0,31.5,0);for(let i=0;i<4;i++)add(new THREE.BoxGeometry(1.2,7,1.2),wood,Math.cos(i*Math.PI/2)*5,28,Math.sin(i*Math.PI/2)*5);add(new THREE.SphereGeometry(1.2,10,8),glowGold,0,32,0);light(0xffbd69,1.8,60,30);}
  else {add(new THREE.CylinderGeometry(3,7,30,9),wood,0,15,0);for(let i=0;i<7;i++){add(new THREE.CylinderGeometry(.7,1.3,19,5),wood,Math.sin(i*.9)*7,27,Math.cos(i*.9)*7,0,0,(i-3)*.13);add(new THREE.IcosahedronGeometry(7,1),glowGreen,Math.sin(i*.9)*10,38,Math.cos(i*.9)*10);}for(let i=0;i<3;i++)add(new THREE.TorusGeometry(7+i*3,.12,6,32),glowBlue,0,5+i*2,0,Math.PI/2);light(0x8dffc1,2.8,95,25);}
  landmarks.push({id:d.regionId,name:d.name,mesh:root,owner:g});return root;};
 const addActivity=(g,d,ox,oz)=>{const root=new THREE.Group();root.position.set(d.x-ox,getAstreaTerrainHeight(d.x,d.z),d.z-oz);g.add(root);if(d.kind==='herb'){for(let i=0;i<5;i++){const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.8,5),glowGreen);stem.position.set(Math.sin(i*1.3)*.3,.4,Math.cos(i*1.3)*.3);root.add(stem);}}else if(d.kind==='wood'){for(let i=0;i<3;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.4,.45,2.8,8),wood);log.rotation.z=Math.PI/2;log.position.y=.5+i*.5;root.add(log);}}else if(d.kind==='ore'){const b=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2,1),rock);b.position.y=.9;root.add(b);for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.5),glowBlue);c.position.set(Math.sin(i*2)*.7,1.3,Math.cos(i*2)*.7);c.scale.y=1.6;root.add(c);}}else if(d.kind==='fish'){const dock=new THREE.Mesh(new THREE.BoxGeometry(9,.5,4),wood);dock.position.set(-7,1.3,0);root.add(dock);}else if(d.kind==='crop'){for(let i=0;i<8;i++){const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.03,.05,1.5,5),glowGold);stalk.position.set((i%4-1.5)*.4,.75,(Math.floor(i/4)-.5)*.5);root.add(stalk);}}else{const p=new THREE.Mesh(new THREE.CylinderGeometry(2,2.5,5,8),stone);p.position.y=2.5;root.add(p);const rune=new THREE.Mesh(new THREE.TorusGeometry(1.5,.08,8,32),glowBlue);rune.position.y=4.1;rune.rotation.x=Math.PI/2;root.add(rune);const c=new THREE.Mesh(new THREE.OctahedronGeometry(.9,1),glowBlue);c.position.y=5.4;root.add(c);const l=new THREE.PointLight(0x54cfff,1.7,20,2);l.position.y=4.5;root.add(l);glows.push({light:l,base:1.7,phase:1.4,owner:g});}activities.push({...d,mesh:root,availableAt:0});};
 const addNpcs=g=>{if(!npcFactory)return;[[-80,-80],[-30,-220],[75,-125],[-175,-145]].forEach(([x,z],i)=>{try{const n=npcFactory();if(!n)return;n.position.set(x,getAstreaTerrainHeight(x,z),z);n.rotation.y=i*1.7;n.scale.multiplyScalar(.94+i*.025);n.traverse(o=>{if(o.isMesh){sharedGeos.add(o.geometry);o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});g.add(n);npcs.push({mesh:n,y:n.position.y,phase:i*1.7,owner:g});}catch(e){console.warn('NPC non chargé',e);}});};
 const disposeChunk=g=>g.traverse(o=>{if(o.geometry&&!sharedGeos.has(o.geometry))o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(!sharedMats.has(m))m.dispose?.();});}});
 const buildChunk=(ix,iz)=>{const ox=ix*size,oz=iz*size,biome=getAstreaBiomeAt(ox+size/2,oz+size/2),g=new THREE.Group();g.position.set(ox,0,oz);const ground=new THREE.Mesh(makeTerrain(ox,oz),biome==='forest'||biome==='wetlands'?forest:biome==='highlands'||biome==='coastal'?rock:grass);ground.receiveShadow=true;g.add(ground);addNature(g,ox,oz,biome,rng(hash(ix,iz)));addRoads(g,ox,oz);addRiver(g,ox,oz);if(ix===0&&iz===0){buildVillage(g);buildBridge(g);addNpcs(g);}for(const landmark of ASTREA_LANDMARKS){if(landmark.x>=ox&&landmark.x<ox+size&&landmark.z>=oz&&landmark.z<oz+size)addRegionalLandmark(g,landmark,ox,oz);}for(const d of activityDefs){if(d.x>=ox&&d.x<ox+size&&d.z>=oz&&d.z<oz+size)addActivity(g,d,ox,oz);}world.add(g);g.userData.key=ix+':'+iz;chunks.set(g.userData.key,g);};
 const updateStreaming=pos=>{const cx=Math.floor((pos?.x||0)/size),cz=Math.floor((pos?.z||0)/size),r=ASTREA_CONTINENT.activeRadius;for(let z=cz-r;z<=cz+r;z++)for(let x=cx-r;x<=cx+r;x++){const k=x+':'+z;if(!chunks.has(k))buildChunk(x,z);}for(const [k,g] of chunks){const [x,z]=k.split(':').map(Number);if(Math.abs(x-cx)>r+1||Math.abs(z-cz)>r+1){world.remove(g);activities.splice(0,activities.length,...activities.filter(a=>a.mesh.parent!==g));waterMeshes.splice(0,waterMeshes.length,...waterMeshes.filter(a=>a.owner!==g));glows.splice(0,glows.length,...glows.filter(a=>a.owner!==g));npcs.splice(0,npcs.length,...npcs.filter(a=>a.owner!==g));landmarks.splice(0,landmarks.length,...landmarks.filter(a=>a.owner!==g));disposeChunk(g);chunks.delete(k);}}};
 const nearby=pos=>{let found=null,d0=8;for(const a of activities){if(a.availableAt>Date.now()||!a.mesh.visible)continue;const d=Math.hypot(pos.x-a.x,pos.z-a.z);if(d<d0){found=a;d0=d;}}return found?{id:found.id,prompt:found.prompt,distance:d0}:null;};
 const interact=pos=>{const near=nearby(pos),a=activities.find(v=>v.id===near?.id);if(!a)return null;const amount=a.min+Math.floor(Math.random()*(a.max-a.min+1));a.mesh.visible=false;a.availableAt=Date.now()+60000;return{resource:a.resource,amount,message:({herbs:'Plantes médicinales cueillies',wood:'Bois récupéré',stone:'Minerai extrait',fish:'Poisson pêché',crops:'Céréales récoltées',relics:'Fragment ancien découvert'})[a.resource]};};
 const updateVFX=(time,dt)=>{const phase=(time%720000)/720000*Math.PI*2,day=clamp(.18+.82*(Math.sin(phase-Math.PI/2)+1)*.5,.18,1);if(keyLight){keyLight.intensity=.45+day*2.1;keyLight.position.set(Math.cos(phase)*360,180+Math.sin(phase)*180,Math.sin(phase)*300);}hemi.intensity=.55+day;if(scene?.fog){const c=new THREE.Color().setRGB(.035+day*.48,.06+day*.58,.09+day*.64);scene.fog.color.copy(c);scene.background.copy(c);}if(rimLight)rimLight.intensity=.22+day*.62;for(const q of glows)q.light.intensity=q.base*(.88+Math.sin(time*.0015+q.phase)*.12);for(const q of waterMeshes){const a=q.mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)a.array[i*3+1]=q.base[i*3+1]+Math.sin(time*.0017+q.phase+i*.16)*.045;a.needsUpdate=true;}for(const q of npcs)q.mesh.position.y=q.y+Math.sin(time*.0012+q.phase)*.025;for(const a of activities)if(!a.mesh.visible&&a.availableAt<=Date.now())a.mesh.visible=true;};
 const dispose=()=>{for(const g of chunks.values()){world.remove(g);disposeChunk(g);}chunks.clear();activities.length=0;waterMeshes.length=0;glows.length=0;npcs.length=0;landmarks.length=0;for(const m of sharedMats)m.dispose?.();for(const g of sharedGeos)g.dispose?.();};
 Object.assign(world.userData,{getHeightAt:getAstreaTerrainHeight,getRegionAt:getAstreaRegionAt,getBiomeAt:getAstreaBiomeAt,getNearbyActivity:nearby,getLandmarks:()=>landmarks.map(({id,name,mesh})=>({id,name,position:mesh.position.clone()})),interact,updateStreaming,updateVFX,dispose});
 updateStreaming({x:0,z:0});return world.userData;
}
