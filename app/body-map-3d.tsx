'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,RotateCw,Move,Plus,Minus,LoaderCircle,Hand} from 'lucide-react';
import {regionAnchors,regionAtPoint} from './body-regions';
import type * as THREE from 'three';

type Viewer={face:(angle:number)=>void;turn:(delta:number)=>void;zoom:(factor:number)=>void;select:(value:string)=>void};
export default function BodyMap3D({value,onChange,back,setBack}:{value:string;onChange:(value:string)=>void;back:boolean;setBack:(value:boolean)=>void}){
 const mount=useRef<HTMLDivElement>(null),viewer=useRef<Viewer|null>(null);
 const latest=useRef({onChange,setBack,value});latest.current={onChange,setBack,value};
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0),[side,setSide]=useState('Frente');
 useEffect(()=>{
  if(!mount.current)return;
  const host=mount.current;let disposed=false,renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,controls:any,observer:ResizeObserver|undefined,removeEvents:(()=>void)|undefined;
  setStatus('loading');
  async function initialize(){
   try{
    const [T,{GLTFLoader},{OrbitControls}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js')]);
    if(disposed)return;
    scene=new T.Scene();
    renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
    const camera=new T.PerspectiveCamera(32,1,.01,50);camera.position.set(0,1.03,4.5);
    controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.03,0);controls.enablePan=false;controls.enableDamping=false;controls.enableZoom=false;controls.rotateSpeed=.65;controls.minPolarAngle=Math.PI*.25;controls.maxPolarAngle=Math.PI*.73;
    scene.add(new T.HemisphereLight(0xffffff,0xb1c4bb,2.3));
    const light=new T.DirectionalLight(0xffffff,2.6);light.position.set(-3,5,5);scene.add(light);
    const rim=new T.DirectionalLight(0xd2eee4,1.8);rim.position.set(3,3,-4);scene.add(rim);
    const floor=new T.Mesh(new T.CircleGeometry(.6,64),new T.MeshBasicMaterial({color:0xcbded4,transparent:true,opacity:.45,side:T.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;scene.add(floor);
    const ring=new T.Mesh(new T.TorusGeometry(.57,.004,6,72),new T.MeshBasicMaterial({color:0xa7c5b8}));ring.rotation.x=Math.PI/2;ring.position.y=-.003;scene.add(ring);
    const marker=new T.Group();const dot=new T.Mesh(new T.SphereGeometry(.023,16,12),new T.MeshBasicMaterial({color:0xe18b4c,depthWrite:false,transparent:true,opacity:1}));
    const halo=new T.Mesh(new T.SphereGeometry(.041,20,12),new T.MeshBasicMaterial({color:0xf4a86a,transparent:true,opacity:.25,depthWrite:false}));
    marker.add(dot,halo);marker.visible=false;marker.renderOrder=20;dot.renderOrder=21;halo.renderOrder=20;scene.add(marker);
    let model:THREE.Group|undefined;const raycaster=new T.Raycaster(),mouse=new T.Vector2();let lastPick:{zone:string;point:THREE.Vector3}|null=null,baseDistance=4.5,drag:{x:number;y:number;time:number;moved:boolean}|null=null;
    const render=()=>{if(!disposed&&renderer&&scene)renderer.render(scene,camera)};
    const updateSide=()=>{const angle=Math.atan2(camera.position.x,camera.position.z),front=Math.cos(angle)>.45,rear=Math.cos(angle)<-.45;setSide(front?'Frente':rear?'Espalda':angle>0?'Lado izquierdo':'Lado derecho');latest.current.setBack(rear);render()};
    controls.addEventListener('change',updateSide);
    const resize=()=>{const width=host.clientWidth,height=host.clientHeight;if(!width||!height||!renderer)return;camera.aspect=width/height;camera.updateProjectionMatrix();baseDistance=Math.max(2.25/(2*Math.tan(32*Math.PI/360)),1.52/(2*Math.tan(32*Math.PI/360)*camera.aspect));const direction=camera.position.clone().sub(controls.target).normalize();camera.position.copy(controls.target).add(direction.multiplyScalar(baseDistance));renderer.setSize(width,height);controls.update();render()};
    observer=new ResizeObserver(resize);observer.observe(host);resize();
    const select=(selected:string)=>{
     if(!model)return;
     if(!regionAnchors[selected]){marker.visible=false;render();return}
     if(lastPick?.zone===selected){marker.position.copy(lastPick.point);marker.visible=true;render();return}
     const [x,y,z]=regionAnchors[selected];
     // Snap the list-selected marker to the actual surface instead of leaving it
     // inside the mesh. The model never rotates; the camera orbits around it.
     const origin=new T.Vector3(x*2,y*2,z<0?-2:2),direction=new T.Vector3(0,0,z<0?1:-1);
     raycaster.set(origin,direction);const hit=raycaster.intersectObject(model,true)[0];
     marker.position.copy(hit?.point||new T.Vector3(x*2,y*2,z*2));marker.visible=true;
     if(selected==='Espalda')face(Math.PI);render();
    };
    const face=(angle:number)=>{const distance=camera.position.distanceTo(controls.target);camera.position.set(Math.sin(angle)*distance,controls.target.y,Math.cos(angle)*distance);controls.update();render()};
    viewer.current={face,turn:(delta)=>face(Math.atan2(camera.position.x,camera.position.z)+delta),zoom:(factor)=>{const distance=T.MathUtils.clamp(camera.position.distanceTo(controls.target)*factor,baseDistance*.65,baseDistance*1.3);camera.position.sub(controls.target).normalize().multiplyScalar(distance).add(controls.target);controls.update();render()},select};
    const down=(event:PointerEvent)=>{if(!(event.target instanceof HTMLCanvasElement)||!event.isPrimary){drag=null;return}drag={x:event.clientX,y:event.clientY,time:performance.now(),moved:false}};
    const move=(event:PointerEvent)=>{if(drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7)drag.moved=true};
    const up=(event:PointerEvent)=>{
     if(!drag||drag.moved||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7||performance.now()-drag.time>900||!model){drag=null;return}drag=null;
     const rect=renderer!.domElement.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
     const hit=raycaster.intersectObject(model,true).find(hit=>(hit.object as THREE.Mesh).isMesh);if(!hit)return;
     const point=hit.point.clone(),zone=regionAtPoint({x:point.x/2,y:point.y/2,z:point.z/2});lastPick={zone,point};marker.position.copy(point);marker.visible=true;latest.current.onChange(zone);render();
    };
    const cancel=()=>{drag=null};const contextLost=(event:Event)=>{event.preventDefault();setStatus('error')};
    host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',contextLost);
    removeEvents=()=>{host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',cancel);renderer?.domElement.removeEventListener('webglcontextlost',contextLost)};
    const loader=new GLTFLoader();const asset=await loader.loadAsync('/models/human-body.glb');
    if(disposed){asset.scene.traverse(object=>{if((object as THREE.Mesh).isMesh)(object as THREE.Mesh).geometry.dispose()});return}
    const bounds=new T.Box3().setFromObject(asset.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=2/size.y;
    model=new T.Group();model.add(asset.scene);model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,0);scene!.add(model);
    const material=new T.MeshStandardMaterial({color:0xb0cbc0,roughness:.78,metalness:.025});
    asset.scene.traverse(object=>{if((object as THREE.Mesh).isMesh){const mesh=object as THREE.Mesh;const original=Array.isArray(mesh.material)?mesh.material:[mesh.material];original.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)v.dispose()});m.dispose()});mesh.material=material}});
    model.updateMatrixWorld(true);setStatus('ready');select(latest.current.value);render();
   }catch(error){if(!disposed){console.error('Body viewer unavailable',error);setStatus('error')}}
  }
  initialize();
  return()=>{disposed=true;viewer.current=null;observer?.disconnect();removeEvents?.();controls?.dispose();if(scene){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{if((object as THREE.Mesh).isMesh){const mesh=object as THREE.Mesh;geometries.add(mesh.geometry);(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.clear()}renderer?.dispose();renderer?.domElement.remove()};
 },[attempt]);
 useEffect(()=>{viewer.current?.select(value)},[value]);
 return <div className="bodymap3d"><div className="body3d-heading"><span><Hand size={17}/> Señala dónde te duele</span><span className="body3d-side">{side}</span></div><div className="body3d-stage" ref={mount} role="group" aria-label="Cuerpo humano 3D. Arrastra para girar y toca para seleccionar una zona. También puedes usar la lista de zonas." tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();viewer.current?.turn(event.key==='ArrowLeft'?-.3:.3)}}}>
 {status==='loading'&&<div className="body3d-overlay"><LoaderCircle className="spin" size={25}/><p>Cargando cuerpo 3D…</p></div>}
 {status==='error'&&<div className="body3d-overlay"><Hand size={30}/><p>No se pudo mostrar el cuerpo 3D.<br/>Puedes elegir la zona en la lista de abajo.</p><button className="btn secondary" onClick={()=>setAttempt(a=>a+1)}>Volver a cargar</button></div>}
 <div className="body3d-zoom"><button type="button" disabled={status!=='ready'} onClick={()=>viewer.current?.zoom(.88)} aria-label="Acercar cuerpo"><Plus size={17}/></button><button type="button" disabled={status!=='ready'} onClick={()=>viewer.current?.zoom(1.14)} aria-label="Alejar cuerpo"><Minus size={17}/></button></div></div>
 <div className="body3d-controls"><button type="button" disabled={status!=='ready'} onClick={()=>viewer.current?.turn(-Math.PI/6)} aria-label="Girar cuerpo a la derecha"><RotateCcw size={18}/></button><button type="button" className={!back?'active':''} disabled={status!=='ready'} onClick={()=>viewer.current?.face(0)}>Frente</button><button type="button" className={back?'active':''} disabled={status!=='ready'} onClick={()=>viewer.current?.face(Math.PI)}>Espalda</button><button type="button" disabled={status!=='ready'} onClick={()=>viewer.current?.turn(Math.PI/6)} aria-label="Girar cuerpo a la izquierda"><RotateCw size={18}/></button></div>
 <p className="body3d-instructions"><Move size={14}/> Arrastra para girar · Toca el cuerpo para marcar</p><div className="body3d-selection" role="status"><span className={value&&value!=='No tengo dolor'?'pain-dot':''}/><span>{value||'Aún no has seleccionado una zona'}</span></div><p className="body3d-note">La zona es aproximada. Revísala antes de enviar.<br/>Derecha e izquierda corresponden a tu cuerpo.</p></div>
}
