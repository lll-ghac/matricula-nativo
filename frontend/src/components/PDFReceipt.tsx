import React, { useState, useRef, useEffect } from 'react';
import { Download, Home, X } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import GuardianReceipt from './GuardianReceipt';
import type { StudentData, ApoderadoData } from '../types';

interface PDFReceiptProps {
  student: StudentData;
  currentYear?: number; // Make optional since we'll fetch it
  onBackToHome: () => void;
  hideSuccessMessage?: boolean; // Para ocultar el mensaje de éxito
}

const PDFReceipt: React.FC<PDFReceiptProps> = ({
  student,
  currentYear: propCurrentYear,
  onBackToHome,
  hideSuccessMessage = false
}) => {
  const [pdfUrl] = useState<string | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(propCurrentYear || new Date().getFullYear());
  const [guardianPrintFn, setGuardianPrintFn] = useState<(() => void) | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const allGuardians = student.apoderados || [];
  const apoderadoPrincipal = allGuardians.find(a => a.es_principal === true);
  const apoderadosSuplentes = allGuardians.filter(a => a.es_principal === false);
  const currentDate = new Date();

  const formatRut = (rut?: string | number, dv?: string) => {
    if (!rut || !dv) return 'No especificado';
    const cleanRut = String(rut).replace(/[^\d]/g, '');
    const cleanDv = String(dv).trim();
    if (cleanRut.length === 0) return 'No especificado';
    const formattedRut = cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedRut}-${cleanDv}`;
  };

  const getDocumentValue = (apoderado: ApoderadoData) => {
    if (!apoderado) return 'No especificado';
    // Todos los apoderados tienen RUT obligatorio
    return formatRut(apoderado.rut, apoderado.dv);
  };

  const formatEtnia = (etnia?: string | null): string => {
    if (!etnia || etnia === '0' || etnia.toString() === '0') {
      return 'No pertenece a ninguna etnia';
    }
    return etnia;
  };

  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Comprobante_Matricula_${student.nombres}_${student.apellido_paterno}_${currentYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };



  const fetchCurrentYear = async () => {
    try {
      const response = await fetch('/api/year/current');
      const data = await response.json();
      if (response.ok) {
        setCurrentYear(data.year);
        console.log('Año vigente obtenido:', data.year);
      } else {
        console.error('Error al obtener año vigente:', data);
      }
    } catch (error) {
      console.error('Error al conectar con la API de año vigente:', error);
    }
  };

  useEffect(() => {
    // Fetch current year first if not provided
    if (!propCurrentYear) {
      fetchCurrentYear();
    }

    // Cleanup blob URL on component unmount
    return () => {
      // clearTimeout(timer);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [propCurrentYear]);

  if (showPDFPreview && pdfUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
        {/* Header with controls */}
        <div className="bg-white shadow-lg p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Vista Previa del Comprobante PDF</h2>
          <div className="flex space-x-3">
            <button
              onClick={downloadPDF}
              className="ios-btn ios-btn-primary flex items-center space-x-2"
              style={{ display: 'none' }}
            >
              <Download size={16} />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={() => setShowPDFPreview(false)}
              className="ios-btn ios-btn-secondary flex items-center space-x-2"
            >
              <X size={16} />
              <span>Cerrar Vista Previa</span>
            </button>
            <button
              onClick={onBackToHome}
              className="ios-btn ios-btn-success flex items-center space-x-2"
            >
              <Home size={16} />
              <span>Nueva Matrícula</span>
            </button>
          </div>
        </div>
        
        {/* PDF iframe */}
        <iframe
          src={pdfUrl}
          className="flex-1 w-full border-0"
          title="Vista previa del comprobante PDF"
        />
      </div>
    );
  }

  const printSchoolReceipt = () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const receiptContent = receiptElement.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Matrícula - ${student.nombres} ${student.apellido_paterno}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                size: letter;
                margin: 15mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
            img {
              display: block;
            }
            .section-line {
              width: 4px;
              height: 20px;
              background-color: #000000;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printBothReceipts = () => {
    const schoolReceiptElement = receiptRef.current;
    const guardianReceiptElement = document.querySelector('[data-guardian-receipt]') as HTMLElement;

    if (!schoolReceiptElement || !guardianReceiptElement) {
      alert('No se pudieron cargar los documentos para imprimir');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const schoolContent = schoolReceiptElement.innerHTML;
    const guardianContent = guardianReceiptElement.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Documentos de Matrícula - ${student.nombres} ${student.apellido_paterno}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                size: letter;
                margin: 15mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .page-break {
                page-break-before: always;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
            img {
              display: block;
            }
            .section-line {
              width: 4px;
              height: 20px;
              background-color: #000000;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          <div class="document">
            ${schoolContent}
          </div>
          <div class="page-break">
            ${guardianContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Success Message - Solo mostrar si no está oculto */}
      {!hideSuccessMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6 no-print">
          <h2 className="text-2xl font-bold text-green-800 mb-2">✅ ¡Matrícula Guardada Exitosamente!</h2>
          <p className="text-lg text-green-700">
            El estudiante {student.nombres} {student.apellido_paterno} ha sido matriculado correctamente en {student.curso_base} {student.letra}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center flex-wrap gap-3 mb-6 no-print">
        <button
          onClick={printSchoolReceipt}
          className="ios-btn ios-btn-success flex items-center space-x-2"
        >
          <span>🖨️</span>
          <span>Imprimir Ficha de Matrícula</span>
        </button>

        <button
          onClick={guardianPrintFn || undefined}
          className="ios-btn ios-btn-success flex items-center space-x-2"
          disabled={!guardianPrintFn}
        >
          <span>🖨️</span>
          <span>Imprimir Comprobante Apoderado</span>
        </button>

        <button
          onClick={printBothReceipts}
          className="ios-btn ios-btn-secondary flex items-center space-x-2"
          disabled={!guardianPrintFn}
        >
          <span>🖨️</span>
          <span>Imprimir Ambos Documentos</span>
        </button>

        <button
          onClick={onBackToHome}
          className="ios-btn ios-btn-primary flex items-center space-x-2"
        >
          <Home size={18} />
          <span>Nueva Matrícula</span>
        </button>
      </div>

      {/* Print styles to hide success message and buttons */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>


      {/* Hidden Receipt for PDF Generation */}
      <div
        ref={receiptRef}
        className="bg-white"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '10mm',
          margin: '0 auto',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          fontSize: '16px',
          lineHeight: '1.5',
          color: '#1f2937'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '3px solid #000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img 
              src="/InsigniaEcuador.png" 
              alt="Escuela Ecuador" 
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
            />
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0' }}>
                ESCUELA REPÚBLICA DEL ECUADOR
              </h1>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>RBD: 312 • Reconocimiento Oficial</p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>Bellavista 3957, Antofagasta</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0' }}>
              FICHA DE MATRÍCULA
            </h2>
            <p style={{ fontSize: '16px', color: '#000000', margin: '0', fontWeight: '600' }}>Año Académico {currentYear}</p>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>
              Emitido: {formatDate(currentDate.toISOString())}
            </p>
          </div>
        </div>

        {/* Student Info */}
        <div style={{ marginBottom: '25px', paddingTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DATOS DEL ESTUDIANTE
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '16px' }}>
            <div>
              Nombres: <strong>{student.nombres}</strong>
              {student.nombre_social && (
                <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '5px' }}>
                  ({student.nombre_social})
                </span>
              )}
            </div>
            <div>RUT: <strong>{formatRut(student.rut, student.dv)}</strong></div>
            <div>Apellido Paterno: <strong>{student.apellido_paterno}</strong></div>
            <div>Apellido Materno: <strong>{student.apellido_materno}</strong></div>
            <div>Fecha de Nacimiento: <strong>{student.fecha_nacimiento ? formatDate(student.fecha_nacimiento) : 'No especificada'}</strong></div>
            <div>Género: <strong>{student.genero}</strong></div>
            <div>Nacionalidad: <strong>{student.nacionalidad}</strong></div>
            <div>Etnia: <strong>{formatEtnia(student.etnia)}</strong></div>
            <div style={{ gridColumn: '1 / -1' }}>
              Dirección: <strong>{student.direccion}{student.complemento_direccion && `, ${student.complemento_direccion}`}</strong>
            </div>
            <div>Comuna: <strong>{student.comuna}</strong></div>
            <div>Previsión: <strong>{student.prevision_salud || 'No especificada'}</strong></div>
          </div>
        </div>

        {/* Academic Info */}
        <div style={{ marginBottom: '25px', paddingTop: '15px', borderTop: '2px solid #000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              INFORMACIÓN ACADÉMICA
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f9', fontSize: '16px' }}>
            <div>Curso: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{student.curso_base}</span></div>
            <div>Letra: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{student.letra}</span></div>
            <div>Religión: <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{student.tipo_religion || 'No especificado'}</span></div>
            <div>Estado: <span style={{ color: '#000000', fontWeight: 'bold', fontSize: '16px' }}>{student.estado || 'matriculado'}</span></div>
          </div>
        </div>

        {/* Guardian Info */}
        {apoderadoPrincipal && (
          <div style={{ marginBottom: '25px', paddingTop: '15px', borderTop: '2px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APODERADO PRINCIPAL
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ fontSize: '17px' }}>{apoderadoPrincipal.nombre} {apoderadoPrincipal.apellido_paterno} {apoderadoPrincipal.apellido_materno}</strong>
              </div>
              <div>Documento: <strong>{getDocumentValue(apoderadoPrincipal)}</strong></div>
              <div>Parentesco: <strong>{apoderadoPrincipal.parentesco}</strong></div>
              <div>Fecha Nacimiento: <strong>{formatDate(apoderadoPrincipal.fecha_nacimiento)}</strong></div>
              <div>Nacionalidad: <strong>{apoderadoPrincipal.nacionalidad || 'No especificado'}</strong></div>
              <div>Teléfono: <strong>{apoderadoPrincipal.celular || 'No especificado'}</strong></div>
              <div>Email: <strong>{apoderadoPrincipal.email || 'No especificado'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                Dirección: <strong>{apoderadoPrincipal.direccion}{apoderadoPrincipal.complemento_direccion && `, ${apoderadoPrincipal.complemento_direccion}`}, {apoderadoPrincipal.comuna}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Información Socioeconómica - Nueva Sección en Página 2 */}
        {apoderadoPrincipal && (apoderadoPrincipal.nivel_educacional || apoderadoPrincipal.situacion_laboral || apoderadoPrincipal.lugar_trabajo) && (
          <div style={{ marginBottom: '25px', pageBreakBefore: 'always', paddingTop: '80px', borderTop: '2px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INFORMACIÓN SOCIOECONÓMICA (PERSONA ASOCIADA AL ESTUDIANTE)
              </h3>
            </div>

            <div style={{ padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '16px' }}>
                {apoderadoPrincipal.nivel_educacional && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    Nivel Educacional: <strong>{apoderadoPrincipal.nivel_educacional}</strong>
                  </div>
                )}
                {apoderadoPrincipal.situacion_laboral && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    Situación Laboral: <strong>{apoderadoPrincipal.situacion_laboral}</strong>
                  </div>
                )}
                {apoderadoPrincipal.lugar_trabajo && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    Lugar de Trabajo: <strong>{apoderadoPrincipal.lugar_trabajo}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Substitute Guardians */}
        {apoderadosSuplentes.length > 0 && (
          <div style={{ marginBottom: '25px', paddingTop: '15px', borderTop: '2px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APODERADO SUPLENTE
              </h3>
            </div>

            {apoderadosSuplentes.map((apoderado, index) => (
              <div key={index} style={{ marginBottom: '15px', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong style={{ fontSize: '17px' }}>{apoderado.nombre} {apoderado.apellido_paterno} {apoderado.apellido_materno}</strong>
                  </div>
                  <div>Documento: <strong>{getDocumentValue(apoderado)}</strong></div>
                  <div>Parentesco: <strong>{apoderado.parentesco}</strong></div>
                  <div>Fecha Nacimiento: <strong>{formatDate(apoderado.fecha_nacimiento)}</strong></div>
                  <div>Nacionalidad: <strong>{apoderado.nacionalidad || 'No especificado'}</strong></div>
                  <div>Teléfono: <strong>{apoderado.celular || 'No especificado'}</strong></div>
                  <div>Email: <strong>{apoderado.email || 'No especificado'}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    Dirección: <strong>{apoderado.direccion}{apoderado.complemento_direccion && `, ${apoderado.complemento_direccion}`}, {apoderado.comuna}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Benefits and Programs */}
        {(student.pie || student.beca || student.pae) && (
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BENEFICIOS Y PROGRAMAS
              </h3>
            </div>
            
            <div style={{ padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'medium' }}>PIE (Programa de Integración Escolar):</span>
                <span style={{ fontWeight: 'bold' }}>{student.pie ? 'SÍ' : 'NO'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'medium' }}>PAE (Programa de Alimentación Escolar):</span>
                <span style={{ fontWeight: 'bold' }}>{student.pae ? 'SÍ' : 'NO'}</span>
              </div>
            </div>
          </div>
        )}

        {/* NEE Section - Modelo Refactorizado */}
        {(() => {
          // Soportar tanto el nuevo modelo (array de objetos TipoNee) como el legacy (campos booleanos)
          const nees = Array.isArray(student.nees) ? student.nees : [];
          const hasNEE = nees.length > 0;

          // Debug: verificar datos NEE
          console.log('DEBUG NEE - Student.nees:', student.nees);
          console.log('DEBUG NEE - Has NEE:', hasNEE);

          return hasNEE ? (
            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  NECESIDADES EDUCATIVAS ESPECIALES (NEE)
                </h3>
              </div>

              <div style={{ padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {nees.map((nee: any, index: number) => (
                      <div key={index} style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px', color: '#10b981' }}>✓</span>
                        <span>{nee.descripcion || nee.codigo || 'NEE sin descripción'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Observations */}
        {(student.observaciones || student.observaciones_matriculador) && (
          <div style={{ marginBottom: '25px', pageBreakBefore: 'always', paddingTop: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                OBSERVACIONES
              </h3>
            </div>
            
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              {student.observaciones && (
                <div style={{ marginBottom: student.observaciones_matriculador ? '10px' : '0' }}>
                  <strong style={{ fontSize: '11px', color: '#000000' }}>GENERALES:</strong>
                  <p style={{ fontSize: '11px', color: '#374151', margin: '5px 0 0 0' }}>{student.observaciones}</p>
                </div>
              )}
              {student.observaciones_matriculador && (
                <div>
                  <p style={{ fontSize: '11px', color: '#374151', margin: '5px 0 0 0' }}>{student.observaciones_matriculador}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div className="section-line" style={{ width: '4px', height: '20px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '10px' }}></div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              FIRMAS Y VALIDACIÓN
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '60px', border: '2px dashed #d1d5db', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Espacio para firma</span>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0', textTransform: 'uppercase' }}>Firma del Apoderado</p>
                <p style={{ fontSize: '11px', color: '#374151', margin: '0 0 10px 0' }}>
                  {apoderadoPrincipal?.nombre} {apoderadoPrincipal?.apellido_paterno}
                </p>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '60px', border: '2px dashed #d1d5db', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timbre y firma</span>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0', textTransform: 'uppercase' }}>Escuela República del Ecuador</p>
                <p style={{ fontSize: '10px', color: '#374151', margin: '0' }}>Registro Oficial de Matrícula</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0' }}>
            Escuela República del Ecuador • RBD: 312 • Bellavista 3957, Antofagasta
          </p>
        </div>
      </div>

      {/* Guardian Receipt - Hidden, only for printing */}
      <div style={{ display: 'none' }}>
        <div data-guardian-receipt>
          <GuardianReceipt
            student={student}
            currentYear={currentYear}
            onPrintReady={(printFn) => setGuardianPrintFn(() => printFn)}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFReceipt;