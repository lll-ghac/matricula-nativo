import type React from 'react';
import type { StudentData, ApoderadoData } from '../../types';
import { formatRut } from '../../utils/rutUtils';

// Estilos en línea: estos documentos se copian a una ventana de impresión sin Tailwind.
export const estilos: Record<string, React.CSSProperties> = {
  hoja: { fontFamily: "'Inter', Arial, sans-serif", color: '#000', fontSize: '12px', lineHeight: 1.5, padding: '0 4px' },
  titulo: { fontSize: '15px', fontWeight: 700, textAlign: 'center', margin: '0 0 4px 0', textTransform: 'uppercase' },
  subtitulo: { fontSize: '11px', textAlign: 'center', margin: '0 0 16px 0', color: '#333' },
  seccion: { fontSize: '12.5px', fontWeight: 700, margin: '14px 0 6px 0', textTransform: 'uppercase' },
  parrafo: { margin: '0 0 8px 0', textAlign: 'justify' },
  lista: { margin: '0 0 8px 0', paddingLeft: '20px' },
  dato: { fontWeight: 600, borderBottom: '1px solid #000', padding: '0 4px' },
  firmas: { display: 'flex', justifyContent: 'space-between', gap: '40px', marginTop: '48px' },
  firma: { flex: 1, textAlign: 'center', fontSize: '11px' },
  lineaFirma: { borderTop: '1px solid #000', paddingTop: '4px', marginBottom: '2px' },
};

export const nombreCompletoAlumno = (s: Partial<StudentData>) =>
  [s.nombres, s.apellido_paterno, s.apellido_materno].filter(Boolean).join(' ');

export const nombreCompletoApoderado = (a?: Partial<ApoderadoData>) =>
  a ? [a.nombre, a.apellido_paterno, a.apellido_materno].filter(Boolean).join(' ') : '';

export const apoderadoPrincipal = (s: Partial<StudentData>): ApoderadoData | undefined =>
  (s.apoderados || []).find(a => a.es_principal === true) || (s.apoderados || [])[0];

export const cursoTexto = (s: Partial<StudentData>) => [s.curso_base, s.letra].filter(Boolean).join(' ');

export const rutAlumno = (s: Partial<StudentData>) => formatRut(s.rut, s.dv);
export const rutApoderado = (a?: Partial<ApoderadoData>) => (a ? formatRut(a.rut, a.dv) : '');

// Muestra el dato o una línea en blanco para completar a mano si falta.
export const datoOLinea = (valor?: string | number | null, largo = 28) =>
  valor !== null && valor !== undefined && String(valor).trim() ? String(valor) : '_'.repeat(largo);
