(function(){
"use strict";

const REGION_KEYS=[
 null,"chest","frontDelts","sideDelts","rearDelts","triceps","biceps","forearms","lats","upperBack",
 "traps","spinalErectors","abs","obliques","glutes","quads","hamstrings","adductors","calves","hipFlexors","scapular"
];
const KEY_TO_ID=Object.fromEntries(REGION_KEYS.map((k,i)=>[k,i]).filter(x=>x[0]));
const MODEL_URL="assets/caglar-body.glb";

// Approximate joint anchors calibrated to the current single-mesh GLB scene coordinates.
// Anatomical left appears on screen-right in the front camera, therefore left uses +x.
const JOINT_POINTS={
 shoulder:{left:[ .145,.905,.018],right:[-.145,.905,.018]},
 elbow:{left:[ .166,.755,.014],right:[-.166,.755,.014]},
 wrist:{left:[ .174,.590,.018],right:[-.174,.590,.018]},
 hand:{left:[ .174,.535,.025],right:[-.174,.535,.025]},
 hip:{left:[ .075,.565,.012],right:[-.075,.565,.012]},
 knee:{left:[ .073,.305,.014],right:[-.073,.305,.014]},
 ankle:{left:[ .055,.080,.016],right:[-.055,.080,.016]},
 foot:{left:[ .058,.038,.060],right:[-.058,.038,.060]},
 neck:{midline:[0,.982,.008]},
 upperBack:{midline:[0,.840,-.035]},
 lowBack:{midline:[0,.690,-.040]}
};


let canvas,gl,program;
let positionBuffer,normalBuffer,uvBuffer,indexBuffer,indexCount=0,indexType=null;
let texture=null;
let modelReady=false,lastStim={};
let yaw=0,pitch=0,distance=2.15,selectedId=0;
let drag=false,lastX=0,lastY=0,pointerMoved=false,drawQueued=false;
let attrib={},uni={};

const VS=`#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUV;
uniform mat4 uProj;
uniform float uYaw;
uniform float uPitch;
uniform float uDistance;
uniform vec3 uCenter;
out vec3 vScenePos;
out vec3 vNormal;
out vec2 vUV;
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
void main(){
 vec3 scenePos=vec3(aPosition.x,-aPosition.z,aPosition.y);
 vec3 sceneNormal=normalize(vec3(aNormal.x,-aNormal.z,aNormal.y));
 vScenePos=scenePos;vNormal=sceneNormal;vUV=aUV;
 vec3 p=scenePos-uCenter;p=rotY(p,uYaw);p=rotX(p,uPitch);p.z-=uDistance;
 gl_Position=uProj*vec4(p,1.0);
}`;

const FS=`#version 300 es
precision highp float;
in vec3 vScenePos;
in vec3 vNormal;
in vec2 vUV;
uniform sampler2D uBase;
uniform vec4 uRegionColors[21];
uniform bool uPickMode;
uniform int uSelectedRegion;
out vec4 outColor;
float E(float x,float y,float cx,float cy,float rx,float ry){float dx=(x-cx)/rx,dy=(y-cy)/ry;return dx*dx+dy*dy;}
int classify(vec3 p, vec3 n){
 float ax=abs(p.x), y=p.y, z=p.z;
 float facing=n.z*0.72 + z*4.4;
 bool front=facing>0.025;
 bool back=facing<-0.025;
 bool side=abs(n.x)>0.48;

 // Model-specific calibration for this GLB:
 // total body height ~= 1.1753 scene units.
 if(y<0.055 || y>0.990) return 0;

 // Lower leg / calf.
 if(y>0.065 && y<0.295 && ax>0.025 && ax<0.118) return 18;

 // Thigh.
 if(y>0.295 && y<0.545 && ax>0.015 && ax<0.120){
   if(front){
     // inner thigh / adductor
     if(ax<0.050 && y>0.350) return 17;
     return 15;
   }
   if(back) return 16;
   return 0;
 }

 // Pelvis: glute / hip flexor.
 if(y>0.515 && y<0.655 && ax<0.122){
   if(z<-0.005 || back) return 14;
   if(z>0.010 || front){
     if(ax<0.103) return 19;
   }
 }

 // Forearms. Exclude hand area below this band.
 if(y>0.575 && y<0.770 && ax>0.105 && ax<0.182) return 7;

 // Upper arms.
 if(y>0.745 && y<0.895 && ax>0.100 && ax<0.182){
   if(front) return 6;
   if(back) return 5;
   return 0;
 }

 // Shoulder cap.
 if(y>0.865 && y<0.975 && ax>0.078 && ax<0.176){
   if(side) return 3;
   if(front) return 2;
   if(back) return 4;
   return 3;
 }

 // Front torso.
 if(front && ax<0.126){
   if(y>0.790 && y<0.915 && ax<0.116) return 1;
   if(y>0.625 && y<0.800 && ax<0.056) return 12;
   if(y>0.620 && y<0.805 && ax>=0.050 && ax<0.122) return 13;
 }

 // Lateral torso: classify anterior side as oblique and posterior side as lat.
 if(side && y>0.630 && y<0.805 && ax>0.074 && ax<0.132){
   if(z>0.012) return 13;
   if(z<-0.004) return 8;
 }

 // Back torso.
 if((back || z<-0.010) && ax<0.132){
   if(y>0.885 && y<0.978 && ax<0.112) return 10;
   if(y>0.820 && y<0.905 && ax>0.025 && ax<0.092) return 20;
   if(y>0.790 && y<0.895 && ax<0.122) return 9;
   if(y>0.655 && y<0.825 && ax>0.043 && ax<0.126) return 8;
   if(y>0.620 && y<0.795 && ax<0.041) return 11;
 }

 return 0;
}
void main(){
 int region=classify(vScenePos,normalize(vNormal));
 if(uPickMode){outColor=vec4(float(region)/255.0,0.0,0.0,1.0);return;}
 vec4 base=texture(uBase,vUV);
 vec3 n=normalize(vNormal);vec3 lightDir=normalize(vec3(0.45,0.85,0.55));
 float diffuse=max(dot(n,lightDir),0.0)*0.48+0.58;vec3 rgb=base.rgb*diffuse;
 vec4 ov=uRegionColors[region];
 if(region==uSelectedRegion && region>0){
   ov.rgb=vec3(0.035,0.36,1.0);
   ov.a=0.82;
   rgb=mix(rgb,vec3(0.02,0.28,1.0),0.24);
 }
 rgb=mix(rgb,ov.rgb,ov.a);outColor=vec4(rgb,1.0);
}`;

function q(id){return document.getElementById(id)}
function status(t,bad=false){const el=q("bodyMap3DStatus");if(el){el.textContent=t;el.classList.toggle("bad",bad)}}
function setLoading(show,text){const el=q("bodyMap3DLoading");if(!el)return;el.classList.toggle("hidden",!show);if(text){const s=el.querySelector("strong");if(s)s.textContent=text}}
function compile(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh}
function createProgram(){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,(2*far*near)*nf,0])}
function resize(){if(!canvas||!gl)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);requestDraw()}
function requestDraw(){if(drawQueued)return;drawQueued=true;requestAnimationFrame(()=>{drawQueued=false;draw(false)})}
function rgba(css){const m=String(css||"").match(/rgba?\(([^)]+)\)/i);if(!m)return [0.45,0.45,0.45,0.18];const p=m[1].split(",").map(Number);return [p[0]/255,p[1]/255,p[2]/255,p[3]==null?1:p[3]]}
function regionColors(){const colors=new Float32Array(84);REGION_KEYS.forEach((key,id)=>{if(!key)return;let metric;try{metric=overlayMetric(key,lastStim)}catch(e){metric={color:"rgba(130,130,130,.25)",available:false}}let c=rgba(metric.color);c[3]=metric.available===false?0.10:Math.min(0.64,Math.max(0.22,c[3]||0.45));colors.set(c,id*4)});return colors}

