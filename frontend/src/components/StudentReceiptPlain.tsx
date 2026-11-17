import React from 'react';
import type { StudentData, ApoderadoData } from '../types';
import { useToast } from '../context/ToastContext';

interface StudentReceiptPlainProps {
  studentData: StudentData;
  apoderados: ApoderadoData[];
}

const StudentReceiptPlain: React.FC<StudentReceiptPlainProps> = ({ studentData, apoderados }) => {
  const toast = useToast();
  const formatRut = (rut?: string, dv?: string) => {
    if (!rut || !dv) return 'No especificado';
    return `${rut}-${dv}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  const formatEtnia = (etnia?: string | null): string => {
    if (!etnia || etnia === '0' || etnia.toString() === '0') {
      return 'No pertenece a ninguna etnia';
    }
    return etnia;
  };

  const generatePlainReceipt = () => {
    // ✅ FIX: Usar tipo_relacion u orden para filtrar apoderados
    const principalGuardian = apoderados.find(a =>
      a.tipo_relacion === 'principal' || a.orden === 1 || a.es_principal === true
    );
    const suplenteGuardian = apoderados.find(a =>
      a.tipo_relacion === 'suplente' || a.orden === 2 || a.es_suplente === true
    );
    const currentDate = new Date().toLocaleDateString('es-CL');
    const currentTime = new Date().toLocaleTimeString('es-CL');
    
    return `COMPROBANTE DE MATRICULA
Año Lectivo 2026

DATOS DEL ESTUDIANTE
RUT: ${formatRut(studentData.rut, studentData.dv)}
Nombres: ${studentData.nombres || 'No especificado'}
Apellido Paterno: ${studentData.apellido_paterno || 'No especificado'}
Apellido Materno: ${studentData.apellido_materno || 'No especificado'}
Fecha de Nacimiento: ${formatDate(studentData.fecha_nacimiento)}
Genero: ${studentData.genero || 'No especificado'}
Nacionalidad: ${studentData.nacionalidad || 'No especificada'}
Etnia: ${formatEtnia(studentData.etnia)}
Telefono: ${studentData.telefono || 'No especificado'}
Telefono Fijo: ${studentData.telefono_fijo || 'No especificado'}
Direccion: ${studentData.direccion || 'No especificada'}
Region: ${studentData.region || 'No especificada'}
Comuna: ${studentData.comuna || 'No especificada'}
Con quien vive: ${studentData.con_quien_vive || 'No especificado'}
Religion: ${studentData.religion || 'No especificada'}

DATOS ACADEMICOS
Curso: ${studentData.curso_base || 'No especificado'} ${studentData.letra || ''}

PROGRAMAS Y BENEFICIOS
PIE: ${studentData.pie ? 'SI' : 'NO'}
PAE: ${studentData.pae ? 'SI' : 'NO'}
Beca: ${studentData.beca ? 'SI' : 'NO'}
Tipo de Beca: ${studentData.tipo_beca || 'No aplica'}

APODERADO PRINCIPAL
RUT: ${principalGuardian ? formatRut(principalGuardian.rut, principalGuardian.dv) : 'No especificado'}
Nombres: ${principalGuardian?.nombre || 'No especificado'}
Apellido Paterno: ${principalGuardian?.apellido_paterno || 'No especificado'}
Apellido Materno: ${principalGuardian?.apellido_materno || 'No especificado'}
Parentesco: ${principalGuardian?.parentesco || 'No especificado'}
Telefono: ${principalGuardian?.telefono || 'No especificado'}
Celular: ${principalGuardian?.celular || 'No especificado'}
Email: ${principalGuardian?.email || 'No especificado'}
Direccion: ${principalGuardian?.direccion || 'No especificada'}
Region: ${principalGuardian?.region || 'No especificada'}
Comuna: ${principalGuardian?.comuna || 'No especificada'}

${suplenteGuardian ? `APODERADO SUPLENTE
RUT: ${formatRut(suplenteGuardian.rut, suplenteGuardian.dv)}
Nombres: ${suplenteGuardian.nombre || 'No especificado'}
Apellido Paterno: ${suplenteGuardian.apellido_paterno || 'No especificado'}
Apellido Materno: ${suplenteGuardian.apellido_materno || 'No especificado'}
Parentesco: ${suplenteGuardian.parentesco || 'No especificado'}
Telefono: ${suplenteGuardian.telefono || 'No especificado'}
Celular: ${suplenteGuardian.celular || 'No especificado'}
Email: ${suplenteGuardian.email || 'No especificado'}
Direccion: ${suplenteGuardian.direccion || 'No especificada'}
Region: ${suplenteGuardian.region || 'No especificada'}
Comuna: ${suplenteGuardian.comuna || 'No especificada'}
` : ''}
OBSERVACIONES
${studentData.observaciones_matriculador || 'Sin observaciones'}

Fecha de generacion: ${currentDate} ${currentTime}

Establecimiento: Escuela Ecuador N° 312
Direccion: [DIRECCION DEL ESTABLECIMIENTO]
Telefono: [TELEFONO DEL ESTABLECIMIENTO]
    `.trim();
  };

  const handleCopyToClipboard = () => {
    const text = generatePlainReceipt();
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Comprobante copiado al portapapeles');
    }).catch(() => {
      // Fallback para navegadores sin soporte
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Comprobante copiado al portapapeles');
    });
  };

  const handlePrint = () => {
    const text = generatePlainReceipt();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprobante de Matricula - ${studentData.nombres} ${studentData.apellido_paterno}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 10pt; 
                line-height: 1.2;
                margin: 15mm;
                white-space: pre-line;
                color: black;
                background: white;
              }
              @media print {
                body { margin: 10mm; }
              }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const text = generatePlainReceipt();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprobante_matricula_${studentData.nombres}_${studentData.apellido_paterno}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <p>Comprobante de Matricula - Texto Plano</p>
      
      <div>
        <button onClick={handleCopyToClipboard}>
          Copiar al Portapapeles
        </button>
        <button onClick={handlePrint}>
          Imprimir
        </button>
        <button onClick={handleDownload}>
          Descargar TXT
        </button>
      </div>

      <textarea
        readOnly
        value={generatePlainReceipt()}
        rows={40}
        cols={80}
      />
    </div>
  );
};

export default StudentReceiptPlain;