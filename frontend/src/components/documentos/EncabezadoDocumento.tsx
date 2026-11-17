import React from 'react';
import { ESTABLECIMIENTO } from '../../config/establecimiento';

interface EncabezadoDocumentoProps {
  titulo: string;
  subtitulo?: string;
}

// Encabezado con la insignia, igual al de la Ficha de Matrícula. La URL de la imagen es absoluta
// porque el documento se copia a una ventana de impresión nueva.
const EncabezadoDocumento: React.FC<EncabezadoDocumentoProps> = ({ titulo, subtitulo }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '8px', marginBottom: '10px', borderBottom: '2px solid #000' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={`${window.location.origin}/InsigniaEcuador.png`}
        alt="Insignia Escuela República del Ecuador"
        style={{ width: '48px', height: '48px', objectFit: 'contain' }}
      />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>{ESTABLECIMIENTO.nombreCorto}</div>
        <div style={{ fontSize: '9.5px', color: '#4b5563' }}>RBD: {ESTABLECIMIENTO.rbd} • {ESTABLECIMIENTO.direccion}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right', maxWidth: '58%' }}>
      <div style={{ fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.25 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: '11px', fontWeight: 600 }}>{subtitulo}</div>}
    </div>
  </div>
);

export default EncabezadoDocumento;
