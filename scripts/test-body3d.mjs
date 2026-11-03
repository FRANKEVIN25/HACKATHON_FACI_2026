import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3,Group,Vector2,Vector3,Raycaster,PerspectiveCamera} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {regionAtPoint,regionAnchors} from '../app/body-regions.ts';

const bytes=await fs.readFile(new URL('../public/models/human-body.glb',import.meta.url));
assert.equal(bytes.toString('utf8',0,4),'glTF');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.match(gltf.asset.copyright,/CC0/);
gltf.scene.updateMatrixWorld(true);
const bounds=new Box3().setFromObject(gltf.scene),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
const model=new Group();model.add(gltf.scene);model.scale.setScalar(2/size.y);model.position.set(-center.x*2/size.y,-bounds.min.y*2/size.y,0);model.updateMatrixWorld(true);
const normalized=new Box3().setFromObject(model);
assert.ok(Math.abs(normalized.max.y-2)<.001,'El modelo está erguido y normalizado a altura 2');
console.log('✓ GLB local válido, con licencia CC0 y escala normalizada');
const ray=new Raycaster();
for(const [zone,[x,y,z]] of Object.entries(regionAnchors)){
 ray.set(new Vector3(x*2,y*2,z<0?-2:2),new Vector3(0,0,z<0?1:-1));
 const hit=ray.intersectObject(model,true)[0];
 assert.ok(hit,`Existe superficie seleccionable para ${zone}`);
 const actual=regionAtPoint({x:hit.point.x/2,y:hit.point.y/2,z:hit.point.z/2});
 assert.equal(actual,zone,`El punto de ${zone} debe corresponder a la zona correcta`);
 console.log(`✓ Selección sobre la malla real: ${zone}`);
}
assert.equal(regionAtPoint({x:-.05,y:.52,z:.07}),'Abdomen bajo derecho');
assert.equal(regionAtPoint({x:.05,y:.52,z:.07}),'Abdomen bajo izquierdo');
console.log('✓ Derecha e izquierda anatómicas conservadas');
const camera=new PerspectiveCamera(32,1,.01,50);
for(const [z,expected] of [[4.5,'Pecho'],[-4.5,'Espalda']]){
 camera.position.set(0,1.46,z);camera.lookAt(0,1.46,0);camera.updateMatrixWorld();
 ray.setFromCamera(new Vector2(0,0),camera);
 const hit=ray.intersectObject(model,true)[0];assert.ok(hit);
 assert.equal(regionAtPoint({x:hit.point.x/2,y:hit.point.y/2,z:hit.point.z/2}),expected);
}
console.log('✓ El mismo toque en pantalla selecciona pecho o espalda según la cámara');
console.log('\n12 comprobaciones 3D correctas.');
