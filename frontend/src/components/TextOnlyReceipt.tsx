import React, { useState, useEffect } from 'react';
import type { StudentData, ApoderadoData } from '../types';
import { useToast } from '../context/ToastContext';

interface TextOnlyReceiptProps {
  studentData: StudentData;
  apoderados: ApoderadoData[];
}

const TextOnlyReceipt: React.FC<TextOnlyReceiptProps> = ({ studentData, apoderados }) => {
  const toast = useToast();
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Fetch current year from backend
  useEffect(() => {
    const fetchCurrentYear = async () => {
      try {
        const response = await fetch('/api/year/current');
        const data = await response.json();
        if (response.ok) {
          setCurrentYear(data.year);
          console.log('Año vigente obtenido para TextReceipt:', data.year);
        } else {
          console.error('Error al obtener año vigente:', data);
        }
      } catch (error) {
        console.error('Error al conectar con la API de año vigente:', error);
      }
    };

    fetchCurrentYear();
  }, []);

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

  const generateTextReceipt = () => {
    // ✅ FIX: Usar tipo_relacion u orden para filtrar apoderados
    const principalGuardian = apoderados.find(a =>
      a.tipo_relacion === 'principal' || a.orden === 1 || a.es_principal === true
    );
    const suplenteGuardians = apoderados.filter(a =>
      a.tipo_relacion === 'suplente' || a.orden === 2 || a.es_suplente === true
    );
    const currentDate = new Date().toLocaleDateString('es-CL');
    const currentTime = new Date().toLocaleTimeString('es-CL');
    const matriculaNumber = `${currentYear}-${String(studentData.id || Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    return `================================================================================
                         ESCUELA REPÚBLICA DEL ECUADOR
                                RBD: 312
                          Bellavista 3957, Antofagasta
================================================================================

                            COMPROBANTE DE MATRÍCULA
                              Año Académico ${currentYear}
                               N° ${matriculaNumber}

Emitido: ${currentDate} ${currentTime}

================================================================================
                              DATOS DEL ESTUDIANTE
================================================================================

RUT:                    ${formatRut(studentData.rut, studentData.dv)}
Nombres:                ${studentData.nombres || 'No especificado'}
Apellido Paterno:       ${studentData.apellido_paterno || 'No especificado'}
Apellido Materno:       ${studentData.apellido_materno || 'No especificado'}
Fecha de Nacimiento:    ${formatDate(studentData.fecha_nacimiento)}
Género:                 ${studentData.genero || 'No especificado'}
Nacionalidad:           ${studentData.nacionalidad || 'No especificada'}
Etnia:                  ${formatEtnia(studentData.etnia)}

Dirección:              ${studentData.direccion || 'No especificada'}${studentData.complemento_direccion ? `, ${studentData.complemento_direccion}` : ''}
Comuna:                 ${studentData.comuna || 'No especificada'}
Previsión de salud:     ${(studentData as any).prevision_salud || 'No especificada'}

Teléfono Móvil:         ${studentData.telefono || 'No especificado'}
Teléfono Fijo:          ${studentData.telefono_fijo || 'No especificado'}
Con quién vive:         ${studentData.con_quien_vive || 'No especificado'}
Religión:               ${studentData.tipo_religion || studentData.religion || 'No especificada'}

================================================================================
                            INFORMACIÓN ACADÉMICA
================================================================================

Curso:                  ${studentData.curso_base || 'No especificado'}
Letra:                  ${studentData.letra || 'No especificada'}
Estado:                 ${studentData.estado || 'matriculado'}

================================================================================
                              APODERADO PRINCIPAL
================================================================================

RUT:                    ${principalGuardian ? formatRut(principalGuardian.rut, principalGuardian.dv) : 'No especificado'}
Nombres:                ${principalGuardian?.nombre || 'No especificado'}
Apellido Paterno:       ${principalGuardian?.apellido_paterno || 'No especificado'}
Apellido Materno:       ${principalGuardian?.apellido_materno || 'No especificado'}
Parentesco:             ${principalGuardian?.parentesco || 'No especificado'}
Fecha de Nacimiento:    ${principalGuardian?.fecha_nacimiento ? formatDate(principalGuardian.fecha_nacimiento) : 'No especificada'}
Género:                 ${principalGuardian?.genero || 'No especificado'}
Nacionalidad:           ${principalGuardian?.nacionalidad || 'No especificada'}

Dirección:              ${principalGuardian?.direccion || 'No especificada'}${principalGuardian?.complemento_direccion ? `, ${principalGuardian.complemento_direccion}` : ''}
Comuna:                 ${principalGuardian?.comuna || 'No especificada'}
Región:                 ${principalGuardian?.region || 'No especificada'}

Teléfono Celular:       ${principalGuardian?.celular || 'No especificado'}
Email:                  ${principalGuardian?.email || 'No especificado'}

${suplenteGuardians.length > 0 ? `================================================================================
                             APODERADOS SUPLENTES
================================================================================

${suplenteGuardians.map((suplente, index) => `
--- Apoderado Suplente ${index + 1} ---

RUT:                    ${formatRut(suplente.rut, suplente.dv)}
Nombres:                ${suplente.nombre || 'No especificado'}
Apellido Paterno:       ${suplente.apellido_paterno || 'No especificado'}
Apellido Materno:       ${suplente.apellido_materno || 'No especificado'}
Parentesco:             ${suplente.parentesco || 'No especificado'}
Teléfono Celular:       ${suplente.celular || 'No especificado'}
Email:                  ${suplente.email || 'No especificado'}
Dirección:              ${suplente.direccion || 'No especificada'}${suplente.complemento_direccion ? `, ${suplente.complemento_direccion}` : ''}
Comuna:                 ${suplente.comuna || 'No especificada'}
Región:                 ${suplente.region || 'No especificada'}
`).join('')}

` : ''}================================================================================
                          BENEFICIOS Y PROGRAMAS
================================================================================

PIE (Programa Integración Escolar):    ${studentData.pie ? 'SÍ' : 'NO'}
PAE (Postulacion al Programa Alimentación Escolar):   ${studentData.pae ? 'SÍ' : 'NO'}
Beca:                                  ${studentData.beca ? 'SÍ' : 'NO'}${studentData.beca && studentData.tipo_beca ? `
Tipo de Beca:                          ${studentData.tipo_beca}` : ''}
${Array.isArray((studentData as any).nees) && (studentData as any).nees.length > 0 ? `
================================================================================
                    NECESIDADES EDUCATIVAS ESPECIALES (NEE)
================================================================================

${(studentData as any).nees.map((nee: any) => `• ${nee.descripcion || nee.codigo || 'NEE sin descripción'}`).join('\n')}
` : ''}

${(studentData.observaciones || studentData.observaciones_matriculador) ? `================================================================================
                               OBSERVACIONES
================================================================================

${studentData.observaciones ? `GENERALES:
${studentData.observaciones}

` : ''}${studentData.observaciones_matriculador ? `MATRICULADOR:
${studentData.observaciones_matriculador}

` : ''}` : ''}================================================================================
                             FIRMAS Y VALIDACIÓN
================================================================================

Firma del Apoderado: ____________________________
${principalGuardian?.nombre || ''} ${principalGuardian?.apellido_paterno || ''}
RUN o I.P.A: ____________________________


Establecimiento: ____________________________
Escuela República del Ecuador
Registro Oficial de Matrícula


================================================================================
Escuela República del Ecuador • RBD: 312 • Bellavista 3957, Antofagasta
================================================================================
`.trim();
  };

  const handleCopyToClipboard = () => {
    const text = generateTextReceipt();
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Comprobante copiado al portapapeles');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Comprobante copiado al portapapeles');
    });
  };

  const handleDownload = () => {
    const text = generateTextReceipt();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante_Matricula_${studentData.nombres}_${studentData.apellido_paterno}_${currentYear}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const text = generateTextReceipt();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprobante</title>
          </head>
          <body>
            <pre>${text}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-white">
      {/* Controls */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Comprobante de Matrícula - Formato Texto</h3>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            onClick={handleCopyToClipboard}
            className="ios-btn ios-btn-primary flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Copiar al Portapapeles</span>
          </button>
          
          <button 
            onClick={handleDownload}
            className="ios-btn ios-btn-secondary flex items-center space-x-2"
          >
            <span>📄</span>
            <span>Descargar TXT</span>
          </button>
          
          <button 
            onClick={handlePrint}
            className="ios-btn ios-btn-tertiary flex items-center space-x-2"
          >
            <span>🖨️</span>
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">Vista Previa del Comprobante</h4>
          <p className="text-sm text-gray-600">Este formato es ideal para envío por email o archivo de texto</p>
        </div>
        
        <div className="p-6">
          <textarea
            readOnly
            value={generateTextReceipt()}
            rows={45}
            className="w-full border border-gray-300 rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{
              fontFamily: 'Consolas, "Courier New", Monaco, monospace',
              fontSize: '11px',
              lineHeight: '1.4',
              backgroundColor: '#fafafa'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TextOnlyReceipt;