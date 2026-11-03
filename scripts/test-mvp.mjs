// Integration test against the portable local preview. Never targets a hosted database.
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Solo se permiten pruebas contra localhost.');
let count=0;
const check=(condition,message)=>{assert.ok(condition,message);count++;console.log(`✓ ${message}`)};
const sign=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=sign.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
check(!!cookie,'Identidad de prueba local disponible');
async function req(path,{method='GET',body,token,auth=true,headers={}}={}){
 const r=await fetch(base+'/api/'+path,{method,headers:{...(auth?{cookie}:{}),...(token?{'x-patient-token':token}:{}),...(body&&!(body instanceof Blob)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof Blob?body:body?JSON.stringify(body):undefined});
 const data=r.headers.get('content-type')?.includes('json')?await r.json():await r.arrayBuffer();return {status:r.status,data};
}
let id;
try{
 check((await req('consultations',{auth:false})).status===401,'Lista protegida para usuarios anónimos');
 check((await req('consultations',{method:'POST',body:{name:''}})).status===400,'No se crean consultas sin alias');
 const created=await req('consultations',{method:'POST',body:{name:'Prueba automatizada ficticia'}});id=created.data.id;check(created.status===201&&!!id,'Doctor crea una consulta persistente');
 const c=(await req('consultations/'+id)).data;check(c.answers.length===0&&c.code.length===12,'Consulta nueva sin respuestas y con código único');
 check((await req('consultations/'+id,{auth:false})).status===403,'Consulta protegida sin código ni credencial');
 const joined=await req('join',{method:'POST',body:{code:c.code},auth:false});const token=joined.data.token;check(joined.status===200&&!!token,'Paciente vincula su dispositivo mediante código');
 check((await req('join',{method:'POST',body:{code:c.code},auth:false})).status===409,'Código de vinculación de un solo uso');
 const patient=await req('consultations/'+id,{token,auth:false});check(patient.status===200&&!patient.data.code&&!patient.data.owner,'Paciente ve solo datos de su consulta');
 check((await req('consultations/'+id,{method:'PATCH',body:{action:'close'},token,auth:false})).status===403,'Paciente no puede cerrar la consulta como doctor');
 check((await req('consultations/'+id+'/answers',{method:'POST',body:{question:0,value:'Dolor'}})).status===403,'Doctor no puede confirmar respuestas en nombre del paciente');
 check((await req('consultations/'+id+'/answers',{method:'POST',body:{question:9,value:'Inválida'},token,auth:false})).status===400,'Pregunta fuera de rango rechazada');
 const values=['Dolor','Abdomen bajo derecho','3 días','Fuerte','No','No aplica'];
 for(let q=0;q<6;q++){const sent=await req('consultations/'+id+'/answers',{method:'POST',body:{question:q,value:values[q]},token,auth:false});check(sent.status===200,`Respuesta ${q+1} confirmada y guardada`)}
 const completed=(await req('consultations/'+id)).data;check(completed.answers.length===6&&completed.answers[1].value===values[1],'Doctor recibe las seis respuestas confirmadas');
 await req('consultations/'+id+'/help',{method:'POST',token,auth:false});check((await req('consultations/'+id)).data.help===1,'Solicitud de ayuda llega al doctor');
 await req('consultations/'+id+'/help',{method:'POST'});check((await req('consultations/'+id)).data.help===0,'Doctor confirma atención a la solicitud');
 await req('consultations/'+id,{method:'PATCH',body:{summary:'Resumen de prueba'}});check((await req('consultations/'+id)).data.summary==='Resumen de prueba','Resumen editado se conserva en el servidor');
 await req('consultations/'+id,{method:'PATCH',body:{current:2}});check((await req('consultations/'+id,{token,auth:false})).data.current===2,'Pregunta activa sincronizada con paciente');
 await req('consultations/'+id,{method:'PATCH',body:{action:'relink'}});check((await req('consultations/'+id,{token,auth:false})).status===403,'Volver a vincular revoca la credencial anterior');
 const refreshed=(await req('consultations/'+id)).data;const token2=(await req('join',{method:'POST',body:{code:refreshed.code},auth:false})).data.token;
 const edited=await req('consultations/'+id+'/answers',{method:'POST',body:{question:2,value:'3 semanas'},token:token2,auth:false});check(edited.status===200&&(await req('consultations/'+id)).data.answers.length===6,'Corregir una respuesta reemplaza la anterior sin duplicarla');
 await req('consultations/'+id,{method:'PATCH',body:{action:'close'}});
 check((await req('consultations/'+id+'/answers',{method:'POST',body:{question:0,value:'Cambio tardío'},token:token2,auth:false})).status===409,'Consulta finalizada bloquea cambios');
 check((await req('consultations/'+id,{token:token2,auth:false})).status===200,'Paciente puede consultar sus respuestas al finalizar');
 const deleted=await req('consultations/'+id,{method:'DELETE'});check(deleted.status===200&&(await req('consultations/'+id)).status===404,'Eliminar consulta retira respuestas y registro');id=null;
 console.log(`\n${count} comprobaciones correctas.`);
}finally{if(id)await req('consultations/'+id,{method:'DELETE'})}
