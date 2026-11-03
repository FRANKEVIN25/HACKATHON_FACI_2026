import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'MARI | Consulta accesible',description:'Un espacio de comunicación visual para pacientes y profesionales de salud.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
