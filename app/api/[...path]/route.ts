import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { questions } from '../../model';

export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message:string,status=400):never=>{throw {message,status}};
const now=()=>new Date().toISOString();
const rand=()=>crypto.randomUUID().replaceAll('-','');
type Row=Record<string,any>;
async function handler(req:Request){
 try{
  const db=env.DB!; if(!db) return json({error:'Base de datos no disponible.'},503);
  const parts=new URL(req.url).pathname.split('/').filter(Boolean).slice(1);
  const [action,id,sub]=parts; const method=req.method;
  if(method!=='GET' && req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin) return json({error:'Origen no permitido.'},403);
  const identity=await getChatGPTUser();
  const owner=identity?.userId;
  const doctor=()=>{if(!owner)fail('Inicia sesión para acceder al espacio del doctor.',401);return owner!};
  const body=async():Promise<Record<string,any>>=>{if(Number(req.headers.get('content-length'))>10000)fail('Solicitud demasiado grande.',413);let data;try{data=await req.json()}catch{fail('Solicitud inválida.')}if(!data||typeof data!=='object'||Array.isArray(data))fail('Solicitud inválida.');return data as Record<string,any>};
  if(action==='identity')return json({signedIn:!!owner});
  if(action==='consultations'&&!id){
   const user=doctor();
   if(method==='GET'){
    const rows=await db.prepare('SELECT id,name,status,current,help,created,updated,patient FROM consultations WHERE owner=? ORDER BY created DESC LIMIT 100').bind(user).all<Row>();
    return json(rows.results.map(r=>({...r,patient:!!r.patient})));
   }
   if(method==='POST'){
    const b=await body();const name=String(b.name||'').trim();if(!name||name.length>80)fail('Escribe un nombre o alias de hasta 80 caracteres.');
    const key=rand(), code=rand().slice(0,12).toUpperCase(),date=now();
    await db.prepare('INSERT INTO consultations (id,owner,name,code,created,updated) VALUES (?,?,?,?,?,?)').bind(key,user,name,code,date,date).run();
    return json({id:key},201);
   }
  }
  if(action==='join'&&method==='POST'){
   const b=await body();const code=String(b.code||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
   if(code.length!==12)fail('El código debe tener 12 caracteres.');
   const c=await db.prepare('SELECT id,patient,status,created FROM consultations WHERE code=?').bind(code).first<Row>();
   if(!c||c.status!=='active'||Date.now()-Date.parse(c.created)>86400000)fail('Código no disponible. Pide al doctor una nueva consulta.',404);
   const token=rand()+rand(); const hashed=await hash(token);
   const changed=await db.prepare('UPDATE consultations SET patient=?,updated=? WHERE id=? AND patient IS NULL').bind(hashed,now(),c!.id).run();
   if(!changed.meta.changes)fail('La consulta ya está vinculada a un dispositivo. El doctor puede volver a vincularla.',409);
   return json({id:c!.id,token});
  }
  if(action==='videos'){
   const user=doctor();
   if(!id&&method==='GET'){const videos=await db.prepare('SELECT question FROM question_videos WHERE owner=?').bind(user).all<Row>();return json(videos.results.map(v=>v.question))}
   const q=Number(id);if(!Number.isInteger(q)||q<0||q>=6)fail('Pregunta inválida.');
   const vid=await db.prepare('SELECT key FROM question_videos WHERE id=?').bind(`${user}:${q}`).first<Row>();
   if(method==='GET')return vid?await videoResponse(vid.key,req):json({error:'Video todavía no disponible.'},404);
   if(method==='POST'){
    const blob=await readVideo(req);const key=`questions/${user}/${q}/${rand()}`;
    await env.BUCKET!.put(key,blob,{httpMetadata:{contentType:req.headers.get('content-type')!}});
    await db.prepare('INSERT INTO question_videos (id,owner,question,key) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET key=excluded.key').bind(`${user}:${q}`,user,q,key).run();
    if(vid)await env.BUCKET!.delete(vid.key);
    return json({ok:true});
   }
   if(method==='DELETE'){if(vid)await env.BUCKET!.delete(vid.key);await db.prepare('DELETE FROM question_videos WHERE id=?').bind(`${user}:${q}`).run();return json({ok:true})}
  }
  if(action==='consultations'&&id){
   const c=await db.prepare('SELECT * FROM consultations WHERE id=?').bind(id).first<Row>();if(!c)fail('Consulta no encontrada.',404);
   const isDoctor=owner===c!.owner;
   const token=req.headers.get('x-patient-token');
   const isPatient=!!token && c!.patient===await hash(token);
   if(!isDoctor&&!isPatient)fail('No tienes acceso a esta consulta.',403);
   if(sub==='question-video'&&method==='GET'){
    const q=Number(new URL(req.url).searchParams.get('q'));const v=await db.prepare('SELECT key FROM question_videos WHERE owner=? AND question=?').bind(c!.owner,q).first<Row>();
    return v?await videoResponse(v.key,req):json({error:'Video todavía no disponible.'},404);
   }
   if(sub==='clip'&&method==='GET'){
    const q=Number(new URL(req.url).searchParams.get('q'));const a=await db.prepare('SELECT clip FROM answers WHERE id=?').bind(`${id}:${q}`).first<Row>();
    return a?.clip?await videoResponse(a.clip,req):json({error:'Grabación no disponible.'},404);
   }
   if(!sub&&method==='GET'){
    const a=await db.prepare('SELECT question,value,method,clip,updated FROM answers WHERE consultation=? ORDER BY question').bind(id).all<Row>();
    const v=await db.prepare('SELECT question FROM question_videos WHERE owner=?').bind(c!.owner).all<Row>();
    return json({id:c!.id,name:c!.name,...(isDoctor?{code:c!.code}:{}),status:c!.status,current:c!.current,help:c!.help,summary:c!.summary,created:c!.created,updated:c!.updated,patient:!!c!.patient,answers:a.results.map(a=>({...a,clip:a.clip?'available':null})),videos:v.results.map(v=>v.question)});
   }
   if(c!.status==='closed'&&method!=='DELETE')fail('Esta consulta ya terminó.',409);
   if(sub==='answers'&&method==='POST'){
    if(!isPatient)fail('Solo el paciente confirma sus respuestas.',403);
    const b=await body(),q=Number(b.question),value=String(b.value||'').trim();
    if(!Number.isInteger(q)||!questions[q]||!value||value.length>500)fail('Revisa la respuesta. Máximo 500 caracteres.');
    const aid=`${id}:${q}`,prev=await db.prepare('SELECT clip FROM answers WHERE id=?').bind(aid).first<Row>();
    // A clip is only eligible if uploaded with this patient's scoped credential.
    const clip=b.clip&&String(b.clip).startsWith(`clips/${id}/${q}/`)?String(b.clip):null;
    await db.batch([
     db.prepare('INSERT INTO answers (id,consultation,question,value,method,clip,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,method=excluded.method,clip=excluded.clip,updated=excluded.updated').bind(aid,id,q,value,clip?'Video y selección':q===1?'Mapa corporal':q===3?'Escala visual':'Selección confirmada',clip,now()),
     db.prepare('UPDATE consultations SET current=CASE WHEN current=? AND current<5 THEN current+1 ELSE current END,summary=?,updated=? WHERE id=?').bind(q,'',now(),id)
    ]);
    if(prev?.clip&&prev.clip!==clip)await env.BUCKET!.delete(prev.clip);
    return json({ok:true});
   }
   if(sub==='clip'&&method==='POST'){
    if(!isPatient)fail('Solo el paciente puede grabar una respuesta.',403);
    const q=Number(new URL(req.url).searchParams.get('q'));if(!Number.isInteger(q)||!questions[q])fail('Pregunta inválida.');
    const blob=await readVideo(req); const key=`clips/${id}/${q}/${rand()}`;
    await env.BUCKET!.put(key,blob,{httpMetadata:{contentType:req.headers.get('content-type')!}});return json({key});
   }
   if(sub==='help'&&method==='POST'){
    await db.prepare('UPDATE consultations SET help=?,updated=? WHERE id=?').bind(isDoctor?0:1,now(),id).run();return json({ok:true});
   }
   if(method==='PATCH'&&!sub){
    if(!isDoctor)fail('Solo el doctor puede cambiar la consulta.',403);
    const b=await body();
    if(b.action==='relink')await db.prepare('UPDATE consultations SET patient=NULL,code=?,updated=? WHERE id=?').bind(rand().slice(0,12).toUpperCase(),now(),id).run();
    else if(b.action==='close')await db.prepare('UPDATE consultations SET status=?,updated=? WHERE id=?').bind('closed',now(),id).run();
    else if(b.summary!==undefined){if(typeof b.summary!=='string'||b.summary.length>4000)fail('Resumen demasiado largo.');await db.prepare('UPDATE consultations SET summary=?,updated=? WHERE id=?').bind(b.summary,now(),id).run()}
    else if(Number.isInteger(b.current)&&b.current>=0&&b.current<6)await db.prepare('UPDATE consultations SET current=?,updated=? WHERE id=?').bind(b.current,now(),id).run();
    else fail('Cambio inválido.');
    return json({ok:true});
   }
   if(method==='DELETE'&&!sub){
    if(!isDoctor)fail('Solo el doctor puede eliminar esta consulta.',403);
    for(const prefix of [`clips/${id}/`]){let cursor:string|undefined;do{const files=await env.BUCKET!.list({prefix,cursor});if(files.objects.length)await env.BUCKET!.delete(files.objects.map(o=>o.key));cursor=files.truncated?files.cursor:undefined}while(cursor)}
    await db.batch([db.prepare('DELETE FROM answers WHERE consultation=?').bind(id),db.prepare('DELETE FROM consultations WHERE id=?').bind(id)]);return json({ok:true});
   }
  }
  return json({error:'Ruta no encontrada.'},404);
 }catch(e:any){if(e?.status)return json({error:e.message},e.status);console.error('API request failed',e?.message);return json({error:'No se pudo completar la operación. Intenta de nuevo.'},500)}
}
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
async function readVideo(req:Request){if(!env.BUCKET)fail('Almacenamiento de videos no disponible.',503);const type=req.headers.get('content-type')?.split(';')[0];if(!['video/webm','video/mp4','video/quicktime','video/ogg'].includes(type||''))fail('Usa un video MP4, WebM, MOV u OGG.');const bytes=await req.arrayBuffer();if(bytes.byteLength>20*1024*1024||!bytes.byteLength)fail('El video debe pesar entre 1 byte y 20 MB.',413);return bytes}
async function videoResponse(key:string,req:Request){const obj=await env.BUCKET!.get(key,{range:req.headers});if(!obj)return json({error:'Video no disponible.'},404);const headers=new Headers({'Cache-Control':'private, no-store','Content-Type':obj.httpMetadata?.contentType||'video/webm','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});let status=200;if(obj.range&&'offset'in obj.range){const start=obj.range.offset||0;const length=obj.range.length||obj.size;headers.set('Content-Range',`bytes ${start}-${start+length-1}/${obj.size}`);headers.set('Content-Length',String(length));status=206}else headers.set('Content-Length',String(obj.size));return new Response(obj.body,{headers,status})}
export const GET=handler;export const POST=handler;export const PATCH=handler;export const DELETE=handler;
