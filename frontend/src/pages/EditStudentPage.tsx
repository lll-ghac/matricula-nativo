import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Users, BookOpen, Save, AlertCircle, Plus, Search } from 'lucide-react';
import { regions, nacionalidades, etnias, conQuienViveOptions, parentescoOptions, DEFAULT_REGION, DEFAULT_COMUNA, DEFAULT_ETNIA } from '../utils/chilean-data';
import { useToast } from '../context/ToastContext';

interface Student {
  id: number;
  rut: string;
  dv: string;
  nombres: string;
  nombre_social?: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  genero: string;
  nacionalidad?: string;
  etnia?: string;
  telefono?: string;
  telefono_fijo?: string;
  direccion?: string;
  complemento_direccion?: string;
  comuna?: string;
  region?: string;
  con_quien_vive?: string;
  tipo_religion?: string;
  religion?: boolean;
  curso_base?: string;
  letra?: string;
  estado?: string;
  pie?: boolean;
  beca?: boolean;
  tipo_beca?: string;
  pae?: boolean;
  observaciones?: string;
}

interface Guardian {
  id?: number;
  tipo_documento: string;
  rut?: string;
  dv?: string;
  dni?: string;
  pasaporte?: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  parentesco: string;
  fecha_nacimiento: string;
  genero: string;
  nacionalidad: string;
  direccion: string;
  complemento_direccion?: string;
  region: string;
  comuna: string;
  celular: string;
  email?: string;
  es_suplente?: boolean;
  es_principal?: boolean;
}

interface EditStudentPageProps {
  studentId: string;
  onBack: () => void;
  onUpdate: () => void;
}

// Función para calcular DV del RUT chileno
const calculateDV = (rut: string): string => {
  if (!rut || rut.trim() === '') return '';
  
  // Limpiar el RUT de puntos y espacios
  const cleanRut = rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '');
  
  // Validar que solo contenga números
  if (!/^\d+$/.test(cleanRut)) return '';
  
  let suma = 0;
  let multiplicador = 2;
  
  // Recorrer el RUT de derecha a izquierda
  for (let i = cleanRut.length - 1; i >= 0; i--) {
    suma += parseInt(cleanRut.charAt(i)) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
};

// Función para validar y formatear números de teléfono
const formatPhoneNumber = (value: string): string => {
  // Si está vacío, no hacer nada
  if (value === '') {
    return '';
  }
  
  // Remover todo lo que no sean números o el símbolo +
  value = value.replace(/[^\d+]/g, '');
  
  // Lógica mejorada para formatear automáticamente
  if (!value.startsWith('+56')) {
    if (value.startsWith('+')) {
      // Si empieza con + pero no es +56
      value = '+56' + value.slice(1).replace(/[^\d]/g, '');
    } else if (value.startsWith('569')) {
      // Si empieza con 569, agregar +
      value = '+' + value;
    } else if (value.startsWith('56')) {
      // Si empieza con 56, agregar +
      value = '+' + value;
    } else if (value.startsWith('9')) {
      // Si empieza con 9 (número móvil), agregar +56
      value = '+56' + value;
    } else if (value.length > 0) {
      // Para cualquier otro número, asumir que es el número sin el 9
      value = '+569' + value;
    }
  }
  
  // Limitar a máximo 12 caracteres (+56 seguido de 9 dígitos)
  if (value.length > 12) {
    value = value.substring(0, 12);
  }
  
  // Validar que después del +56 tengamos al menos el 9
  if (value.length >= 4 && value.charAt(3) !== '9') {
    value = value.substring(0, 3) + '9' + value.substring(4);
  }
  
  return value;
};

