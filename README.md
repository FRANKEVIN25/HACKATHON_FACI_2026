# MARI

MVP funcional de comunicación entre paciente y profesional de salud, basado en las seis pantallas del documento «Consulta LSP Pantallas». Incluye seis preguntas, incluyendo alergias y embarazo que aparecen en la vista del doctor del documento.

## Alcance implementado

- Dos espacios: paciente y doctor. Inicio de sesión del doctor con ChatGPT; consultas aisladas por identidad en servidor.
- Creación, búsqueda, filtro, cierre y eliminación de consultas con alias.
- Vinculación de un dispositivo por código aleatorio de 12 caracteres, de un solo uso y disponible durante las primeras 24 horas. El doctor puede revocar la vinculación.
- Consentimiento explícito antes de vincular el dispositivo. Credencial de paciente guardada solo en sessionStorage; su hash se guarda en servidor.
- Seis preguntas: síntomas, cuerpo humano 3D accesible también mediante lista, tiempo, intensidad, alergias y embarazo.
- Revisión y confirmación antes de enviar. El doctor no puede enviar respuestas como paciente. Correcciones permitidas hasta el cierre.
- Pregunta activa y respuestas sincronizadas entre dispositivos mediante consulta al servidor cada 3 segundos.
- Solicitud de ayuda y confirmación del doctor.
- Grabación de cámara sin audio, máximo 60 segundos / 20 MB. Vista previa local antes de envío. Videos privados sujetos al acceso a la consulta.
- Carga, reemplazo y retiro de videos de preguntas en LSP por el doctor. Archivos en R2, respuestas y consultas en D1.
- Resumen por campos con preguntas faltantes explícitas, edición del doctor, copia y descarga TXT. Se conservan las respuestas originales.
- Diseño adaptable, navegación por teclado, diálogos con foco controlado y opción de texto grande.

## Límites explícitos

No se incluyen videos interpretados, reconocimiento de señas, puntuaciones de confianza ni diagnósticos. La respuesta solo en video se marca pendiente de interpretación humana. No existe envío automático a una historia clínica: el doctor copia o descarga el resumen.

La publicación inicial es privada para el propietario en Sites. Esto permite probar ambas vistas bajo el mismo acceso; no habilita acceso público a pacientes externos. Antes de un piloto multiusuario debe definirse el acceso institucional y la autenticación de profesionales. No se amplía la audiencia automáticamente.

Este MVP se valida con datos ficticios. Para uso asistencial faltan revisión con personas usuarias de LSP e intérpretes, pruebas de accesibilidad con usuarios, política institucional de consentimiento/retención, auditoría de accesos y requisitos operativos. No es un sistema de atención de emergencias.

## Desarrollo local

Requisitos: Node >=22.13 y Git. El starter usa Vinext + React + TypeScript, Workers, D1 y R2. La configuración de despliegue está en `.openai/hosting.json`.

1. Instalar dependencias: `npm run install:ci`.
2. Construir: `npm run build`.
3. Aplicar la migración una sola vez a la base local:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_motionless_pretty_boy.sql`
4. Iniciar: `npm run dev` y abrir la URL local impresa.
5. Usar «Continuar con ChatGPT» para la identidad simulada local que proporciona el starter. No se incluye esta simulación en producción.
6. Crear consulta, abrir la vista de paciente en otra pestaña y vincularla con el código.

Comprobaciones: `npx tsc --noEmit`, `npm run build` y `node scripts/test-mvp.mjs http://127.0.0.1:5173` contra la vista previa local. La prueba rechaza hosts remotos y elimina únicamente su propia consulta ficticia.

## Cuerpo humano 3D

Únicamente la pregunta «¿Dónde te duele?» carga Three.js y el modelo `public/models/human-body.glb`. Arrastra para girar, pulsa +/− para acercar/alejar y toca la malla para marcar. Los botones Frente/Espalda y las flechas del teclado ofrecen controles alternativos. La lista de zonas sigue funcionando aunque WebGL no esté disponible.

El modelo se descargó de Innerscene, adaptado de MakeHuman, bajo licencia CC0. La procedencia y la licencia están en `public/models/ATTRIBUTION.md`. El archivo se sirve desde el propio proyecto; el paciente no necesita consultar un visor externo. El material se adapta al color de MARI.

El punto se muestra sobre el cuerpo y se convierte en una zona aproximada. Se envía al doctor el nombre de la zona confirmado por el paciente, como en el flujo anterior. Las coordenadas precisas del punto no se guardan en esta versión. Antes de enviarlo, la paciente puede corregir la zona mediante la lista. El giro se aplica a la cámara para conservar derecha/izquierda anatómicas.

Comprobación de geometría y zonas sobre la malla real: `node --experimental-strip-types scripts/test-body3d.mjs`.

## Integración futura de reconocimiento LSP

Incorporar un adaptador de inferencia en servidor cuando exista un modelo validado para el vocabulario clínico acordado. Las sugerencias deben mantenerse separadas de las respuestas y solo persistirse como confirmadas cuando el paciente las acepte. No activar umbrales de confianza ni candidatos ficticios. Cargar primero videos de preguntas revisados por intérpretes desde la biblioteca del doctor.

## Datos y permisos

Las consultas y respuestas son persistentes. Los videos se almacenan como objetos privados y se sirven mediante rutas autenticadas. Los códigos de vinculación no son credenciales de doctor. Al eliminar una consulta se eliminan sus respuestas y los videos asociados a esa consulta; la biblioteca de preguntas del doctor se conserva.

No añadir secretos al repositorio. El despliegue y las migraciones de producción se realizan mediante el flujo de Sites, conservando su audiencia privada.
