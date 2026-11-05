# Videos de preguntas en LSP

Copia los seis videos MP4 en esta carpeta con estos nombres exactos:

| Archivo | Pregunta |
| --- | --- |
| `01-que-sientes.mp4` | ¿Qué sientes? |
| `02-donde-te-duele.mp4` | ¿Dónde te duele? |
| `03-desde-cuando.mp4` | ¿Desde cuándo? |
| `04-que-tan-fuerte-es.mp4` | ¿Qué tan fuerte es? |
| `05-alergias.mp4` | ¿Tienes alergias? |
| `06-embarazo.mp4` | ¿Estás embarazada? |

Se usan para todos los doctores y pacientes. La relación se define en `app/model.ts`.
Usa MP4 codificado con H.264 para compatibilidad con navegadores. Cambiar la extensión de un archivo no convierte su formato.
Los archivos en `public` son públicos: incluye solo material de las preguntas, sin datos de pacientes.
En desarrollo copia los archivos y recarga la página. Para la app publicada, vuelve a compilar y desplegar incluyendo los videos.
Si falta un video o no puede reproducirse, se muestra un aviso con la pregunta escrita.
