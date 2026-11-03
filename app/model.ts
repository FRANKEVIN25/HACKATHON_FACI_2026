export const questions = [
 {title:'¿Qué sientes?', short:'Síntoma', hint:'Elige lo que sientes. Puedes elegir más de una opción.', options:['Dolor','Fiebre','Náuseas','Mareo','Tos','Dificultad para respirar','Otro']},
 {title:'¿Dónde te duele?', short:'Ubicación', hint:'Toca una zona del cuerpo o elige su nombre.', options:['Cabeza','Garganta','Pecho','Abdomen alto','Abdomen bajo derecho','Abdomen bajo izquierdo','Espalda','Brazos','Piernas','No tengo dolor']},
 {title:'¿Desde cuándo?', short:'Desde', hint:'Indica hace cuánto empezaste a sentirte así.', options:[]},
 {title:'¿Qué tan fuerte es?', short:'Intensidad', hint:'Elige la intensidad que mejor describe lo que sientes.', options:['Leve','Medio','Fuerte','No aplica']},
 {title:'¿Tienes alergias?', short:'Alergias', hint:'Si tienes alergias, escribe cuáles si las conoces.', options:['No','Sí','No sé','Prefiero no responder']},
 {title:'¿Estás embarazada?', short:'Embarazo', hint:'Elige una respuesta. También puedes indicar que no aplica.', options:['No','Sí','No sé','No aplica','Prefiero no responder']},
];
export type Answer = {question:number;value:string;method:string;clip?:string;updated:string};
export type Consultation = {id:string;name:string;code?:string;status:string;current:number;help:number;summary:string;created:string;updated:string;patient?:boolean;answers:Answer[];videos:number[]};
export function summaryOf(c:Consultation) { return questions.map((q,i)=>`${q.short}: ${c.answers.find(a=>a.question===i)?.value || 'Sin responder'}.`).join('\n'); }