function rotateYPoint(p,a){const c=Math.cos(a),s=Math.sin(a);return [c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]]}
function rotateXPoint(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],c*p[1]-s*p[2],s*p[1]+c*p[2]]}
function projectScenePoint(point){
 if(!canvas||!point)return null;
 let p=[point[0]-0.0017,point[1]-0.58766,point[2]-0.00948];
 p=rotateYPoint(p,yaw);p=rotateXPoint(p,pitch);p[2]-=distance;
 if(p[2]>=-.02)return null;
 const f=1/Math.tan((Math.PI/5)/2),aspect=canvas.width/canvas.height;
 const ndcX=(f/aspect*p[0])/(-p[2]),ndcY=(f*p[1])/(-p[2]);
 if(Math.abs(ndcX)>1.25||Math.abs(ndcY)>1.25)return null;
 return {x:(ndcX*.5+.5)*canvas.clientWidth,y:(1-(ndcY*.5+.5))*canvas.clientHeight,depth:-p[2]};
}
function pointsForHotspot(h){
 const pts=JOINT_POINTS[h.joint];if(!pts)return[];
 if(h.side==="bilateral")return [["left",pts.left],["right",pts.right]].filter(x=>x[1]);
 if(h.side==="midline")return [["midline",pts.midline||pts.left||pts.right]].filter(x=>x[1]);
 return [[h.side,pts[h.side]||pts.midline]].filter(x=>x[1]);
}
function renderJointHotspots(focusId=null){
 const layer=q("bodyMapJointMarkers");if(!layer)return;
 const painMode=(typeof bodymapOverlayMode!=="undefined"&&bodymapOverlayMode==="pain");
 const hotspots=window.PainIntelligence?.activeHotspots?.()||[];
 layer.hidden=!painMode||!hotspots.length;
 if(layer.hidden){layer.innerHTML="";return}
 const html=[];
 hotspots.forEach(h=>pointsForHotspot(h).forEach(([side,pt],idx)=>{
   const s=projectScenePoint(pt);if(!s)return;
   const sev=Math.max(1,Math.min(10,+h.severity||0)),size=18+sev*1.4;
   html.push(`<button type="button" class="joint-hotspot ${h.redFlag?"redflag":""} ${focusId===h.id?"focused":""}" data-pain-hotspot="${h.id}" style="left:${s.x}px;top:${s.y}px;width:${size}px;height:${size}px" title="${h.label} · ${sev}/10"><span>${sev}</span></button>`);
 }));
 layer.innerHTML=html.join("");
 layer.querySelectorAll("[data-pain-hotspot]").forEach(b=>b.onclick=e=>{e.stopPropagation();window.PainIntelligence?.open3D?.(b.dataset.painHotspot)});
}
function focusPainEntry(entryId){
 const r=window.PainIntelligence?.findEntry?.(entryId);if(!r)return;
 if(["upperBack","lowBack"].includes(r.joint)){yaw=Math.PI;pitch=0}
 else if(r.side==="left"){yaw=-.18;pitch=0}
 else if(r.side==="right"){yaw=.18;pitch=0}
 else{yaw=0;pitch=0}
 requestDraw();
 setTimeout(()=>renderJointHotspots(entryId),30);
 const s=q("bodyMap3DSelection");if(s)s.textContent=`Pain hotspot: ${window.PainIntelligence?.entryLabel?.(r)||r.joint} · ${r.severity}/10`;
}
function refreshPainHotspots(){requestDraw()}

