import React from 'react';
import { Printer, Home, X } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import type { StudentData, ApoderadoData } from '../types';

interface StudentReceiptProps {
  student: StudentData;
  onClose?: () => void; // Opcional, por compatibilidad
  onBackToHome: () => void;
}

const StudentReceipt: React.FC<StudentReceiptProps> = ({ student, onBackToHome }) => {
  console.log('📄 StudentReceipt - Datos del estudiante recibidos:', student);
  console.log('📄 RUT recibido:', student.rut, 'DV recibido:', student.dv);
  
  const [currentYear, setCurrentYear] = React.useState<number>(new Date().getFullYear());

  // Cargar año vigente al montar el componente
  React.useEffect(() => {
    const fetchCurrentYear = async () => {
      try {
        const response = await fetch('/api/year/current');
        if (response.ok) {
          const data = await response.json();
          setCurrentYear(data.year);
        }
      } catch (error) {
        console.error('Error obteniendo año vigente:', error);
        // Mantener el año actual como fallback
      }
    };

    fetchCurrentYear();
  }, []);

  // Validate student data
  if (!student) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg">
          <p className="text-red-600">Error: No se encontraron datos del estudiante</p>
          <button onClick={onBackToHome} className="mt-4 bg-gray-600 text-white px-4 py-2 rounded">
            Volver a Búsqueda
          </button>
        </div>
      </div>
    );
  }

  const apoderados = student.apoderados || [];
  // ✅ FIX: Usar tipo_relacion u orden para filtrar apoderados
  const apoderadoPrincipal = apoderados.find(a =>
    a.tipo_relacion === 'principal' || a.orden === 1 || a.es_principal === true
  );
  const apoderadosSecundarios = apoderados.filter(a =>
    a.tipo_relacion === 'suplente' || a.orden === 2 || a.es_suplente === true
  );
  const currentDate = new Date();
  const matriculaNumber = `${currentYear}-${String(student.id || Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const formatRut = (rut?: string | number, dv?: string) => {
    console.log('🔍 formatRut llamado con:', { rut, dv, rutType: typeof rut, dvType: typeof dv });
    
    if (!rut || !dv) {
      console.log('❌ RUT o DV faltante');
      return 'No especificado';
    }
    
    // Convert to string and clean any existing formatting
    const cleanRut = String(rut).replace(/[^\d]/g, '');
    const cleanDv = String(dv).trim();
    
    console.log('🧹 RUT limpio:', cleanRut, 'DV limpio:', cleanDv);
    
    if (cleanRut.length === 0) {
      console.log('❌ RUT vacío después de limpiar');
      return 'No especificado';
    }
    
    const formattedRut = cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const result = `${formattedRut}-${cleanDv}`;
    
    console.log('✅ RUT formateado:', result);
    return result;
  };

  const getDocumentValue = (apoderado: ApoderadoData) => {
    if (!apoderado || !apoderado.tipo_documento) return 'No especificado';
    
    switch (apoderado.tipo_documento) {
      case 'RUT':
        return formatRut(apoderado.rut, apoderado.dv);
      case 'DNI':
        return apoderado.dni && String(apoderado.dni).trim() ? String(apoderado.dni) : 'No especificado';
      case 'Pasaporte':
        return apoderado.pasaporte && String(apoderado.pasaporte).trim() ? String(apoderado.pasaporte) : 'No especificado';
      default:
        return 'No especificado';
    }
  };

  const formatEtnia = (etnia?: string | null): string => {
    if (!etnia || etnia === '0' || etnia.toString() === '0') {
      return 'No pertenece a ninguna etnia';
    }
    return etnia;
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="ios-container py-8">
      <div className="ios-card">
        {/* Controls - Hidden in print */}
        <div className="no-print flex justify-between items-center p-6 border-b-2" style={{borderColor: 'var(--color-border)'}}>
          <h3 className="ios-title">Comprobante de Matrícula</h3>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="ios-btn ios-btn-primary flex items-center space-x-2"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onBackToHome}
              className="ios-btn ios-btn-success flex items-center space-x-2"
            >
              <Home size={16} />
              <span>Nueva Matrícula</span>
            </button>
            <button
              onClick={onBackToHome}
              className="ios-btn ios-btn-secondary flex items-center space-x-2"
            >
              <X size={16} />
              <span>Cerrar Comprobante</span>
            </button>
          </div>
        </div>

        {/* Receipt Document */}
        <div className="receipt-document p-6 font-sans" style={{backgroundColor: 'white', color: 'var(--color-foreground)', lineHeight: '1.5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"}}>
          {/* Header with logo */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b-2" style={{borderColor: 'var(--color-primary)'}}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 p-1 border-2 rounded-xl" style={{borderColor: 'var(--color-primary)'}}>
                <img 
                  src="/InsigniaEcuador.png" 
                  alt="Insignia Institucional" 
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-0">
                <h1 className="text-base font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                  Escuela República del Ecuador
                </h1>
                <p className="text-xs font-medium" style={{color: 'var(--color-secondary)'}}>
                  Registro Oficial
                </p>
              </div>
            </div>
            <div className="text-right space-y-0">
              <div className="px-2 py-1 rounded-lg border-2" style={{borderColor: 'var(--color-primary)'}}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>
                  N° Matrícula
                </p>
                <p className="text-sm font-bold" style={{color: 'var(--color-foreground)'}}>{matriculaNumber}</p>
              </div>
              <p className="text-xs font-medium mt-1" style={{color: 'var(--color-secondary)'}}>
                {currentDate.toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'short', 
                  year: 'numeric'
                })} • {currentDate.toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="inline-block px-6 py-3 border-2 rounded-2xl" style={{borderColor: 'var(--color-primary)'}}>
              <div className="flex items-center justify-center space-x-6">
                <div className="text-left">
                  <h2 className="text-lg font-bold mb-1 uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '1px'}}>
                    COMPROBANTE DE MATRÍCULA
                  </h2>
                  <h3 className="text-base font-semibold" style={{color: 'var(--color-foreground)'}}>
                    Año Lectivo {currentYear}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{color: 'var(--color-secondary)'}}>
                    Curso Asignado
                  </p>
                  <p className="text-xl font-bold" style={{color: 'var(--color-deep-teal)'}}>
                    {student.curso_base} {student.letra}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full h-0.5 mx-auto mt-4 border-t-2" style={{borderColor: 'var(--color-primary)'}}></div>
          </div>

          {/* Student Information */}
          <div className="mb-6 pb-4 border-b-2" style={{borderColor: 'var(--color-border)'}}>
            <div className="flex items-center mb-4">
              <div className="w-1 h-6 rounded-full mr-3" style={{border: '1px solid var(--color-border)'}}></div>
              <h4 className="text-base font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                DATOS DEL ESTUDIANTE
              </h4>
              <div className="flex-1 ml-4 h-0.5" style={{border: '1px solid var(--color-border)'}}></div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Nombre Completo</span>
                <p className="text-base font-semibold" style={{color: 'var(--color-foreground)'}}>
                  {student.nombres} {student.apellido_paterno} {student.apellido_materno}
                </p>
                {student.nombre_social && (
                  <p className="text-xs mt-1 italic" style={{color: 'var(--color-secondary)'}}>Nombre Social: {student.nombre_social}</p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>RUT</span>
                <p className="text-base font-mono font-bold" style={{color: 'var(--color-foreground)'}}>{formatRut(student.rut, student.dv)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Fecha de Nacimiento</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{formatDate(student.fecha_nacimiento)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Género</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{student.genero || 'No especificado'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Nacionalidad</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{student.nacionalidad || 'No especificado'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Etnia</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{formatEtnia(student.etnia)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Religión</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>
                  {student.tipo_religion || 'No especificado'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Con Quién Vive</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>
                  {student.con_quien_vive || 'No especificado'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Teléfono de Contacto</span>
                <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{student.telefono || 'No especificado'}</p>
              </div>
            </div>
            
            <div className="mt-1 p-1 rounded-lg" style={{border: '1px solid var(--color-border)'}}>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Dirección</span>
              <p className="mt-0 text-xs font-medium" style={{color: 'var(--color-foreground)'}}>
                {student.direccion}
                {student.complemento_direccion && `, ${student.complemento_direccion}`}
              </p>
              <p className="text-xs mt-0" style={{color: 'var(--color-secondary)'}}>{student.comuna}, {student.region}</p>
            </div>
          </div>

          {/* Principal Guardian Information */}
          {apoderadoPrincipal && (
            <div className="mb-6 pb-4 border-b-2" style={{borderColor: 'var(--color-border)'}}>
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 rounded-full mr-3" style={{border: '1px solid var(--color-border)'}}></div>
                <h4 className="text-base font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                  APODERADO PRINCIPAL
                </h4>
                <div className="flex-1 ml-4 h-0.5" style={{border: '1px solid var(--color-border)'}}></div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Nombre Completo</span>
                  <p className="text-base font-semibold" style={{color: 'var(--color-foreground)'}}>
                    {apoderadoPrincipal.nombre} {apoderadoPrincipal.apellido_paterno} {apoderadoPrincipal.apellido_materno}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>{apoderadoPrincipal.tipo_documento}</span>
                  <p className="text-base font-mono font-bold" style={{color: 'var(--color-foreground)'}}>{getDocumentValue(apoderadoPrincipal)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Parentesco</span>
                  <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{apoderadoPrincipal.parentesco}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Fecha de Nacimiento</span>
                  <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{formatDate(apoderadoPrincipal.fecha_nacimiento)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Teléfono</span>
                  <p className="text-base font-mono font-bold" style={{color: 'var(--color-foreground)'}}>{apoderadoPrincipal.celular}</p>
                </div>
                {apoderadoPrincipal.email && (
                  <div className="col-span-2 space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Correo Electrónico</span>
                    <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{apoderadoPrincipal.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secondary Guardians */}
          {apoderadosSecundarios.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-1 h-6 rounded-full mr-3" style={{border: '1px solid var(--color-border)'}}></div>
                <h4 className="text-lg font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                  APODERADO SUPLENTE
                </h4>
              </div>
              {apoderadosSecundarios.map((apoderado, index) => (
                <div key={index} className="mb-6 p-4 border-2 rounded-lg" style={{borderColor: 'var(--color-border)'}}>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Nombre Completo</span>
                      <p className="text-base font-semibold" style={{color: 'var(--color-foreground)'}}>
                        {apoderado.nombre} {apoderado.apellido_paterno} {apoderado.apellido_materno}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>{apoderado.tipo_documento}</span>
                      <p className="text-base font-mono font-bold" style={{color: 'var(--color-foreground)'}}>{getDocumentValue(apoderado)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Parentesco</span>
                      <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{apoderado.parentesco}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Fecha de Nacimiento</span>
                      <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{formatDate(apoderado.fecha_nacimiento)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Teléfono</span>
                      <p className="text-base font-mono font-bold" style={{color: 'var(--color-foreground)'}}>{apoderado.celular}</p>
                    </div>
                    {apoderado.email && (
                      <div className="col-span-2 space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Correo Electrónico</span>
                        <p className="text-base font-medium" style={{color: 'var(--color-foreground)'}}>{apoderado.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Academic Programs and Benefits */}
          <div className="mb-6 pb-4 border-b-2" style={{borderColor: 'var(--color-border)'}}>
            <div className="flex items-center mb-4">
              <div className="w-1 h-6 rounded-full mr-3" style={{border: '1px solid var(--color-border)'}}></div>
              <h4 className="text-base font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                PROGRAMAS Y BENEFICIOS
              </h4>
              <div className="flex-1 ml-4 h-0.5" style={{border: '1px solid var(--color-border)'}}></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b" style={{borderColor: 'var(--color-border)'}}>
                <span className="font-medium">PIE (Programa Integración Escolar):</span>
                <span className="font-bold">{student.pie ? 'SÍ' : 'NO'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b" style={{borderColor: 'var(--color-border)'}}>
                <span className="font-medium">PAE (Postulacion al Programa Alimentación Escolar):</span>
                <span className="font-bold">{student.pae ? 'SÍ' : 'NO'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b" style={{borderColor: 'var(--color-border)'}}>
                <span className="font-medium">Beca:</span>
                <span className="font-bold">{student.beca ? 'SÍ' : 'NO'}</span>
              </div>
              {student.beca && student.tipo_beca && (
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium">Tipo de Beca:</span>
                  <span className="font-bold">{student.tipo_beca}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observations */}
          {(student.observaciones || student.observaciones_matriculador) && (
            <div className="mb-2">
              <div className="flex items-center mb-1">
                <div className="w-1 h-4 rounded-full mr-2" style={{border: '1px solid var(--color-border)'}}></div>
                <h4 className="text-sm font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                  OBSERVACIONES
                </h4>
              </div>
              <div className="space-y-0">
                {student.observaciones && (
                  <div className="p-1 rounded-lg" style={{border: '1px solid var(--color-border)'}}>
                    <span className="text-xs font-semibold uppercase tracking-wide block mb-0" style={{color: 'var(--color-foreground)'}}>Generales</span>
                    <p className="text-xs leading-tight" style={{color: 'var(--color-foreground)'}}>{student.observaciones}</p>
                  </div>
                )}
                {student.observaciones_matriculador && (
                  <div className="p-1 rounded-lg mt-1" style={{border: '1px solid var(--color-border)'}}>
                    <span className="text-xs font-semibold uppercase tracking-wide block mb-0" style={{color: 'var(--color-foreground)'}}>Matriculador</span>
                    <p className="text-xs leading-tight" style={{color: 'var(--color-foreground)'}}>{student.observaciones_matriculador}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-12">
            <div className="flex items-center mb-6">
              <div className="w-1 h-8 rounded-full mr-4" style={{border: '1px solid var(--color-border)'}}></div>
              <h4 className="text-lg font-bold uppercase tracking-wide" style={{color: 'var(--color-deep-teal)', letterSpacing: '0.5px'}}>
                FIRMAS Y VALIDACIÓN
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="h-24 border-2 border-dashed rounded-lg mb-4 flex items-center justify-center" style={{borderColor: 'var(--color-border)'}}>
                  <span className="text-sm uppercase tracking-wide" style={{color: 'var(--color-text-light)'}}>Espacio para firma</span>
                </div>
                <div className="p-3 rounded-lg" style={{border: '1px solid var(--color-border)'}}>
                  <p className="text-sm font-bold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Firma del Apoderado</p>
                  <p className="text-xs mt-2 font-medium" style={{color: 'var(--color-secondary)'}}>
                    {apoderadoPrincipal?.nombre} {apoderadoPrincipal?.apellido_paterno}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{color: 'var(--color-secondary)'}}>RUN o I.P.A:</span>
                      <div className="border-b border-dashed w-20" style={{borderColor: 'var(--color-border)'}}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{color: 'var(--color-secondary)'}}>Fecha:</span>
                      <div className="border-b border-dashed w-20" style={{borderColor: 'var(--color-border)'}}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="h-24 border-2 border-dashed rounded-lg mb-4 flex items-center justify-center" style={{borderColor: 'var(--color-border)'}}>
                  <span className="text-sm uppercase tracking-wide" style={{color: 'var(--color-text-light)'}}>Espacio para timbre y firma</span>
                </div>
                <div className="p-3 rounded-lg" style={{border: '1px solid var(--color-border)'}}>
                  <p className="text-sm font-bold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>Validación Institucional</p>
                  <p className="text-xs mt-1 font-medium" style={{color: 'var(--color-secondary)'}}>Timbre y Firma del Establecimiento</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{color: 'var(--color-secondary)'}}>Fecha:</span>
                      <div className="border-b border-dashed w-20" style={{borderColor: 'var(--color-border)'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 pt-1 border-t-2" style={{borderColor: 'var(--color-primary)'}}>
            <div className="text-center p-1 rounded-lg" style={{border: '1px solid var(--color-border)'}}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{color: 'var(--color-foreground)'}}>
                Documento Oficial • Matrícula {currentYear} • Conservar para trámites
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReceipt;