import React from 'react';
import { ESTABLECIMIENTO } from '../../config/establecimiento';

// Bloques visuales comunes de los documentos de matrícula, copiados del estilo de la
// Ficha de Matrícula y del Comprobante Apoderado (GuardianReceipt.tsx): encabezado con
// insignia y separador negro de 3px, títulos de sección con barra negra de 4px, y
// tarjetas de datos con borde gris en grilla de 2 columnas.
// URL absoluta de la insignia porque el documento se copia a una ventana de impresión nueva.

interface EncabezadoDocumentoProps {
  titulo: string;
  subtitulo?: string;
  currentYear: number;
}

const fechaEmision = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
};

const EncabezadoDocumento: React.FC<EncabezadoDocumentoProps> = ({ titulo, subtitulo, currentYear }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '3px solid #000000' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
      <img
        src={`${window.location.origin}/InsigniaEcuador.png`}
        alt="Escuela Ecuador"
        style={{ width: '55px', height: '55px', objectFit: 'contain' }}
      />
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0', whiteSpace: 'nowrap' }}>
          {ESTABLECIMIENTO.nombreCorto.toUpperCase()}
        </h1>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>RBD: {ESTABLECIMIENTO.rbd} • Reconocimiento Oficial</p>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>{ESTABLECIMIENTO.direccion}</p>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0', textTransform: 'uppercase', lineHeight: 1.25 }}>
        {titulo}
      </h2>
      {subtitulo && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0', fontStyle: 'italic' }}>{subtitulo}</p>}
      <p style={{ fontSize: '16px', color: '#000000', margin: '0', fontWeight: 600 }}>Año Académico {currentYear}</p>
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>Emitido: {fechaEmision()}</p>
    </div>
  </div>
);

export const TituloSeccion: React.FC<{ children: React.ReactNode; tamano?: number }> = ({ children, tamano = 14 }) => (
  <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0 6px 0' }}>
    <div style={{ width: '4px', height: '18px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '8px', flexShrink: 0 }}></div>
    <h3 style={{ fontSize: `${tamano}px`, fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </h3>
  </div>
);

export const TarjetaDatos: React.FC<{ children: React.ReactNode; tamano?: number }> = ({ children, tamano = 13 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: `${tamano}px` }}>
    {children}
  </div>
);

// Campo "Etiqueta: **valor**" como en el Comprobante. Sin valor → línea para completar a mano.
export const Campo: React.FC<{ etiqueta: string; valor?: string | null; ancho?: 'completo' }> = ({ etiqueta, valor, ancho }) => (
  <div style={ancho === 'completo' ? { gridColumn: '1 / -1' } : undefined}>
    {etiqueta}: <strong>{valor && String(valor).trim() ? valor : '________________'}</strong>
  </div>
);

export default EncabezadoDocumento;