const EditStudentPage: React.FC<EditStudentPageProps> = ({ studentId, onBack, onUpdate }) => {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<'student' | 'guardians' | 'suplentes' | 'academic'>('student');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [suplentes, setSuplentes] = useState<Guardian[]>([]);
  const [searchingRut, setSearchingRut] = useState<number | null>(null);
  const [searchMessage, setSearchMessage] = useState<string>('');

  // Cargar datos del estudiante
  const loadStudentData = async () => {
    if (!studentId) return;
    
    setIsLoading(true);
    try {
      console.log('🚀 loadStudentData iniciado para estudiante ID:', studentId);
      
      // Cargar datos del estudiante
      console.log('📡 Enviando solicitud GET a:', `/api/students/${studentId}`);
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });
      console.log('📨 Respuesta del servidor:', studentResponse.status, studentResponse.statusText);
      
      if (!studentResponse.ok) {
        throw new Error(`Error ${studentResponse.status}: ${studentResponse.statusText}`);
      }
      
      const studentData = await studentResponse.json();
      console.log('📋 Datos del estudiante cargados:', studentData);
      
      // Mapear valores de género de la BD (F/M) a formato de UI (Femenino/Masculino)
      if (studentData.genero === 'F') {
        studentData.genero = 'Femenino';
      } else if (studentData.genero === 'M') {
        studentData.genero = 'Masculino';
      }
      
      setStudent(studentData);
      
      // Cargar apoderados
      console.log('📡 Cargando apoderados para estudiante ID:', studentId);
      const guardiansResponse = await fetch(`/api/students/${studentId}/apoderados`, {
        credentials: 'include'
      });
      
      if (guardiansResponse.ok) {
        const guardiansData = await guardiansResponse.json();
        console.log('📋 Apoderados cargados:', guardiansData);
        // Separar apoderados principales y suplentes
        const principalGuardians = guardiansData?.filter((g: Guardian) => g.es_principal === true) || [];
        const suplanteGuardians = guardiansData?.filter((g: Guardian) => g.es_suplente === true) || [];
        setGuardians(principalGuardians);
        setSuplentes(suplanteGuardians);
      } else {
        console.warn('⚠️ No se pudieron cargar los apoderados');
        setGuardians([]);
        setSuplentes([]);
      }
      
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      toast.error('Error al cargar los datos del estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  // Función para validar RUT chileno
  const validateRut = (rut: string, dv: string): boolean => {
    if (!rut || !dv) return false;
    
    const rutNumber = parseInt(rut.replace(/[^0-9]/g, ''), 10);
    if (isNaN(rutNumber)) return false;
    
    let sum = 0;
    let multiplier = 2;
    
    const rutStr = rutNumber.toString();
    for (let i = rutStr.length - 1; i >= 0; i--) {
      sum += parseInt(rutStr[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedDv = 11 - (sum % 11);
    let calculatedDv: string;
    
    if (expectedDv === 11) calculatedDv = '0';
    else if (expectedDv === 10) calculatedDv = 'K';
    else calculatedDv = expectedDv.toString();
    
    return dv.toUpperCase() === calculatedDv;
  };

  // Función para buscar apoderado por RUT
  const searchApoderadoByRut = async (index: number, rut: string, dv?: string): Promise<boolean> => {
    if (!rut || rut.length < 7) {
      setSearchMessage('Ingrese un RUT válido para buscar.');
      return false;
    }

    // Si se proporciona DV, validar el RUT completo
    if (dv && !validateRut(rut, dv)) {
      setSearchMessage('RUT inválido. Verifique el formato.');
      return false;
    }

    setSearchingRut(index);
    setSearchMessage('Buscando apoderado...');

    try {
      const response = await fetch(`/api/apoderados/search?rut=${rut}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const apoderadoData = await response.json();
        console.log('✅ Apoderado encontrado:', apoderadoData);
        
        // Actualizar los datos del suplente con la información encontrada
        const newSuplentes = [...suplentes];
        newSuplentes[index] = {
          ...newSuplentes[index],
          id: apoderadoData.id,
          tipo_documento: apoderadoData.tipo_documento || 'RUT',
          rut: apoderadoData.rut?.toString() || rut,
          dv: apoderadoData.dv || dv || '',
          nombre: apoderadoData.nombre || '',
          apellido_paterno: apoderadoData.apellido_paterno || '',
          apellido_materno: apoderadoData.apellido_materno || '',
          parentesco: apoderadoData.parentesco || '',
          fecha_nacimiento: apoderadoData.fecha_nacimiento || '',
          genero: apoderadoData.genero || '',
          nacionalidad: apoderadoData.nacionalidad || 'Chilena',
          direccion: apoderadoData.direccion || '',
          complemento_direccion: apoderadoData.complemento_direccion || '',
          region: apoderadoData.region || DEFAULT_REGION,
          comuna: apoderadoData.comuna || DEFAULT_COMUNA,
          celular: apoderadoData.celular || '',
          email: apoderadoData.email || '',
          es_principal: false
        };
        setSuplentes(newSuplentes);
        setSearchMessage('✅ Apoderado encontrado. Datos cargados correctamente.');
        return true;
      } else if (response.status === 404) {
        setSearchMessage('⚠️ Apoderado no encontrado. Ingrese datos manualmente.');
        return false;
      } else {
        throw new Error('Error en la búsqueda');
      }
    } catch (error) {
      console.error('❌ Error al buscar apoderado:', error);
      setSearchMessage('❌ Error al buscar apoderado. Intente nuevamente.');
      return false;
    } finally {
      setSearchingRut(null);
      setTimeout(() => setSearchMessage(''), 5000);
    }
  };

  const handleGoBack = () => {
    onBack();
  };

  const handleAddSuplente = () => {
    const newSuplente: Guardian = {
      tipo_documento: 'RUT',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      parentesco: '',
      fecha_nacimiento: '',
      genero: '',
      nacionalidad: 'Chilena',
      direccion: '',
      region: DEFAULT_REGION,
      comuna: DEFAULT_COMUNA,
      celular: '',
      es_principal: false // Los suplentes nunca son principales
    };
    setSuplentes([...suplentes, newSuplente]);
    
    // Scroll al nuevo suplente después de un pequeño delay para que el DOM se actualice
    setTimeout(() => {
      const newSuplenteIndex = suplentes.length;
      const newSuplenteElement = document.getElementById(`suplente-${newSuplenteIndex}`);
      if (newSuplenteElement) {
        newSuplenteElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        // Focus específicamente en el campo RUT
        const rutInput = newSuplenteElement.querySelector('input[placeholder="12345678"]') as HTMLInputElement;
        if (rutInput) {
          rutInput.focus();
        }
      }
    }, 200);
  };


  const handleSave = async () => {
    if (!student || !studentId) return;
    
    setIsSaving(true);
    try {
      console.log('💾 Guardando cambios del estudiante...', student);
      console.log('👥 Guardians:', guardians.length, 'Suplentes:', suplentes.length);
      
      // Preparar datos para enviar - convertir género de UI (Femenino/Masculino) a BD (F/M)
      const studentToSave = { ...student };
      if (studentToSave.genero === 'Femenino') {
        studentToSave.genero = 'F';
      } else if (studentToSave.genero === 'Masculino') {
        studentToSave.genero = 'M';
      }
      
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...studentToSave,
          apoderados: [...guardians, ...suplentes]
        }),
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar los datos');
      }
      
      console.log('✅ Estudiante guardado exitosamente');
      toast.success('Datos guardados exitosamente');
      onUpdate(); // Notificar al componente padre que se actualizó
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar los datos: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
          <span className="ml-4 ios-body">Cargando datos del estudiante...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="p-8 text-center">
          <AlertCircle size={48} style={{ color: 'var(--color-error)' }} className="mx-auto mb-4" />
          <h2 className="ios-title mb-4">Estudiante no encontrado</h2>
          <button onClick={handleGoBack} className="ios-btn ios-btn-secondary">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header Compacto */}
      <div className="sticky top-0 z-20" style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div>
                <h1 className="ios-title text-lg">
                  {student.nombres} {student.apellido_paterno}
                </h1>
                <p className="ios-caption text-xs" style={{ color: 'var(--color-secondary)' }}>
                  RUT: {student.rut}-{student.dv}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-16 z-10 max-w-7xl mx-auto px-4 py-2" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
          <button
            onClick={() => setActiveSection('student')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all duration-200 ${
              activeSection === 'student' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'bg-transparent hover:bg-gray-100'
            }`}
          >
            <User size={18} color={activeSection === 'student' ? '#ffffff' : '#3b82f6'} />
            <span className="font-medium">Datos del Estudiante</span>
          </button>
          <button
            onClick={() => setActiveSection('guardians')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all duration-200 ${
              activeSection === 'guardians' 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-transparent hover:bg-gray-100'
            }`}
          >
            <Users size={18} color={activeSection === 'guardians' ? '#ffffff' : '#10b981'} />
            <span className="font-medium">Apoderado Principal</span>
            {guardians.length > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeSection === 'guardians' 
                  ? 'bg-green-400 text-white' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {guardians.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('suplentes')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all duration-200 ${
              activeSection === 'suplentes' 
                ? 'bg-orange-500 text-white shadow-md' 
                : 'bg-transparent hover:bg-gray-100'
            }`}
          >
            <Users size={18} color={activeSection === 'suplentes' ? '#ffffff' : '#f59e0b'} />
            <span className="font-medium">Apoderado Suplente</span>
            {suplentes.length > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeSection === 'suplentes' 
                  ? 'bg-orange-400 text-white' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {suplentes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('academic')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md transition-all duration-200 ${
              activeSection === 'academic' 
                ? 'bg-purple-500 text-white shadow-md' 
                : 'bg-transparent hover:bg-gray-100'
            }`}
          >
            <BookOpen size={18} color={activeSection === 'academic' ? '#ffffff' : '#8b5cf6'} />
            <span className="font-medium">Información Académica</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="ios-card p-6">
          {activeSection === 'student' && (
            <div>
              <h3 className="ios-title mb-4">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="ios-form-label">Nombres *</label>
                  <input
                    type="text"
                    value={student.nombres}
                    onChange={(e) => setStudent({ ...student, nombres: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Apellido Paterno *</label>
                  <input
                    type="text"
                    value={student.apellido_paterno}
                    onChange={(e) => setStudent({ ...student, apellido_paterno: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Apellido Materno *</label>
                  <input
                    type="text"
                    value={student.apellido_materno}
                    onChange={(e) => setStudent({ ...student, apellido_materno: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Nombre Social</label>
                  <input
                    type="text"
                    value={student.nombre_social || ''}
                    onChange={(e) => setStudent({ ...student, nombre_social: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Fecha de Nacimiento *</label>
                  <input
                    type="date"
                    value={student.fecha_nacimiento}
                    onChange={(e) => setStudent({ ...student, fecha_nacimiento: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Género *</label>
                  <select
                    value={student.genero}
                    onChange={(e) => setStudent({ ...student, genero: e.target.value })}
                    className="ios-form-input"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="No binario">No binario</option>
                    <option value="Prefiero no decir">Prefiero no decir</option>
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Nacionalidad *</label>
                  <select
                    value={student.nacionalidad || 'Chilena'}
                    onChange={(e) => setStudent({ ...student, nacionalidad: e.target.value })}
                    className="ios-form-input"
                  >
                    {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Etnia *</label>
                  <select
                    value={student.etnia || DEFAULT_ETNIA}
                    onChange={(e) => setStudent({ ...student, etnia: e.target.value })}
                    className="ios-form-input"
                  >
                    {etnias.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Con quién vive *</label>
                  <select
                    value={student.con_quien_vive || ''}
                    onChange={(e) => setStudent({ ...student, con_quien_vive: e.target.value })}
                    className="ios-form-input"
                  >
                    <option value="">Seleccionar</option>
                    {conQuienViveOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <h3 className="ios-title mb-4 mt-6">Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="ios-form-label">Dirección *</label>
                  <input
                    type="text"
                    value={student.direccion || ''}
                    onChange={(e) => setStudent({ ...student, direccion: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Complemento Dirección</label>
                  <input
                    type="text"
                    value={student.complemento_direccion || ''}
                    onChange={(e) => setStudent({ ...student, complemento_direccion: e.target.value })}
                    className="ios-form-input"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Región *</label>
                  <select
                    value={student.region || DEFAULT_REGION}
                    onChange={(e) => {
                      const newRegion = e.target.value;
                      setStudent({ 
                        ...student, 
                        region: newRegion, 
                        comuna: newRegion === DEFAULT_REGION ? DEFAULT_COMUNA : '' 
                      });
                    }}
                    className="ios-form-input"
                  >
                    {regions.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Comuna *</label>
                  <select
                    value={student.comuna || (student.region === DEFAULT_REGION ? DEFAULT_COMUNA : '')}
                    onChange={(e) => setStudent({ ...student, comuna: e.target.value })}
                    className="ios-form-input"
                    disabled={!student.region}
                  >
                    <option value="">Seleccionar comuna</option>
                    {student.region && regions.find(r => r.nombre === student.region)?.comunas.map(c => 
                      <option key={c} value={c}>{c}</option>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Teléfono Móvil</label>
                  <input
                    type="tel"
                    value={student.telefono || ''}
                    onChange={(e) => setStudent({ ...student, telefono: e.target.value })}
                    className="ios-form-input"
                    placeholder="Ej: +56912345678"
                  />
                </div>
                
                <div>
                  <label className="ios-form-label">Teléfono Fijo</label>
                  <input
                    type="tel"
                    value={student.telefono_fijo || ''}
                    onChange={(e) => setStudent({ ...student, telefono_fijo: e.target.value })}
                    className="ios-form-input"
                    placeholder="Ej: 552123456"
                  />
                </div>
              </div>
              
              {/* Botón Guardar para datos del estudiante */}
              <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="ios-btn ios-btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'guardians' && (
            <div>
              <h3 className="ios-title mb-4">Apoderados</h3>
              {guardians.length > 0 ? (
                <div className="space-y-6">
                  {guardians.map((guardian, index) => (
                    <div key={guardian.id || index} className="ios-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="ios-subtitle">
                          Apoderado #{index + 1}
                          {guardian.es_principal && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Principal</span>}
                        </h4>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="ios-btn ios-btn-primary flex items-center gap-1 px-3 py-2 text-sm"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Guardar
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="ios-form-label">Tipo Documento</label>
                          <select
                            value={guardian.tipo_documento || 'RUT'}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, tipo_documento: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          >
                            <option value="RUT">RUT</option>
                            <option value="DNI">DNI</option>
                            <option value="Pasaporte">Pasaporte</option>
                          </select>
                        </div>
                        
                        {guardian.tipo_documento === 'RUT' ? (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="ios-form-label">RUT</label>
                              <input
                                type="text"
                                value={guardian.rut || ''}
                                onChange={(e) => {
                                  const rutValue = e.target.value;
                                  const newGuardians = [...guardians];
                                  newGuardians[index] = { ...guardian, rut: rutValue };
                                  
                                  // Calcular DV automáticamente si RUT tiene al menos 7 dígitos
                                  if (rutValue && rutValue.length >= 7) {
                                    const calculatedDV = calculateDV(rutValue);
                                    if (calculatedDV) {
                                      newGuardians[index] = { ...newGuardians[index], dv: calculatedDV };
                                    }
                                  }
                                  
                                  setGuardians(newGuardians);
                                }}
                                onBlur={(e) => {
                                  const rutValue = e.target.value;
                                  if (rutValue && rutValue.length >= 7) {
                                    const calculatedDV = calculateDV(rutValue);
                                    if (calculatedDV) {
                                      const newGuardians = [...guardians];
                                      newGuardians[index] = { ...newGuardians[index], dv: calculatedDV };
                                      setGuardians(newGuardians);
                                    }
                                  }
                                }}
                                placeholder="12345678"
                                className="ios-form-input"
                              />
                            </div>
                            <div className="w-16">
                              <label className="ios-form-label">DV</label>
                              <input
                                type="text"
                                value={guardian.dv || ''}
                                onChange={(e) => {
                                  const newGuardians = [...guardians];
                                  newGuardians[index] = { ...guardian, dv: e.target.value };
                                  setGuardians(newGuardians);
                                }}
                                placeholder="9"
                                maxLength={1}
                                className="ios-form-input"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="ios-form-label">
                              {guardian.tipo_documento === 'DNI' ? 'DNI' : 'Pasaporte'}
                            </label>
                            {guardian.tipo_documento === 'DNI' ? (
                              <input
                                type="text"
                                value={guardian.dni || ''}
                                onChange={(e) => {
                                  const newGuardians = [...guardians];
                                  newGuardians[index] = { ...guardian, dni: e.target.value };
                                  setGuardians(newGuardians);
                                }}
                                placeholder="12345678"
                                className="ios-form-input"
                              />
                            ) : (
                              <input
                                type="text"
                                value={guardian.pasaporte || ''}
                                onChange={(e) => {
                                  const newGuardians = [...guardians];
                                  newGuardians[index] = { ...guardian, pasaporte: e.target.value };
                                  setGuardians(newGuardians);
                                }}
                                placeholder="A12345678"
                                className="ios-form-input"
                              />
                            )}
                          </div>
                        )}
                        
                        <div>
                          <label className="ios-form-label">Nombres</label>
                          <input
                            type="text"
                            value={guardian.nombre || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, nombre: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Apellido Paterno</label>
                          <input
                            type="text"
                            value={guardian.apellido_paterno || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, apellido_paterno: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Apellido Materno</label>
                          <input
                            type="text"
                            value={guardian.apellido_materno || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, apellido_materno: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Parentesco</label>
                          <select
                            value={guardian.parentesco || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, parentesco: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          >
                            <option value="">Seleccionar</option>
                            {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Fecha Nacimiento</label>
                          <input
                            type="date"
                            value={guardian.fecha_nacimiento || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, fecha_nacimiento: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Género</label>
                          <select
                            value={guardian.genero || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, genero: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          >
                            <option value="">Seleccionar</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="No binario">No binario</option>
                            <option value="Prefiero no decir">Prefiero no decir</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Nacionalidad</label>
                          <select
                            value={guardian.nacionalidad || 'Chilena'}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, nacionalidad: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          >
                            {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Teléfono Móvil</label>
                          <input
                            type="tel"
                            value={guardian.celular || ''}
                            onChange={(e) => {
                              const formattedValue = formatPhoneNumber(e.target.value);
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, celular: formattedValue };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                            placeholder="+569XXXXXXXX"
                            maxLength={12}
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Email</label>
                          <input
                            type="email"
                            value={guardian.email || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, email: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Dirección</label>
                          <input
                            type="text"
                            value={guardian.direccion || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, direccion: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Complemento Dirección</label>
                          <input
                            type="text"
                            value={guardian.complemento_direccion || ''}
                            onChange={(e) => {
                              const newGuardians = [...guardians];
                              newGuardians[index] = { ...guardian, complemento_direccion: e.target.value };
                              setGuardians(newGuardians);
                            }}
                            className="ios-form-input"
                            placeholder="Depto, block, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`principal-${index}`}
                          checked={guardian.es_principal || false}
                          onChange={(e) => {
                            const newGuardians = [...guardians];
                            // Si se marca como principal, desmarcar otros
                            if (e.target.checked) {
                              newGuardians.forEach((g, i) => {
                                newGuardians[i] = { ...g, es_principal: i === index };
                              });
                            } else {
                              newGuardians[index] = { ...guardian, es_principal: false };
                            }
                            setGuardians(newGuardians);
                          }}
                          className="ios-checkbox"
                        />
                        <label htmlFor={`principal-${index}`} className="ios-form-label">
                          Apoderado Principal
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ios-body text-center py-8" style={{ color: 'var(--color-secondary)' }}>
                  No hay apoderados registrados
                </p>
              )}
              
            </div>
          )}

          {activeSection === 'suplentes' && (
            <div>
              <h3 className="ios-title mb-4">Apoderado Suplente</h3>
              {suplentes.length > 0 ? (
                <div className="space-y-6">
                  {suplentes.map((suplente, index) => (
                    <div key={suplente.id || `suplente-${index}`} id={`suplente-${index}`} className="ios-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="ios-subtitle">
                          Suplente #{index + 1}
                        </h4>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="ios-btn ios-btn-primary flex items-center gap-1 px-3 py-2 text-sm"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Guardar
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="ios-form-label">Tipo Documento</label>
                          <select
                            value={suplente.tipo_documento || 'RUT'}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, tipo_documento: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          >
                            <option value="RUT">RUT</option>
                            <option value="DNI">DNI</option>
                            <option value="Pasaporte">Pasaporte</option>
                          </select>
                        </div>
                        
                        {suplente.tipo_documento === 'RUT' ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="ios-form-label">RUT</label>
                                <input
                                  type="text"
                                  value={suplente.rut || ''}
                                  onChange={(e) => {
                                    const rutValue = e.target.value;
                                    const newSuplentes = [...suplentes];
                                    newSuplentes[index] = { ...suplente, rut: rutValue };
                                    
                                    // Calcular DV automáticamente si RUT tiene al menos 7 dígitos
                                    if (rutValue && rutValue.length >= 7) {
                                      const calculatedDV = calculateDV(rutValue);
                                      if (calculatedDV) {
                                        newSuplentes[index] = { ...newSuplentes[index], dv: calculatedDV };
                                      }
                                    }
                                    
                                    setSuplentes(newSuplentes);
                                    setSearchMessage(''); // Limpiar mensaje al cambiar RUT
                                  }}
                                  onBlur={(e) => {
                                    const rutValue = e.target.value;
                                    if (rutValue && rutValue.length >= 7) {
                                      const calculatedDV = calculateDV(rutValue);
                                      if (calculatedDV) {
                                        const newSuplentes = [...suplentes];
                                        newSuplentes[index] = { ...newSuplentes[index], dv: calculatedDV };
                                        setSuplentes(newSuplentes);
                                      }
                                    }
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      searchApoderadoByRut(index, suplente.rut || '');
                                    }
                                  }}
                                  placeholder="12345678"
                                  className="ios-form-input"
                                  disabled={searchingRut === index}
                                />
                              </div>
                              <div className="w-16">
                                <label className="ios-form-label">DV</label>
                                <input
                                  type="text"
                                  value={suplente.dv || ''}
                                  onChange={(e) => {
                                    const newSuplentes = [...suplentes];
                                    newSuplentes[index] = { ...suplente, dv: e.target.value.toUpperCase() };
                                    setSuplentes(newSuplentes);
                                    setSearchMessage(''); // Limpiar mensaje al cambiar DV
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      searchApoderadoByRut(index, suplente.rut || '');
                                    }
                                  }}
                                  placeholder="9"
                                  maxLength={1}
                                  className="ios-form-input"
                                  disabled={searchingRut === index}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => searchApoderadoByRut(index, suplente.rut || '')}
                                disabled={searchingRut === index || !suplente.rut}
                                className="ios-btn ios-btn-secondary flex items-center gap-1 px-3 py-2 text-sm"
                                title="Buscar apoderado por RUT"
                              >
                                {searchingRut === index ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <Search size={16} />
                                )}
                                {searchingRut === index ? 'Buscando...' : 'Buscar'}
                              </button>
                            </div>
                            {searchMessage && (
                              <div className={`text-sm p-2 rounded ${
                                searchMessage.includes('✅') ? 'bg-green-100 text-green-800' :
                                searchMessage.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                                searchMessage.includes('❌') ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {searchMessage}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="ios-form-label">
                              {suplente.tipo_documento === 'DNI' ? 'DNI' : 'Pasaporte'}
                            </label>
                            {suplente.tipo_documento === 'DNI' ? (
                              <input
                                type="text"
                                value={suplente.dni || ''}
                                onChange={(e) => {
                                  const newSuplentes = [...suplentes];
                                  newSuplentes[index] = { ...suplente, dni: e.target.value };
                                  setSuplentes(newSuplentes);
                                }}
                                placeholder="12345678"
                                className="ios-form-input"
                              />
                            ) : (
                              <input
                                type="text"
                                value={suplente.pasaporte || ''}
                                onChange={(e) => {
                                  const newSuplentes = [...suplentes];
                                  newSuplentes[index] = { ...suplente, pasaporte: e.target.value };
                                  setSuplentes(newSuplentes);
                                }}
                                placeholder="A12345678"
                                className="ios-form-input"
                              />
                            )}
                          </div>
                        )}
                        
                        <div>
                          <label className="ios-form-label">Nombres</label>
                          <input
                            type="text"
                            value={suplente.nombre || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, nombre: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Apellido Paterno</label>
                          <input
                            type="text"
                            value={suplente.apellido_paterno || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, apellido_paterno: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Apellido Materno</label>
                          <input
                            type="text"
                            value={suplente.apellido_materno || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, apellido_materno: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Parentesco</label>
                          <select
                            value={suplente.parentesco || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, parentesco: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          >
                            <option value="">Seleccionar</option>
                            {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Fecha Nacimiento</label>
                          <input
                            type="date"
                            value={suplente.fecha_nacimiento || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, fecha_nacimiento: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Género</label>
                          <select
                            value={suplente.genero || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, genero: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          >
                            <option value="">Seleccionar</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="No binario">No binario</option>
                            <option value="Prefiero no decir">Prefiero no decir</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Nacionalidad</label>
                          <select
                            value={suplente.nacionalidad || 'Chilena'}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, nacionalidad: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          >
                            {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Teléfono Móvil</label>
                          <input
                            type="tel"
                            value={suplente.celular || ''}
                            onChange={(e) => {
                              const formattedValue = formatPhoneNumber(e.target.value);
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, celular: formattedValue };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                            placeholder="+569XXXXXXXX"
                            maxLength={12}
                          />
                        </div>
                        
                        <div>
                          <label className="ios-form-label">Email</label>
                          <input
                            type="email"
                            value={suplente.email || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, email: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                        
                        <div className="md:col-span-1 lg:col-span-2">
                          <label className="ios-form-label">Dirección</label>
                          <input
                            type="text"
                            value={suplente.direccion || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, direccion: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                          />
                        </div>
                        
                        <div className="md:col-span-1 lg:col-span-1">
                          <label className="ios-form-label">Complemento Dirección</label>
                          <input
                            type="text"
                            value={suplente.complemento_direccion || ''}
                            onChange={(e) => {
                              const newSuplentes = [...suplentes];
                              newSuplentes[index] = { ...suplente, complemento_direccion: e.target.value };
                              setSuplentes(newSuplentes);
                            }}
                            className="ios-form-input"
                            placeholder="Depto, casa, piso..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ios-body text-center py-8" style={{ color: 'var(--color-secondary)' }}>
                  No hay apoderados suplentes registrados
                </p>
              )}
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleAddSuplente}
                  className="ios-btn ios-btn-secondary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Agregar Apoderado Suplente
                </button>
              </div>
            </div>
          )}

          {activeSection === 'academic' && (
            <div>
              <h3 className="ios-title mb-4">Información Académica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="ios-form-label">Curso Base *</label>
                  <select
                    value={student.curso_base || ''}
                    onChange={(e) => setStudent({ ...student, curso_base: e.target.value })}
                    className="ios-form-input"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Pre-Kinder">Pre-Kinder</option>
                    <option value="Kinder">Kinder</option>
                    <option value="1° Básico">1° Básico</option>
                    <option value="2° Básico">2° Básico</option>
                    <option value="3° Básico">3° Básico</option>
                    <option value="4° Básico">4° Básico</option>
                    <option value="5° Básico">5° Básico</option>
                    <option value="6° Básico">6° Básico</option>
                    <option value="7° Básico">7° Básico</option>
                    <option value="8° Básico">8° Básico</option>
                    <option value="1° Medio">1° Medio</option>
                    <option value="2° Medio">2° Medio</option>
                    <option value="3° Medio">3° Medio</option>
                    <option value="4° Medio">4° Medio</option>
                    <option value="OP4 - 1° Básico">OP4 - 1° Básico</option>
                    <option value="OP4 - 2° Básico">OP4 - 2° Básico</option>
                    <option value="OP4 - 3° Básico">OP4 - 3° Básico</option>
                    <option value="OP4 - 4° Básico">OP4 - 4° Básico</option>
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Letra *</label>
                  <select
                    value={student.letra || ''}
                    onChange={(e) => setStudent({ ...student, letra: e.target.value })}
                    className="ios-form-input"
                  >
                    <option value="">Seleccionar</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                
                <div>
                  <label className="ios-form-label">Estado</label>
                  <select
                    value={student.estado || ''}
                    disabled={true}
                    className="ios-form-input opacity-60 cursor-not-allowed"
                    title="El estado del estudiante se gestiona desde otra sección de la aplicación"
                  >
                    <option value="matriculado">Matriculado</option>
                    <option value="Inscrito">Inscrito</option>
                    <option value="Retirado">Retirado</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pie"
                    checked={student.pie || false}
                    onChange={(e) => setStudent({ ...student, pie: e.target.checked })}
                    className="ios-checkbox"
                  />
                  <label htmlFor="pie" className="ios-form-label">PIE (Programa de Integración Escolar)</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="beca"
                    checked={student.beca || false}
                    onChange={(e) => setStudent({ ...student, beca: e.target.checked })}
                    className="ios-checkbox"
                  />
                  <label htmlFor="beca" className="ios-form-label">Beca</label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pae"
                    checked={student.pae || false}
                    onChange={(e) => setStudent({ ...student, pae: e.target.checked })}
                    className="ios-checkbox"
                  />
                  <label htmlFor="pae" className="ios-form-label">PAE (Programa de Alimentación Escolar)</label>
                </div>
                
                <div>
                  <label className="ios-form-label">Religión *</label>
                  <select
                    value={student.tipo_religion || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStudent({ 
                        ...student, 
                        tipo_religion: value,
                        religion: value !== '' && value !== 'Ninguna'
                      });
                    }}
                    className="ios-form-input"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Católica">Católica</option>
                    <option value="Evangélica">Evangélica</option>
                    <option value="Ninguna">Ninguna</option>
                  </select>
                </div>
                
                {student.beca && (
                  <div>
                    <label className="ios-form-label">Tipo de Beca</label>
                    <input
                      type="text"
                      value={student.tipo_beca || ''}
                      onChange={(e) => setStudent({ ...student, tipo_beca: e.target.value })}
                      className="ios-form-input"
                    />
                  </div>
                )}
                
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="ios-form-label">Observaciones</label>
                  <textarea
                    value={student.observaciones || ''}
                    onChange={(e) => setStudent({ ...student, observaciones: e.target.value })}
                    className="ios-form-input min-h-20"
                    rows={3}
                  />
                </div>
              </div>
              
              {/* Botón Guardar para información académica */}
              <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="ios-btn ios-btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditStudentPage;