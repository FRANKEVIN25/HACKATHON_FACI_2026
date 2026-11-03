'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Camera,Video,Square,RotateCcw,Play,Hand,AlertCircle} from 'lucide-react';
const BodyMap3D=lazy(()=>import('./body-map-3d'));

export function AuthVideo({src,token,label}:{src:string;token?:string;label:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{let dead=false,object='';setUrl('');setError(false);const controller=new AbortController();fetch(src,{headers:token?{'x-patient-token':token}:{},signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();object=URL.createObjectURL(await r.blob());if(!dead)setUrl(object)}).catch(e=>{if(e.name!=='AbortError')setError(true)});return()=>{dead=true;controller.abort();if(object)URL.revokeObjectURL(object)}},[src,token]);
 return error?<p className="error-inline">No se pudo cargar el video. Vuelve a abrir la pregunta.</p>:url?<video className="media-video" src={url} controls playsInline aria-label={label}/>:<div className="video-loading">Cargando video…</div>
}
export function Recorder({onChange}:{onChange:(blob:Blob|null)=>void}){
 const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [phase,setPhase]=useState<'off'|'ready'|'recording'|'done'>('off'),[error,setError]=useState(''),[url,setUrl]=useState('');
 const stopTracks=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stopTracks()},[]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);
 async function start(){setError('');try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Este navegador no permite grabar. Usa Chrome, Edge o Safari actualizado, o responde con las opciones.');stopTracks();const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});stream.current=s;setPhase('ready');setUrl('');onChange(null);requestAnimationFrame(()=>{if(video.current){video.current.srcObject=s;video.current.play().catch(()=>{})}})}catch(e:any){setError(e.name==='NotAllowedError'?'Permite el acceso a la cámara en tu navegador. También puedes responder con las opciones.':e.name==='NotFoundError'?'No encontramos una cámara. Puedes responder con las opciones.':e.message)}}
 function record(){if(!stream.current)return;const type=['video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));try{const r=new MediaRecorder(stream.current,type?{mimeType:type}:undefined),chunks:BlobPart[]=[];recorder.current=r;r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};r.onstop=()=>{if(timer.current)clearTimeout(timer.current);const blob=new Blob(chunks,{type:r.mimeType||'video/webm'});stopTracks();if(blob.size>20*1024*1024){setError('El video supera 20 MB. Graba una respuesta más corta.');setPhase('off');return}setUrl(URL.createObjectURL(blob));onChange(blob);setPhase('done')};r.start();setPhase('recording');timer.current=setTimeout(()=>{if(r.state==='recording')r.stop()},60000)}catch{setError('No se pudo iniciar la grabación. Prueba otro navegador.')}}
 return <section className="recorder"><div className="row between"><h3><Camera size={19}/> Responder con señas</h3><span className="muted small">Opcional · hasta 1 minuto</span></div>
 {phase==='off'?<div className="camera-off"><Video size={36}/><p>Graba tus señas para que el equipo las revise.</p><button className="btn secondary" onClick={start}><Camera size={18}/> Activar cámara</button></div>:<><div className="camera-stage"><video ref={video} src={url||undefined} autoPlay={phase!=='done'} muted playsInline controls={phase==='done'} className={phase==='done'?'':'mirrored'}/>{phase==='recording'&&<span className="recording-label"><i/> Grabando · pulsa Detener al terminar</span>}</div><div className="row center">{phase==='ready'?<button className="btn primary" onClick={record}><Video size={18}/> Grabar respuesta</button>:phase==='recording'?<button className="btn danger" onClick={()=>recorder.current?.stop()}><Square size={18}/> Detener grabación</button>:<button className="btn secondary" onClick={start}><RotateCcw size={18}/> Volver a grabar</button>}</div></>}
 {error&&<p className="error-inline" role="alert">{error}</p>}<p className="small muted"><Hand size={15}/> No hay traducción automática. El video se enviará al confirmar y será revisado por una persona.</p></section>
}

export function BodyMap(props:{value:string;onChange:(v:string)=>void;back:boolean;setBack:(v:boolean)=>void}){
 return <Suspense fallback={<div className="body3d-placeholder">Cargando cuerpo 3D…</div>}><BodyMap3D {...props}/></Suspense>;
}
