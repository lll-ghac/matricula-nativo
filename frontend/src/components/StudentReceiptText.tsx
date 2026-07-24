import React from 'react';
import type { StudentData, ApoderadoData } from '../types';

interface StudentReceiptTextProps {
  studentData: StudentData;
  apoderados: ApoderadoData[];
}

const StudentReceiptText: React.FC<StudentReceiptTextProps> = ({ studentData, apoderados }) => {
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

  const generateReceiptText = () => {
    // ✅ FIX: Usar tipo_relacion u orden para filtrar apoderados
    const principalGuardian = apoderados.find(a =>
      a.tipo_relacion === 'principal' || a.orden === 1 || a.es_principal === true
    );
    const suplenteGuardian = apoderados.find(a =>
      a.tipo_relacion === 'suplente' || a.orden === 2 || a.es_suplente === true
    );
    
    return `
================================================================================
                           COMPROBANTE DE MATRÍCULA
                              Año Lectivo 2026
================================================================================

DATOS DEL ESTUDIANTE
--------------------------------------------------------------------------------
RUT                    : ${formatRut(studentData.rut, studentData.dv)}
Nombres                : ${studentData.nombres || 'No especificado'}
Apellido Paterno       : ${studentData.apellido_paterno || 'No especificado'}
Apellido Materno       : ${studentData.apellido_materno || 'No especificado'}
Fecha de Nacimiento    : ${formatDate(studentData.fecha_nacimiento)}
Género                 : ${studentData.genero || 'No especificado'}
Nacionalidad           : ${studentData.nacionalidad || 'No especificada'}
Etnia                  : ${formatEtnia(studentData.etnia)}
Teléfono               : ${studentData.telefono || 'No especificado'}
Teléfono Fijo          : ${studentData.telefono_fijo || 'No especificado'}
Dirección              : ${studentData.direccion || 'No especificada'}
Región                 : ${studentData.region || 'No especificada'}
Comuna                 : ${studentData.comuna || 'No especificada'}
Con quién vive         : ${studentData.con_quien_vive || 'No especificado'}
Religión               : ${studentData.religion || 'No especificada'}

DATOS ACADÉMICOS
--------------------------------------------------------------------------------
Curso                  : ${studentData.curso_base || 'No especificado'} ${studentData.letra || ''}

PROGRAMAS Y BENEFICIOS
--------------------------------------------------------------------------------
PIE                    : ${studentData.pie ? 'SÍ' : 'NO'}
PAE                    : ${studentData.pae ? 'SÍ' : 'NO'}
Beca                   : ${studentData.beca ? 'SÍ' : 'NO'}
Tipo de Beca           : ${studentData.tipo_beca || 'No aplica'}

APODERADO PRINCIPAL
--------------------------------------------------------------------------------
RUT                    : ${principalGuardian ? formatRut(principalGuardian.rut, principalGuardian.dv) : 'No especificado'}
Nombres                : ${principalGuardian?.nombre || 'No especificado'}
Apellido Paterno       : ${principalGuardian?.apellido_paterno || 'No especificado'}
Apellido Materno       : ${principalGuardian?.apellido_materno || 'No especificado'}
Parentesco             : ${principalGuardian?.parentesco || 'No especificado'}
Teléfono               : ${principalGuardian?.telefono || 'No especificado'}
Celular                : ${principalGuardian?.celular || 'No especificado'}
Email                  : ${principalGuardian?.email || 'No especificado'}
Dirección              : ${principalGuardian?.direccion || 'No especificada'}
Región                 : ${principalGuardian?.region || 'No especificada'}
Comuna                 : ${principalGuardian?.comuna || 'No especificada'}

${suplenteGuardian ? `APODERADO SUPLENTE
--------------------------------------------------------------------------------
RUT                    : ${formatRut(suplenteGuardian.rut, suplenteGuardian.dv)}
Nombres                : ${suplenteGuardian.nombre || 'No especificado'}
Apellido Paterno       : ${suplenteGuardian.apellido_paterno || 'No especificado'}
Apellido Materno       : ${suplenteGuardian.apellido_materno || 'No especificado'}
Parentesco             : ${suplenteGuardian.parentesco || 'No especificado'}
Teléfono               : ${suplenteGuardian.telefono || 'No especificado'}
Celular                : ${suplenteGuardian.celular || 'No especificado'}
Email                  : ${suplenteGuardian.email || 'No especificado'}
Dirección              : ${suplenteGuardian.direccion || 'No especificada'}
Región                 : ${suplenteGuardian.region || 'No especificada'}
Comuna                 : ${suplenteGuardian.comuna || 'No especificada'}
` : ''}

OBSERVACIONES
--------------------------------------------------------------------------------
${studentData.observaciones_matriculador || 'Sin observaciones'}

================================================================================
Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}

Establecimiento: [NOMBRE DEL ESTABLECIMIENTO]
Dirección: [DIRECCIÓN DEL ESTABLECIMIENTO]
Teléfono: [TELÉFONO DEL ESTABLECIMIENTO]
================================================================================
    `.trim();
  };

  const handleCopyToClipboard = () => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text).then(() => {
      alert('Comprobante copiado al portapapeles');
    }).catch(() => {
      // Fallback para navegadores sin soporte
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Comprobante copiado al portapapeles');
    });
  };

  const handlePrint = () => {
    const text = generateReceiptText();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprobante de Matrícula - ${studentData.nombres} ${studentData.apellido_paterno}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.3;
                margin: 20px;
                white-space: pre-wrap;
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

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Comprobante de Matrícula - Texto Plano</h3>
        
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📋 Copiar al Portapapeles
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-300 rounded p-4">
        <pre className="text-xs font-mono leading-tight text-gray-800 whitespace-pre-wrap overflow-x-auto">
          {generateReceiptText()}
        </pre>
      </div>
    </div>
  );
};

export default StudentReceiptText;