function draw(pickMode){if(!modelReady||!gl)return;gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(pickMode?0:0.055,pickMode?0:0.075,pickMode?0:0.10,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
 gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.enableVertexAttribArray(attrib.pos);gl.vertexAttribPointer(attrib.pos,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);gl.enableVertexAttribArray(attrib.normal);gl.vertexAttribPointer(attrib.normal,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,uvBuffer);gl.enableVertexAttribArray(attrib.uv);gl.vertexAttribPointer(attrib.uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
 gl.uniformMatrix4fv(uni.proj,false,perspective(Math.PI/5,canvas.width/canvas.height,0.01,10));gl.uniform1f(uni.yaw,yaw);gl.uniform1f(uni.pitch,pitch);gl.uniform1f(uni.distance,distance);gl.uniform3f(uni.center,0.0017,0.58766,0.00948);gl.uniform1i(uni.pickMode,pickMode?1:0);gl.uniform1i(uni.selected,selectedId);gl.uniform4fv(uni.colors,regionColors());gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uni.base,0);gl.drawElements(gl.TRIANGLES,indexCount,indexType,0);if(!pickMode)renderJointHotspots()}
function parseGLB(buffer){const dv=new DataView(buffer);if(dv.getUint32(0,true)!==0x46546c67)throw new Error("Geçerli GLB değil");if(dv.getUint32(4,true)!==2)throw new Error("GLB 2.0 gerekli");let o=12,json=null,bin=null;while(o<buffer.byteLength){const len=dv.getUint32(o,true),type=dv.getUint32(o+4,true);o+=8;if(type===0x4E4F534A)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,o,len)).replace(/\0+$/,'').trim());else if(type===0x004E4942)bin=new Uint8Array(buffer,o,len);o+=len}if(!json||!bin)throw new Error("GLB JSON/BIN chunk eksik");return {json,bin}}
function comps(type){return {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[type]||1}
function typedAccessor(parsed,index){const a=parsed.json.accessors[index],bv=parsed.json.bufferViews[a.bufferView],off=(bv.byteOffset||0)+(a.byteOffset||0),n=a.count*comps(a.type),absolute=parsed.bin.byteOffset+off;if(a.componentType===5126)return new Float32Array(parsed.bin.buffer,absolute,n);if(a.componentType===5125)return new Uint32Array(parsed.bin.buffer,absolute,n);if(a.componentType===5123)return new Uint16Array(parsed.bin.buffer,absolute,n);throw new Error("Desteklenmeyen componentType "+a.componentType)}
async function imageFromBufferView(parsed,bvIndex,mime){const bv=parsed.json.bufferViews[bvIndex],bytes=new Uint8Array(parsed.bin.buffer,parsed.bin.byteOffset+(bv.byteOffset||0),bv.byteLength),blob=new Blob([bytes],{type:mime||"image/png"}),url=URL.createObjectURL(blob),img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});URL.revokeObjectURL(url);return img}
function makeTextureFromImage(img){const max=2048,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext("2d").drawImage(img,0,0,c.width,c.height);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return tex}
function uploadBuffer(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b}
async function loadArrayBuffer(buffer){setLoading(true,"3D beden modeli hazırlanıyor");const parsed=parseGLB(buffer),mesh=parsed.json.meshes[0].primitives[0],pos=typedAccessor(parsed,mesh.attributes.POSITION),nor=typedAccessor(parsed,mesh.attributes.NORMAL),uv=typedAccessor(parsed,mesh.attributes.TEXCOORD_0),ind=typedAccessor(parsed,mesh.indices);positionBuffer=uploadBuffer(gl.ARRAY_BUFFER,pos);normalBuffer=uploadBuffer(gl.ARRAY_BUFFER,nor);uvBuffer=uploadBuffer(gl.ARRAY_BUFFER,uv);indexBuffer=uploadBuffer(gl.ELEMENT_ARRAY_BUFFER,ind);indexCount=ind.length;indexType=ind instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;const mat=parsed.json.materials[mesh.material||0],texDef=parsed.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index],imageDef=parsed.json.images[texDef.source],img=await imageFromBufferView(parsed,imageDef.bufferView,imageDef.mimeType);texture=makeTextureFromImage(img);modelReady=true;setLoading(false);status(`Hazır · ${(ind.length/3/1e6).toFixed(2)}M triangle · Precision v2`);try{if(typeof muscleStimulus==="function")update(muscleStimulus(typeof muscleReportDays!=="undefined"?muscleReportDays:7));}catch(e){}resize();requestDraw()}
function fetchModel(){setLoading(true,"3D beden modeli yükleniyor");const xhr=new XMLHttpRequest();xhr.open("GET",MODEL_URL,true);xhr.responseType="arraybuffer";xhr.onprogress=e=>{if(e.lengthComputable)status(`Yükleniyor %${Math.round(e.loaded/e.total*100)}`)};xhr.onload=()=>{if(xhr.status===200||xhr.status===0)loadArrayBuffer(xhr.response).catch(fail);else fail(new Error("HTTP "+xhr.status))};xhr.onerror=()=>fail(new Error("Model isteği başarısız"));try{xhr.send()}catch(e){fail(e)}}
function fail(err){console.error("BodyMap3D",err);setLoading(false);status("3D model yüklenemedi",true);const f=q("modelFileFallback");if(f)f.hidden=false;const w=q("bodyMapProtocolWarning");if(w)w.hidden=false}
function pickAt(clientX,clientY,showTooltip){if(!modelReady)return 0;const r=canvas.getBoundingClientRect(),x=Math.floor((clientX-r.left)/r.width*canvas.width),y=Math.floor((r.bottom-clientY)/r.height*canvas.height);draw(true);const px=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);draw(false);const id=px[0],tip=q("bodyMap3DTooltip");if(showTooltip&&tip){if(id>0&&REGION_KEYS[id]){const key=REGION_KEYS[id],metric=overlayMetric(key,lastStim),label=V5_MUSCLES[key]?.label||key;tip.hidden=false;tip.innerHTML=`<strong>${label}</strong>${metric.label}<br>${metric.sub}<small>Tıklayarak kas analizini aç</small>`;let tx=clientX-r.left+14,ty=clientY-r.top+14;tx=Math.min(tx,r.width-245);ty=Math.min(ty,r.height-100);tip.style.left=Math.max(6,tx)+"px";tip.style.top=Math.max(6,ty)+"px"}else tip.hidden=true}return id}
function selectRegion(id,clientX=null,clientY=null){
 if(!id||!REGION_KEYS[id])return;
 selectedId=id;
 const marker=q("bodyMap3DMarker");
 if(marker&&clientX!=null&&clientY!=null){
   const r=canvas.getBoundingClientRect();
   marker.style.left=(clientX-r.left)+"px";
   marker.style.top=(clientY-r.top)+"px";
   marker.hidden=false;
 }else if(marker){
   marker.hidden=true;
 }const key=REGION_KEYS[id];if(typeof selectedMuscleKey!=="undefined")selectedMuscleKey=key;const s=q("bodyMap3DSelection");if(s)s.textContent=`Seçili: ${V5_MUSCLES[key]?.label||key}`;requestDraw();if(typeof renderMuscleDetail==="function")renderMuscleDetail(key,muscleStimulus(muscleReportDays));if(typeof renderMuscleTrend==="function")renderMuscleTrend(key);document.querySelectorAll("[data-muscle-chip]").forEach(b=>b.classList.toggle("active",b.dataset.muscleChip===key))}
function bindControls(){canvas.addEventListener("pointerdown",e=>{drag=true;pointerMoved=false;lastX=e.clientX;lastY=e.clientY;const marker=q("bodyMap3DMarker");if(marker)marker.hidden=true;canvas.setPointerCapture(e.pointerId);canvas.classList.add("dragging")});canvas.addEventListener("pointermove",e=>{if(drag){const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>2)pointerMoved=true;yaw+=dx*.009;pitch=Math.max(-.65,Math.min(.65,pitch+dy*.006));lastX=e.clientX;lastY=e.clientY;requestDraw()}else{clearTimeout(canvas._hoverTimer);canvas._hoverTimer=setTimeout(()=>pickAt(e.clientX,e.clientY,true),110)}});canvas.addEventListener("pointerup",e=>{if(!pointerMoved)selectRegion(pickAt(e.clientX,e.clientY,false),e.clientX,e.clientY);drag=false;canvas.classList.remove("dragging")});canvas.addEventListener("pointerleave",()=>{const t=q("bodyMap3DTooltip");if(t)t.hidden=true});canvas.addEventListener("wheel",e=>{e.preventDefault();distance=Math.max(1.15,Math.min(4,distance+e.deltaY*.0015));requestDraw()},{passive:false});document.querySelectorAll(".camera-preset").forEach(b=>b.addEventListener("click",()=>{const marker=q("bodyMap3DMarker");if(marker)marker.hidden=true;const v=b.dataset.camera;if(v==="front"){yaw=0;pitch=0}if(v==="back"){yaw=Math.PI;pitch=0}if(v==="left"){yaw=-Math.PI/2;pitch=0}if(v==="right"){yaw=Math.PI/2;pitch=0}document.querySelectorAll(".camera-preset[data-camera]").forEach(x=>x.classList.toggle("active",x===b));requestDraw()}));q("bodyMapResetCamera")?.addEventListener("click",()=>{yaw=0;pitch=0;distance=2.15;requestDraw()});q("bodyMapModelFile")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{await loadArrayBuffer(await f.arrayBuffer());q("bodyMapProtocolWarning").hidden=true}catch(err){fail(err)}});window.addEventListener("resize",resize)}
function initGL(){canvas=q("bodyMap3DCanvas");if(!canvas)return false;gl=canvas.getContext("webgl2",{antialias:true,alpha:false});if(!gl){status("WebGL2 desteklenmiyor",true);return false}program=createProgram();attrib.pos=gl.getAttribLocation(program,"aPosition");attrib.normal=gl.getAttribLocation(program,"aNormal");attrib.uv=gl.getAttribLocation(program,"aUV");uni.proj=gl.getUniformLocation(program,"uProj");uni.yaw=gl.getUniformLocation(program,"uYaw");uni.pitch=gl.getUniformLocation(program,"uPitch");uni.distance=gl.getUniformLocation(program,"uDistance");uni.center=gl.getUniformLocation(program,"uCenter");uni.base=gl.getUniformLocation(program,"uBase");uni.colors=gl.getUniformLocation(program,"uRegionColors[0]");uni.pickMode=gl.getUniformLocation(program,"uPickMode");uni.selected=gl.getUniformLocation(program,"uSelectedRegion");bindControls();return true}
function update(stim){lastStim=stim||{};if(typeof selectedMuscleKey!=="undefined"&&selectedMuscleKey&&KEY_TO_ID[selectedMuscleKey])selectedId=KEY_TO_ID[selectedMuscleKey];const note=q("overlayModeNote");if(note&&typeof overlayModeDescription==="function")note.textContent=overlayModeDescription();requestDraw()}
function setOverlayMode(){requestDraw()}
function init(){if(!initGL())return;resize();if(location.protocol==="file:"){const w=q("bodyMapProtocolWarning");if(w)w.hidden=false;const f=q("modelFileFallback");if(f)f.hidden=false}fetchModel()}
window.BodyMap3D={init,update,setOverlayMode,selectMuscle:key=>selectRegion(KEY_TO_ID[key]||0),focusPainEntry,refreshPainHotspots,diagnostics:()=>({regionCount:REGION_KEYS.filter(Boolean).length,jointAnchors:Object.keys(JOINT_POINTS),modelReady:!!modelReady,webglReady:!!gl})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
