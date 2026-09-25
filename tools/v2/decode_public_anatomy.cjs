// Decode only the pinned public Z-Anatomy muscular atlas; never a personal GLB.
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'alos-atlas-decoder-'));
const decoderFile=path.join(temporary,'decoder.cjs');
fs.copyFileSync('apps/web/node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js',decoderFile);
(async()=>{
const draco=await require(decoderFile)({});
const raw=fs.readFileSync(process.argv[2]),length=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+length));
if(crypto.createHash('sha256').update(raw).digest('hex') !== 'f69ed1287f802a2d603d23293e01512bb57ae77ee7cca1d5527ba00496e51de2') throw Error('Only the pinned public atlas is accepted');
const binary=raw.subarray(28+length);const chunks=[binary];let offset=binary.length;
function append(array,accessor){const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;accessor.bufferView=view;delete accessor.byteOffset;accessor.componentType=array instanceof Float32Array?5126:5125;delete accessor.normalized;}
const decoder=new draco.Decoder();let count=0;
for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
 const extension=primitive.extensions?.KHR_draco_mesh_compression;if(!extension)continue;
 const view=doc.bufferViews[extension.bufferView];const input=new draco.DecoderBuffer();input.Init(new Int8Array(binary.buffer,binary.byteOffset+(view.byteOffset||0),view.byteLength),view.byteLength);
 const result=new draco.Mesh();const status=decoder.DecodeBufferToMesh(input,result);if(!status.ok())throw Error(status.error_msg());
 for(const [semantic,id] of Object.entries(extension.attributes)){
  const attribute=decoder.GetAttributeByUniqueId(result,id),values=new draco.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(result,attribute,values);const out=new Float32Array(values.size());for(let i=0;i<out.length;i++)out[i]=values.GetValue(i);append(out,doc.accessors[primitive.attributes[semantic]]);draco.destroy(values);
 }
 const face=new draco.DracoInt32Array(),indices=new Uint32Array(result.num_faces()*3);for(let i=0;i<result.num_faces();i++){decoder.GetFaceFromMesh(result,i,face);for(let j=0;j<3;j++)indices[3*i+j]=face.GetValue(j)}append(indices,doc.accessors[primitive.indices]);
 draco.destroy(face);draco.destroy(result);draco.destroy(input);delete primitive.extensions.KHR_draco_mesh_compression;if(!Object.keys(primitive.extensions).length)delete primitive.extensions;count++;
}
draco.destroy(decoder);for(const key of ['extensionsRequired','extensionsUsed']){if(doc[key])doc[key]=doc[key].filter(x=>x!=='KHR_draco_mesh_compression')}
doc.buffers=[{byteLength:offset}];doc.asset.copyright='BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan; Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0';
let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+offset,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(offset);binHeader.writeUInt32LE(0x004e4942,4);
fs.mkdirSync('apps/web/public/anatomy',{recursive:true});fs.writeFileSync('apps/web/public/anatomy/muscles.glb',Buffer.concat([header,json,binHeader,...chunks]));console.log({decoded:count,bytes:28+json.length+offset,nodes:doc.nodes.length});
})().finally(()=>fs.rmSync(temporary,{recursive:true,force:true}));
