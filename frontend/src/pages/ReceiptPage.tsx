import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import PDFReceipt from '../components/PDFReceipt';
import GuardianReceipt from '../components/GuardianReceipt';
import TextOnlyReceipt from '../components/TextOnlyReceipt';

interface ReceiptPageProps {
  studentId: string;
}

const ReceiptPage: React.FC<ReceiptPageProps> = ({ studentId }) => {
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [receiptType, setReceiptType] = useState<'visual' | 'guardian' | 'text'>('visual');
  const [guardianPrintFn, setGuardianPrintFn] = useState<(() => void) | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadStudentData();
    fetchCurrentYear();
  }, [studentId]);

  const fetchCurrentYear = async () => {
    try {
      const response = await fetch('/api/year/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentYear(data.year);
      }
    } catch (error) {
      console.error('Error obteniendo año vigente:', error);
    }
  };

  const loadStudentData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      // Primero intentar cargar desde sessionStorage (más rápido)
      const cachedData = sessionStorage.getItem(`receipt_${studentId}`);
      if (cachedData) {
        console.log('📦 Cargando datos desde sessionStorage');
        const data = JSON.parse(cachedData);
        setStudentData(data);
        setIsLoading(false);
        // Limpiar después de cargar
        sessionStorage.removeItem(`receipt_${studentId}`);
        return;
      }

      // Si no está en cache, cargar desde API
      console.log('🌐 Cargando datos desde API');
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });

      if (!studentResponse.ok) {
        throw new Error('Error al obtener datos del estudiante');
      }

      const data = await studentResponse.json();

      const hasCorrectSeparation = data.apoderados &&
                                  data.apoderados.length > 0 &&
                                  data.apoderados_suplentes !== undefined;

      let completeStudentData;

      if (hasCorrectSeparation) {
        completeStudentData = { ...data };
      } else {
        const apoderadosResponse = await fetch(`/api/students/${studentId}/apoderados`, {
          credentials: 'include'
        });

        if (apoderadosResponse.ok) {
          const allApoderados = await apoderadosResponse.json();

          const apoderadosPrincipales = allApoderados.filter((a: any) =>
            a.es_principal === 1 || a.es_principal === true
          );
          const apoderadosSuplentes = allApoderados.filter((a: any) =>
            a.es_suplente === 1 || a.es_suplente === true
          );

          completeStudentData = {
            ...data,
            apoderados: apoderadosPrincipales,
            apoderados_suplentes: apoderadosSuplentes
          };
        } else {
          completeStudentData = {
            ...data,
            apoderados: data.apoderados || [],
            apoderados_suplentes: data.apoderados_suplentes || []
          };
        }
      }

      setStudentData(completeStudentData);

    } catch (err: any) {
      console.error('❌ Error al cargar datos del estudiante:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p className="ios-body">Cargando comprobante...</p>
        </div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="ios-card p-8 text-center max-w-md">
          <AlertCircle size={48} style={{ color: 'var(--color-error)' }} className="mx-auto mb-4" />
          <h2 className="ios-title mb-4">Error al cargar comprobante</h2>
          <p className="ios-body mb-4">{error || 'Estudiante no encontrado'}</p>
          <button
            onClick={() => window.close()}
            className="ios-btn ios-btn-secondary"
          >
            Cerrar pestaña
          </button>
        </div>
      </div>
    );
  }

  const printSchoolReceipt = () => {
    const receiptElement = document.getElementById('school-receipt-content');
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
          <title>Comprobante de Matrícula - Escuela</title>
          <style>
            @media print {
              @page { size: letter; margin: 0; }
              body { margin: 0; padding: 0; }
            }
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printBothReceipts = () => {
    const schoolReceiptElement = document.getElementById('school-receipt-content');
    const guardianReceiptElement = document.querySelector('[style*="210mm"]') as HTMLElement;

    if (!schoolReceiptElement || !guardianReceiptElement) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const schoolClone = schoolReceiptElement.cloneNode(true) as HTMLElement;
    const guardianClone = guardianReceiptElement.cloneNode(true) as HTMLElement;

    const schoolContent = schoolClone.outerHTML;
    const guardianContent = guardianClone.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Documentos de Matrícula</title>
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
          <div class="document">
            ${schoolContent}
          </div>
          <div>
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* GuardianReceipt siempre renderizado (oculto) para tener la función de impresión lista */}
        <div style={{ display: 'none' }}>
          <GuardianReceipt
            student={studentData}
            currentYear={currentYear}
            onPrintReady={(printFn) => setGuardianPrintFn(() => printFn)}
          />
        </div>

        {/* Controles superiores: Botones de acción y tabs */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Comprobante de Matrícula</h3>

          <div className="flex flex-wrap gap-3 items-center mb-4">
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
              onClick={() => window.close()}
              className="ios-btn ios-btn-primary flex items-center space-x-2"
            >
              <span>🏠</span>
              <span>Cerrar</span>
            </button>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg ml-4">
              <button
                onClick={() => setReceiptType('visual')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm ${
                  receiptType === 'visual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                Para Escuela
              </button>
              <button
                onClick={() => setReceiptType('guardian')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm ${
                  receiptType === 'guardian'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                Para Apoderado
              </button>
              <button
                onClick={() => setReceiptType('text')}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm ${
                  receiptType === 'text'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                Texto Simple
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Content */}
        {receiptType === 'visual' ? (
          <div id="school-receipt-content">
            <PDFReceipt
              student={studentData}
              onBackToHome={() => window.close()}
              hideSuccessMessage={true}
            />
          </div>
        ) : receiptType === 'guardian' ? (
          <GuardianReceipt
            student={studentData}
            currentYear={currentYear}
          />
        ) : (
          <TextOnlyReceipt
            studentData={studentData}
            apoderados={[...(studentData.apoderados || []), ...(studentData.apoderados_suplentes || [])]}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptPage;
