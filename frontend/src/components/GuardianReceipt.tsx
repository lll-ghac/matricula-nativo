import React, { useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDate as formatDateUtil } from '../utils/dateUtils';
import type { StudentData } from '../types';
import { useToast } from '../context/ToastContext';

interface GuardianReceiptProps {
  student: StudentData;
  currentYear: number;
  onPrintReady?: (printFn: () => void) => void;
  // false cuando el comprobante se usa como documento para imprimir o en vista previa.
  mostrarBotonDescarga?: boolean;
}

const GuardianReceipt: React.FC<GuardianReceiptProps> = ({ student, currentYear, onPrintReady, mostrarBotonDescarga = true }) => {
  const toast = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatRut = (rut?: string | number, dv?: string) => {
    if (!rut) return '';
    const cleanRut = String(rut).replace(/[^\d]/g, '');
    if (cleanRut.length === 0) return '';
    const formattedRut = cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dv ? `${formattedRut}-${dv}` : formattedRut;
  };


  const allGuardians = student.apoderados || [];
  const apoderadoPrincipal = allGuardians.find(a => a.es_principal === true);
  const apoderadosSuplentes = allGuardians.filter(a => a.es_principal === false);
  const apoderadoSuplente = apoderadosSuplentes[0]; // Tomar el primer suplente

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Por favor permite las ventanas emergentes para imprimir');
      return;
    }

    // Clonar el elemento para obtener todos los estilos computados
    const clone = receiptRef.current.cloneNode(true) as HTMLElement;
    const content = clone.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Matrícula - Apoderado</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page {
                size: letter;
                margin: 0;
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
          </style>
        </head>
        <body>
          ${content}
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

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        useCORS: true,
        logging: false,
        background: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Comprobante_Apoderado_${student.nombres}_${student.apellido_paterno}_${currentYear}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF del comprobante');
    }
  };

  useEffect(() => {
    if (onPrintReady) {
      onPrintReady(handlePrint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Botón de descarga (no es parte del documento) */}
      {mostrarBotonDescarga && (
      <div className="mb-6 flex justify-center no-print">
        <button
          onClick={handleDownloadPDF}
          className="ios-btn ios-btn-primary flex items-center gap-2"
        >
          📄 Descargar Comprobante Apoderado
        </button>
      </div>
      )}

      {/* Comprobante */}
      <div
        ref={receiptRef}
        style={{
          width: '210mm',
          margin: '0 auto',
          padding: '8mm 15mm 10mm 15mm',
          backgroundColor: 'white',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          fontSize: '15px',
          lineHeight: '1.4',
          color: '#1f2937'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '3px solid #000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img
              src="/InsigniaEcuador.png"
              alt="Escuela Ecuador"
              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
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
              COMPROBANTE DE MATRÍCULA
            </h2>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '0', fontStyle: 'italic' }}>Apoderado/a</p>
            <p style={{ fontSize: '16px', color: '#000000', margin: '0', fontWeight: '600' }}>Año Académico {currentYear}</p>
          </div>
        </div>

        {/* DATOS DEL ESTUDIANTE */}
        <div style={{ marginBottom: '10px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '4px', height: '18px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '8px' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DATOS DEL ESTUDIANTE
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', marginBottom: '0' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              Nombre Completo: <strong>{student.nombres} {student.apellido_paterno} {student.apellido_materno}</strong>
            </div>
            <div>RUT: <strong>{formatRut(student.rut, student.dv)}</strong></div>
            <div>Fecha de Nacimiento: <strong>{student.fecha_nacimiento ? formatDateUtil(student.fecha_nacimiento) : 'No especificada'}</strong></div>
          </div>
        </div>

        {/* DATOS DE LOS APODERADOS */}
        <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '2px solid #000000' }}>
          {/* Apoderado Principal */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '4px', height: '18px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '8px' }}></div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APODERADO PRINCIPAL
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                Nombre Completo: <strong>{apoderadoPrincipal?.nombre} {apoderadoPrincipal?.apellido_paterno} {apoderadoPrincipal?.apellido_materno}</strong>
              </div>
              <div>
                Documento: <strong>{formatRut(apoderadoPrincipal?.rut, apoderadoPrincipal?.dv)}</strong>
                {apoderadoPrincipal?.dni && <span> / DNI: <strong>{apoderadoPrincipal.dni}</strong></span>}
                {apoderadoPrincipal?.pasaporte && <span> / Pasaporte: <strong>{apoderadoPrincipal.pasaporte}</strong></span>}
              </div>
              <div>Teléfono: <strong>{apoderadoPrincipal?.celular || 'No especificado'}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                Correo Electrónico: <strong>{apoderadoPrincipal?.email || 'No especificado'}</strong>
              </div>
            </div>
          </div>

          {/* Apoderado Suplente */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ width: '4px', height: '18px', backgroundColor: '#6b7280', borderRadius: '2px', marginRight: '8px' }}></div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APODERADO SUPLENTE
              </h3>
            </div>

            {apoderadoSuplente ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '15px', backgroundColor: '#f9fafb' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  Nombre Completo: <strong>{apoderadoSuplente.nombre} {apoderadoSuplente.apellido_paterno} {apoderadoSuplente.apellido_materno}</strong>
                </div>
                <div>
                  Documento: <strong>{formatRut(apoderadoSuplente.rut, apoderadoSuplente.dv)}</strong>
                  {apoderadoSuplente.dni && <span> / DNI: <strong>{apoderadoSuplente.dni}</strong></span>}
                  {apoderadoSuplente.pasaporte && <span> / Pasaporte: <strong>{apoderadoSuplente.pasaporte}</strong></span>}
                </div>
                <div>Teléfono: <strong>{apoderadoSuplente.celular || 'No especificado'}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  Correo Electrónico: <strong>{apoderadoSuplente.email || 'No especificado'}</strong>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px dashed #d1d5db', fontSize: '14px', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', backgroundColor: '#f9fafb' }}>
                No registrado
              </div>
            )}
          </div>
        </div>

        {/* DATOS DEL ESTABLECIMIENTO */}
        <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '2px solid #000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '4px', height: '18px', backgroundColor: '#000000', borderRadius: '2px', marginRight: '8px' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#000000', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DATOS DEL ESTABLECIMIENTO
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9f9f9', fontSize: '15px', marginBottom: '0' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              Establecimiento: <strong>ESCUELA REPÚBLICA DEL ECUADOR</strong>
            </div>
            <div>RBD: <strong>312-3</strong></div>
            <div>Curso: <strong>{student.curso_base} {student.letra}</strong></div>
            <div>Año Escolar: <strong>{currentYear}</strong></div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center' }}>
              Jornada: <span style={{ marginLeft: '8px', borderBottom: '1px solid #000', width: '300px', display: 'inline-block', height: '20px' }}></span>
            </div>
          </div>
        </div>

        {/* FIRMAS Y VALIDACIÓN */}
        <div style={{ marginTop: '10px', paddingTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '2px solid #000000', marginBottom: '6px' }}></div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000000' }}>FIRMA DEL APODERADO</p>
              <p style={{ fontSize: '10px', margin: '3px 0 0 0', color: '#6b7280' }}>
                {apoderadoPrincipal?.nombre} {apoderadoPrincipal?.apellido_paterno}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '50px', borderBottom: '2px solid #000000', marginBottom: '6px' }}></div>
              <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0', color: '#000000' }}>FIRMA/TIMBRE ESTABLECIMIENTO</p>
              <p style={{ fontSize: '10px', margin: '3px 0 0 0', color: '#6b7280' }}>Registro Oficial de Matrícula</p>
            </div>
          </div>

          {/* NOTA LEGAL */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', backgroundColor: '#f9fafb' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#000000' }}>
              IMPORTANTE:
            </p>
            <p style={{ fontSize: '11px', margin: '0 0 5px 0', textAlign: 'justify', color: '#374151', lineHeight: '1.4' }}>
              <strong>1.</strong> Este comprobante se entrega en conformidad a lo establecido en el artículo 53, inciso 1 del Decreto Exento N° 152 del año 2016, del Ministerio de Educación que acredita la matrícula del alumno o alumna en este Establecimiento Educacional, para el año {currentYear}.
            </p>
            <p style={{ fontSize: '11px', margin: '0 0 5px 0', textAlign: 'justify', color: '#374151', lineHeight: '1.4' }}>
              <strong>2.</strong> Es responsabilidad del Establecimiento Educacional formalizar esta matrícula a través del Sistema de Información General de Estudiantes (SIGE).
            </p>
            <p style={{ fontSize: '11px', margin: '0', textAlign: 'justify', color: '#374151', lineHeight: '1.4' }}>
              <strong>3.</strong> Este documento debe entregarse en 2 copias, quedando una en poder del Establecimiento y otra en poder del Apoderado(a).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianReceipt;
