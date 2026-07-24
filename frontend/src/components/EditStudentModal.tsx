import React, { useState, useEffect } from 'react';
import { X, User, Users, BookOpen, Save, AlertCircle, Heart } from 'lucide-react';
import NEEForm from './NEEForm';
import { nacionalidades } from '../utils/chilean-data';

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
  curso_base?: string;
  letra?: string;
  estado?: string;
  pie?: boolean;
  beca?: boolean;
  tipo_beca?: string;
  pae?: boolean;
  observaciones?: string;

  // NEE - Sensoriales
  nee_discapacidad_visual_total?: boolean;
  nee_baja_vision?: boolean;
  nee_discapacidad_auditiva_total?: boolean;
  nee_hipoacusia?: boolean;
  nee_implante_coclear?: boolean;
  nee_materiales_adaptados?: boolean;

  // NEE - Motrices / Físicas
  nee_discapacidad_motora?: boolean;
  nee_paralisis_cerebral?: boolean;
  nee_dificultad_coordinacion?: boolean;
  nee_ayudas_tecnicas?: boolean;
  nee_apoyo_desplazamiento?: boolean;

  // NEE - Cognitivas / Intelectuales
  nee_discapacidad_intelectual_leve?: boolean;
  nee_discapacidad_intelectual_moderada?: boolean;
  nee_retraso_desarrollo?: boolean;
  nee_dificultad_razonamiento?: boolean;
  nee_adaptaciones_curriculares?: boolean;

  // NEE - Trastornos del Neurodesarrollo
  nee_tea_grado1?: boolean;
  nee_tea_grado2?: boolean;
  nee_tea_grado3?: boolean;
  nee_tel?: boolean;
  nee_dispraxia?: boolean;
  nee_tdah?: boolean;
  nee_trastorno_comunicacion?: boolean;

  // NEE - Dificultades Específicas del Aprendizaje
  nee_dislexia?: boolean;
  nee_disortografia?: boolean;
  nee_disgrafia?: boolean;
  nee_discalculia?: boolean;
  nee_dificultades_aprendizaje?: boolean;

  // NEE - Trastornos Emocionales y Conductuales
  nee_trastorno_conducta?: boolean;
  nee_trastorno_ansiedad?: boolean;
  nee_trastorno_animo?: boolean;
  nee_dificultad_autorregulacion?: boolean;
  nee_conductas_disruptivas?: boolean;
  nee_problemas_convivencia?: boolean;

  // NEE - Condiciones Médicas Relevantes
  nee_epilepsia?: boolean;
  nee_diabetes?: boolean;
  nee_asma?: boolean;
  nee_enfermedad_cardiaca?: boolean;
  nee_otras_condiciones_medicas?: boolean;

  // NEE - Altas Capacidades / Talentos
  nee_altas_capacidades?: boolean;
  nee_talento_artistico?: boolean;
  nee_enriquecimiento_curricular?: boolean;

  // NEE - Contexto Familiar y Socioemocional
  nee_vulnerabilidad_social?: boolean;
  nee_negligencia_maltrato?: boolean;
  nee_acompanamiento_duelo?: boolean;
  nee_apoyo_ansiedad_escolar?: boolean;
  nee_ausencias_prolongadas?: boolean;

  // NEE - Otras Necesidades Específicas
  nee_dificultades_temporales?: boolean;
  nee_lengua_materna_distinta?: boolean;
  nee_comunicacion_alternativa?: boolean;
  nee_adaptaciones_acceso?: boolean;
  nee_otra_necesidad?: boolean;
  nee_observaciones?: string;
  nees?: number[];
}

interface Guardian {
  id?: number;
  tipo_documento?: string; // RUT, DNI, Pasaporte
  rut: string;  // Obligatorio
  dv: string;   // Obligatorio
  dni?: string; // Opcional
  pasaporte?: string; // Opcional
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  parentesco: string;
  fecha_nacimiento?: string;
  genero?: string;
  nacionalidad?: string;
  telefono?: string;
  celular: string;
  email: string;
  direccion: string;
  complemento_direccion?: string;
  region: string;
  comuna: string;
  es_principal?: boolean;
  es_suplente?: boolean;
}

interface Course {
  id: number;
  nombre: string;
  base: string;
  letra: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  onUpdate: () => void;
  initialSection?: 'student' | 'guardians' | 'academic' | 'nee';
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, studentId, onUpdate, initialSection }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [activeSection, setActiveSection] = useState<'student' | 'guardians' | 'academic' | 'nee'>(initialSection || 'student');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && studentId) {
      if (initialSection) setActiveSection(initialSection);
      loadStudentData();
      loadCourses();
    }
  }, [isOpen, studentId]);

  const loadStudentData = async () => {
    console.log('🚀 loadStudentData iniciado para estudiante ID:', studentId);
    setIsLoading(true);
    setError('');
    
    try {
      console.log('📡 Enviando solicitud GET a:', `/api/students/${studentId}`);
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        credentials: 'include'
      });
      
      console.log('📨 Respuesta del servidor:', studentResponse.status, studentResponse.statusText);
      
      if (!studentResponse.ok) {
        const errorText = await studentResponse.text();
        console.error('❌ Error en respuesta del estudiante:', errorText);
        throw new Error(`Error al cargar datos del estudiante: ${studentResponse.status} ${studentResponse.statusText}`);
      }
      
      const studentData = await studentResponse.json();
      console.log('✅ Datos del estudiante recibidos:', studentData);
      console.log('📋 Campos importantes del estudiante:');
      console.log('- Nombres:', studentData.nombres);
      console.log('- Género:', studentData.genero);
      console.log('- Nacionalidad:', studentData.nacionalidad);
      console.log('- Etnia:', studentData.etnia);
      console.log('- Con quién vive:', studentData.con_quien_vive);
      console.log('- Teléfono:', studentData.telefono);
      console.log('- Teléfono fijo:', studentData.telefono_fijo);
      console.log('- PIE:', studentData.pie);
      console.log('- Beca:', studentData.beca);
      console.log('- PAE:', studentData.pae);
      
      setStudent(studentData);

      console.log('📡 Enviando solicitud GET a:', `/api/students/${studentId}/apoderados`);
      const guardiansResponse = await fetch(`/api/students/${studentId}/apoderados`, {
        credentials: 'include'
      });
      
      console.log('📨 Respuesta de apoderados:', guardiansResponse.status, guardiansResponse.statusText);
      
      if (guardiansResponse.ok) {
        const guardiansData = await guardiansResponse.json();
        console.log('✅ Datos de apoderados recibidos:', guardiansData);
        setGuardians(guardiansData);
      } else {
        console.log('⚠️ No se pudieron cargar apoderados');
      }
      
      console.log('🎉 loadStudentData completado exitosamente');
    } catch (err) {
      console.error('❌ Error completo loading student data:', err);
      setError(`Error al cargar los datos del estudiante: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async () => {
    const mockCourses: Course[] = [
      { id: 1, nombre: 'Pre-Kinder A', base: 'Pre-Kinder', letra: 'A' },
      { id: 2, nombre: 'Pre-Kinder B', base: 'Pre-Kinder', letra: 'B' },
      { id: 3, nombre: 'Pre-Kinder C', base: 'Pre-Kinder', letra: 'C' },
      { id: 4, nombre: 'Pre-Kinder D', base: 'Pre-Kinder', letra: 'D' },
      { id: 5, nombre: 'Kinder A', base: 'Kinder', letra: 'A' },
      { id: 6, nombre: 'Kinder B', base: 'Kinder', letra: 'B' },
      { id: 7, nombre: 'Kinder C', base: 'Kinder', letra: 'C' },
      { id: 8, nombre: 'Kinder D', base: 'Kinder', letra: 'D' },
      { id: 9, nombre: '1° Básico A', base: '1° Básico', letra: 'A' },
      { id: 10, nombre: '1° Básico B', base: '1° Básico', letra: 'B' },
      { id: 11, nombre: '1° Básico C', base: '1° Básico', letra: 'C' },
      { id: 12, nombre: '1° Básico D', base: '1° Básico', letra: 'D' },
      { id: 13, nombre: '2° Básico A', base: '2° Básico', letra: 'A' },
      { id: 14, nombre: '2° Básico B', base: '2° Básico', letra: 'B' },
      { id: 15, nombre: '2° Básico C', base: '2° Básico', letra: 'C' },
      { id: 16, nombre: '2° Básico D', base: '2° Básico', letra: 'D' },
      { id: 17, nombre: '3° Básico A', base: '3° Básico', letra: 'A' },
      { id: 18, nombre: '3° Básico B', base: '3° Básico', letra: 'B' },
      { id: 19, nombre: '3° Básico C', base: '3° Básico', letra: 'C' },
      { id: 20, nombre: '3° Básico D', base: '3° Básico', letra: 'D' },
      { id: 21, nombre: '4° Básico A', base: '4° Básico', letra: 'A' },
      { id: 22, nombre: '4° Básico B', base: '4° Básico', letra: 'B' },
      { id: 23, nombre: '4° Básico C', base: '4° Básico', letra: 'C' },
      { id: 24, nombre: '4° Básico D', base: '4° Básico', letra: 'D' },
      { id: 25, nombre: '5° Básico A', base: '5° Básico', letra: 'A' },
      { id: 26, nombre: '5° Básico B', base: '5° Básico', letra: 'B' },
      { id: 27, nombre: '5° Básico C', base: '5° Básico', letra: 'C' },
      { id: 28, nombre: '5° Básico D', base: '5° Básico', letra: 'D' },
      { id: 29, nombre: '6° Básico A', base: '6° Básico', letra: 'A' },
      { id: 30, nombre: '6° Básico B', base: '6° Básico', letra: 'B' },
      { id: 31, nombre: '6° Básico C', base: '6° Básico', letra: 'C' },
      { id: 32, nombre: '6° Básico D', base: '6° Básico', letra: 'D' },
      { id: 33, nombre: '7° Básico A', base: '7° Básico', letra: 'A' },
      { id: 34, nombre: '7° Básico B', base: '7° Básico', letra: 'B' },
      { id: 35, nombre: '7° Básico C', base: '7° Básico', letra: 'C' },
      { id: 36, nombre: '7° Básico D', base: '7° Básico', letra: 'D' },
      { id: 37, nombre: '8° Básico A', base: '8° Básico', letra: 'A' },
      { id: 38, nombre: '8° Básico B', base: '8° Básico', letra: 'B' },
      { id: 39, nombre: '8° Básico C', base: '8° Básico', letra: 'C' },
      { id: 40, nombre: '8° Básico D', base: '8° Básico', letra: 'D' },
      { id: 41, nombre: '1° Medio A', base: '1° Medio', letra: 'A' },
      { id: 42, nombre: '1° Medio B', base: '1° Medio', letra: 'B' },
      { id: 43, nombre: '1° Medio C', base: '1° Medio', letra: 'C' },
      { id: 44, nombre: '1° Medio D', base: '1° Medio', letra: 'D' },
      { id: 45, nombre: '2° Medio A', base: '2° Medio', letra: 'A' },
      { id: 46, nombre: '2° Medio B', base: '2° Medio', letra: 'B' },
      { id: 47, nombre: '2° Medio C', base: '2° Medio', letra: 'C' },
      { id: 48, nombre: '2° Medio D', base: '2° Medio', letra: 'D' },
      { id: 49, nombre: '3° Medio A', base: '3° Medio', letra: 'A' },
      { id: 50, nombre: '3° Medio B', base: '3° Medio', letra: 'B' },
      { id: 51, nombre: '3° Medio C', base: '3° Medio', letra: 'C' },
      { id: 52, nombre: '3° Medio D', base: '3° Medio', letra: 'D' },
      { id: 53, nombre: '4° Medio A', base: '4° Medio', letra: 'A' },
      { id: 54, nombre: '4° Medio B', base: '4° Medio', letra: 'B' },
      { id: 55, nombre: '4° Medio C', base: '4° Medio', letra: 'C' },
      { id: 56, nombre: '4° Medio D', base: '4° Medio', letra: 'D' },
      { id: 57, nombre: 'OP4 - 1° Básico A', base: 'OP4 - 1° Básico', letra: 'A' },
      { id: 58, nombre: 'OP4 - 1° Básico B', base: 'OP4 - 1° Básico', letra: 'B' },
      { id: 59, nombre: 'OP4 - 1° Básico C', base: 'OP4 - 1° Básico', letra: 'C' },
      { id: 60, nombre: 'OP4 - 1° Básico D', base: 'OP4 - 1° Básico', letra: 'D' },
      { id: 61, nombre: 'OP4 - 2° Básico A', base: 'OP4 - 2° Básico', letra: 'A' },
      { id: 62, nombre: 'OP4 - 2° Básico B', base: 'OP4 - 2° Básico', letra: 'B' },
      { id: 63, nombre: 'OP4 - 2° Básico C', base: 'OP4 - 2° Básico', letra: 'C' },
      { id: 64, nombre: 'OP4 - 2° Básico D', base: 'OP4 - 2° Básico', letra: 'D' },
      { id: 65, nombre: 'OP4 - 3° Básico A', base: 'OP4 - 3° Básico', letra: 'A' },
      { id: 66, nombre: 'OP4 - 3° Básico B', base: 'OP4 - 3° Básico', letra: 'B' },
      { id: 67, nombre: 'OP4 - 3° Básico C', base: 'OP4 - 3° Básico', letra: 'C' },
      { id: 68, nombre: 'OP4 - 3° Básico D', base: 'OP4 - 3° Básico', letra: 'D' },
      { id: 69, nombre: 'OP4 - 4° Básico A', base: 'OP4 - 4° Básico', letra: 'A' },
      { id: 70, nombre: 'OP4 - 4° Básico B', base: 'OP4 - 4° Básico', letra: 'B' },
      { id: 71, nombre: 'OP4 - 4° Básico C', base: 'OP4 - 4° Básico', letra: 'C' },
      { id: 72, nombre: 'OP4 - 4° Básico D', base: 'OP4 - 4° Básico', letra: 'D' },
    ];
    setAllCourses(mockCourses);
  };

  const handleStudentChange = (field: keyof Student, value: string | boolean) => {
    if (!student) return;
    // Convertir a mayúsculas excepto campos específicos (selects y campos especiales)
    const excludeFields = ['telefono', 'telefono_fijo', 'fecha_nacimiento', 'email', 'genero', 'nacionalidad', 'etnia', 'con_quien_vive', 'region', 'comuna', 'curso', 'pie', 'beca', 'tipo_beca', 'pae'];
    const finalValue = !excludeFields.includes(field) && typeof value === 'string' ? value.toUpperCase() : value;
    setStudent({ ...student, [field]: finalValue });
  };

  const handleGuardianChange = (index: number, field: keyof Guardian, value: string | boolean) => {
    const updatedGuardians = [...guardians];
    // Convertir a mayúsculas excepto campos específicos (selects y campos especiales)
    const excludeFields = ['email', 'celular', 'telefono', 'fecha_nacimiento', 'rut', 'dv', 'dni', 'pasaporte', 'parentesco', 'genero', 'nacionalidad', 'tipo_documento'];
    const finalValue = !excludeFields.includes(field) && typeof value === 'string' ? value.toUpperCase() : value;
    updatedGuardians[index] = { ...updatedGuardians[index], [field]: finalValue };
    setGuardians(updatedGuardians);
  };

  const handleSave = async () => {
    if (!student) {
      console.error('❌ No hay datos del estudiante para guardar');
      return;
    }
    
    console.log('🚀 Iniciando guardado de datos');
    console.log('👤 Estudiante a guardar:', student);
    console.log('👥 Apoderados a guardar:', guardians);
    
    setIsSaving(true);
    setError('');
    setSuccessMessage('');
    
    try {
      console.log('📡 Enviando solicitud PUT para estudiante ID:', studentId);
      const studentResponse = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(student),
      });

      console.log('📨 Respuesta del servidor para estudiante:', studentResponse.status, studentResponse.statusText);
      
      if (!studentResponse.ok) {
        const errorText = await studentResponse.text();
        console.error('❌ Error en respuesta del estudiante:', errorText);
        throw new Error(`Error al guardar datos del estudiante: ${studentResponse.status} ${studentResponse.statusText}`);
      }

      console.log('✅ Estudiante guardado correctamente');

      for (const guardian of guardians) {
        if (guardian.id) {
          console.log('📡 Enviando solicitud PUT para apoderado ID:', guardian.id);
          const guardianResponse = await fetch(`/api/guardians/${guardian.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(guardian),
          });

          console.log('📨 Respuesta del servidor para apoderado:', guardianResponse.status, guardianResponse.statusText);

          if (!guardianResponse.ok) {
            const errorText = await guardianResponse.text();
            console.error('❌ Error en respuesta del apoderado:', errorText);
            throw new Error(`Error al guardar datos del apoderado: ${guardianResponse.status} ${guardianResponse.statusText}`);
          }

          console.log('✅ Apoderado guardado correctamente');
        }
      }

      console.log('🎉 Todos los datos guardados exitosamente');
      setSuccessMessage('✅ Datos actualizados correctamente');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('❌ Error completo al guardar:', err);
      setError(`Error al guardar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const uniqueCourseBases = [...new Set(allCourses.map(c => c.base))];
  const availableLetters = allCourses
    .filter(c => c.base === student?.curso_base)
    .map(c => c.letra);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div 
        className="w-full max-w-4xl max-h-screen overflow-hidden"
        style={{ 
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-large)',
          boxShadow: 'var(--shadow-large)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="ios-title-large">Editar Estudiante</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveSection('student')}
            className="flex items-center gap-2 px-6 py-4"
            style={{ 
              backgroundColor: activeSection === 'student' ? 'var(--color-primary-light)' : 'transparent',
              color: activeSection === 'student' ? 'var(--color-primary)' : 'var(--color-text)',
              borderBottom: activeSection === 'student' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <User size={20} />
            Datos del Estudiante
          </button>
          <button
            onClick={() => setActiveSection('guardians')}
            className="flex items-center gap-2 px-6 py-4"
            style={{ 
              backgroundColor: activeSection === 'guardians' ? 'var(--color-primary-light)' : 'transparent',
              color: activeSection === 'guardians' ? 'var(--color-primary)' : 'var(--color-text)',
              borderBottom: activeSection === 'guardians' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <Users size={20} />
            Apoderados
          </button>
          <button
            onClick={() => setActiveSection('academic')}
            className="flex items-center gap-2 px-6 py-4"
            style={{
              backgroundColor: activeSection === 'academic' ? 'var(--color-primary-light)' : 'transparent',
              color: activeSection === 'academic' ? 'var(--color-primary)' : 'var(--color-text)',
              borderBottom: activeSection === 'academic' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <BookOpen size={20} />
            Información Académica
          </button>
          <button
            onClick={() => setActiveSection('nee')}
            className="flex items-center gap-2 px-6 py-4"
            style={{
              backgroundColor: activeSection === 'nee' ? 'var(--color-primary-light)' : 'transparent',
              color: activeSection === 'nee' ? 'var(--color-primary)' : 'var(--color-text)',
              borderBottom: activeSection === 'nee' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <Heart size={20} />
            NEE
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Cargando datos...</span>
            </div>
          ) : student ? (
            <>
              {/* Student Section */}
              {activeSection === 'student' && (
                <div className="space-y-6">
                  <h3 className="ios-subtitle text-center mb-6">Información Personal del Estudiante</h3>
                  
                  {/* Datos básicos */}
                  <div className="ios-card p-6">
                    <h4 className="ios-body font-semibold mb-4" style={{color: 'var(--color-primary)'}}>Datos de Identificación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="ios-form-label">RUT <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input
                          type="text"
                          value={`${student.rut}-${student.dv}`}
                          className="ios-form-input bg-gray-100"
                          disabled
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Nombres <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input
                          type="text"
                          value={student.nombres}
                          onChange={(e) => handleStudentChange('nombres', e.target.value)}
                          className="ios-form-input"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Nombre Social</label>
                        <input
                          type="text"
                          value={student.nombre_social || ''}
                          onChange={(e) => handleStudentChange('nombre_social', e.target.value)}
                          className="ios-form-input"
                          placeholder="Solo si usa un nombre diferente"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Apellido Paterno <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input
                          type="text"
                          value={student.apellido_paterno}
                          onChange={(e) => handleStudentChange('apellido_paterno', e.target.value)}
                          className="ios-form-input"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Apellido Materno</label>
                        <input
                          type="text"
                          value={student.apellido_materno || ''}
                          onChange={(e) => handleStudentChange('apellido_materno', e.target.value)}
                          className="ios-form-input"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Fecha de Nacimiento <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input
                          type="date"
                          lang="es"
                          value={student.fecha_nacimiento}
                          onChange={(e) => handleStudentChange('fecha_nacimiento', e.target.value)}
                          className="ios-form-input"
                        />
                        {student.fecha_nacimiento && (() => { const [y,m,d] = student.fecha_nacimiento.split('-'); return d&&m&&y ? <p className="ios-caption mt-1" style={{color:'var(--color-text-light)'}}>📅 {d}-{m}-{y}</p> : null; })()}
                      </div>
                      <div>
                        <label className="ios-form-label">Género <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <select
                          value={student.genero}
                          onChange={(e) => handleStudentChange('genero', e.target.value)}
                          className="ios-form-input"
                        >
                          <option value="">Seleccione...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <label className="ios-form-label">Nacionalidad</label>
                        <select
                          value={student.nacionalidad || ''}
                          onChange={(e) => handleStudentChange('nacionalidad', e.target.value)}
                          className="ios-form-input"
                        >
                          <option value="">Seleccione...</option>
                          {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="ios-form-label">Etnia</label>
                        <select
                          value={student.etnia || ''}
                          onChange={(e) => handleStudentChange('etnia', e.target.value)}
                          className="ios-form-input"
                        >
                          <option value="">Seleccione...</option>
                          <option value="No pertenece">No pertenece</option>
                          <option value="Mapuche">Mapuche</option>
                          <option value="Aymará">Aymará</option>
                          <option value="Quechua">Quechua</option>
                          <option value="Atacameña">Atacameña</option>
                          <option value="Colla">Colla</option>
                          <option value="Kawésqar">Kawésqar</option>
                          <option value="Yagán">Yagán</option>
                          <option value="Diaguita">Diaguita</option>
                        </select>
                      </div>
                      <div>
                        <label className="ios-form-label">Con quién vive</label>
                        <select
                          value={student.con_quien_vive || ''}
                          onChange={(e) => handleStudentChange('con_quien_vive', e.target.value)}
                          className="ios-form-input"
                        >
                          <option value="">Seleccione...</option>
                          <option value="Ambos padres">Ambos padres</option>
                          <option value="Solo madre">Solo madre</option>
                          <option value="Solo padre">Solo padre</option>
                          <option value="Abuelos">Abuelos</option>
                          <option value="Otros familiares">Otros familiares</option>
                          <option value="Hogar de menores">Hogar de menores</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Datos de contacto */}
                  <div className="ios-card p-6">
                    <h4 className="ios-body font-semibold mb-4" style={{color: 'var(--color-primary)'}}>Información de Contacto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="ios-form-label">Teléfono Móvil</label>
                        <input
                          type="tel"
                          value={student.telefono || ''}
                          onChange={(e) => handleStudentChange('telefono', e.target.value)}
                          className="ios-form-input"
                          placeholder="Ej: +56912345678"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Teléfono Fijo</label>
                        <input
                          type="tel"
                          value={student.telefono_fijo || ''}
                          onChange={(e) => handleStudentChange('telefono_fijo', e.target.value)}
                          className="ios-form-input"
                          placeholder="Ej: +562512345"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="ios-form-label">Dirección</label>
                        <input
                          type="text"
                          value={student.direccion || ''}
                          onChange={(e) => handleStudentChange('direccion', e.target.value)}
                          className="ios-form-input"
                          placeholder="Dirección completa"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Complemento Dirección</label>
                        <input
                          type="text"
                          value={student.complemento_direccion || ''}
                          onChange={(e) => handleStudentChange('complemento_direccion', e.target.value)}
                          className="ios-form-input"
                          placeholder="Depto, casa, etc."
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Comuna</label>
                        <input
                          type="text"
                          value={student.comuna || ''}
                          onChange={(e) => handleStudentChange('comuna', e.target.value)}
                          className="ios-form-input"
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Región</label>
                        <input
                          type="text"
                          value={student.region || ''}
                          onChange={(e) => handleStudentChange('region', e.target.value)}
                          className="ios-form-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Programas y beneficios */}
                  <div className="ios-card p-6">
                    <h4 className="ios-body font-semibold mb-4" style={{color: 'var(--color-primary)'}}>Programas y Beneficios</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="ios-form-label">PIE (Programa de Integración Escolar)</label>
                        <select
                          value={student.pie ? 'true' : 'false'}
                          onChange={(e) => handleStudentChange('pie', e.target.value === 'true')}
                          className="ios-form-input"
                        >
                          <option value="false">No</option>
                          <option value="true">Sí</option>
                        </select>
                      </div>
                      <div>
                        <label className="ios-form-label">Beca</label>
                        <select
                          value={student.beca ? 'true' : 'false'}
                          onChange={(e) => handleStudentChange('beca', e.target.value === 'true')}
                          className="ios-form-input"
                        >
                          <option value="false">No</option>
                          <option value="true">Sí</option>
                        </select>
                      </div>
                      {student.beca && (
                        <div>
                          <label className="ios-form-label">Tipo de Beca</label>
                          <input
                            type="text"
                            value={student.tipo_beca || ''}
                            onChange={(e) => handleStudentChange('tipo_beca', e.target.value)}
                            className="ios-form-input"
                            placeholder="Especificar tipo de beca"
                          />
                        </div>
                      )}
                      <div>
                        <label className="ios-form-label">PAE (Programa de Alimentación Escolar)</label>
                        <select
                          value={student.pae ? 'true' : 'false'}
                          onChange={(e) => handleStudentChange('pae', e.target.value === 'true')}
                          className="ios-form-input"
                        >
                          <option value="false">No</option>
                          <option value="true">Sí</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="ios-card p-6">
                    <h4 className="ios-body font-semibold mb-4" style={{color: 'var(--color-primary)'}}>Observaciones</h4>
                    <div>
                      <label className="ios-form-label">Observaciones adicionales</label>
                      <textarea
                        value={student.observaciones || ''}
                        onChange={(e) => handleStudentChange('observaciones', e.target.value)}
                        className="ios-form-input"
                        rows={4}
                        placeholder="Información adicional relevante sobre el estudiante..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Guardians Section */}
              {activeSection === 'guardians' && (
                <div className="space-y-6">
                  <h3 className="ios-subtitle text-center mb-6">Información de Apoderados</h3>
                  {guardians.length === 0 ? (
                    <div className="ios-card p-8 text-center">
                      <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
                        No hay apoderados registrados para este estudiante.
                      </p>
                    </div>
                  ) : (
                    guardians.map((guardian, index) => (
                      <div key={guardian.id || index} className="ios-card p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="ios-subtitle">
                            {guardian.es_principal ? '👑 Apoderado Principal' : '👥 Apoderado Suplente'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            guardian.es_principal 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {guardian.parentesco}
                          </span>
                        </div>

                        {/* Datos de identificación */}
                        <div className="ios-card p-4 mb-4" style={{backgroundColor: 'var(--color-card-elevated)'}}>
                          <h4 className="ios-body font-semibold mb-3" style={{color: 'var(--color-primary)'}}>Identificación</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="ios-form-label">Tipo de Documento</label>
                              <select
                                value={guardian.tipo_documento}
                                onChange={(e) => handleGuardianChange(index, 'tipo_documento', e.target.value)}
                                className="ios-form-input"
                              >
                                <option value="RUT">RUT</option>
                                <option value="DNI">DNI</option>
                                <option value="Pasaporte">Pasaporte</option>
                              </select>
                            </div>
                            <div>
                              <label className="ios-form-label">
                                {guardian.tipo_documento === 'RUT' ? 'RUT' : 
                                 guardian.tipo_documento === 'DNI' ? 'DNI' : 'Pasaporte'}
                              </label>
                              {guardian.tipo_documento === 'RUT' && guardian.rut && guardian.dv ? (
                                <input
                                  type="text"
                                  value={`${guardian.rut}-${guardian.dv}`}
                                  className="ios-form-input bg-gray-100"
                                  disabled
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={guardian.dni || guardian.pasaporte || ''}
                                  onChange={(e) => {
                                    if (guardian.tipo_documento === 'DNI') {
                                      handleGuardianChange(index, 'dni', e.target.value);
                                    } else {
                                      handleGuardianChange(index, 'pasaporte', e.target.value);
                                    }
                                  }}
                                  className="ios-form-input"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Datos personales */}
                        <div className="ios-card p-4 mb-4" style={{backgroundColor: 'var(--color-card-elevated)'}}>
                          <h4 className="ios-body font-semibold mb-3" style={{color: 'var(--color-primary)'}}>Datos Personales</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="ios-form-label">Nombres</label>
                              <input
                                type="text"
                                value={guardian.nombre}
                                onChange={(e) => handleGuardianChange(index, 'nombre', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Apellido Paterno</label>
                              <input
                                type="text"
                                value={guardian.apellido_paterno}
                                onChange={(e) => handleGuardianChange(index, 'apellido_paterno', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Apellido Materno</label>
                              <input
                                type="text"
                                value={guardian.apellido_materno || ''}
                                onChange={(e) => handleGuardianChange(index, 'apellido_materno', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Fecha de Nacimiento</label>
                              <input
                                type="date"
                                lang="es"
                                value={guardian.fecha_nacimiento}
                                onChange={(e) => handleGuardianChange(index, 'fecha_nacimiento', e.target.value)}
                                className="ios-form-input"
                              />
                              {guardian.fecha_nacimiento && (() => { const [y,m,d] = guardian.fecha_nacimiento.split('-'); return d&&m&&y ? <p className="ios-caption mt-1" style={{color:'var(--color-text-light)'}}>📅 {d}-{m}-{y}</p> : null; })()}
                            </div>
                            <div>
                              <label className="ios-form-label">Género</label>
                              <select
                                value={guardian.genero}
                                onChange={(e) => handleGuardianChange(index, 'genero', e.target.value)}
                                className="ios-form-input"
                              >
                                <option value="">Seleccione...</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                              </select>
                            </div>
                            <div>
                              <label className="ios-form-label">Nacionalidad</label>
                              <input
                                type="text"
                                value={guardian.nacionalidad}
                                onChange={(e) => handleGuardianChange(index, 'nacionalidad', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Datos de contacto */}
                        <div className="ios-card p-4 mb-4" style={{backgroundColor: 'var(--color-card-elevated)'}}>
                          <h4 className="ios-body font-semibold mb-3" style={{color: 'var(--color-primary)'}}>Contacto</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="ios-form-label">Teléfono Celular</label>
                              <input
                                type="tel"
                                value={guardian.celular}
                                onChange={(e) => handleGuardianChange(index, 'celular', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Email</label>
                              <input
                                type="email"
                                value={guardian.email || ''}
                                onChange={(e) => handleGuardianChange(index, 'email', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="ios-form-label">Dirección</label>
                              <input
                                type="text"
                                value={guardian.direccion}
                                onChange={(e) => handleGuardianChange(index, 'direccion', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Complemento Dirección</label>
                              <input
                                type="text"
                                value={guardian.complemento_direccion || ''}
                                onChange={(e) => handleGuardianChange(index, 'complemento_direccion', e.target.value)}
                                className="ios-form-input"
                                placeholder="Depto, casa, etc."
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Comuna</label>
                              <input
                                type="text"
                                value={guardian.comuna}
                                onChange={(e) => handleGuardianChange(index, 'comuna', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                            <div>
                              <label className="ios-form-label">Región</label>
                              <input
                                type="text"
                                value={guardian.region}
                                onChange={(e) => handleGuardianChange(index, 'region', e.target.value)}
                                className="ios-form-input"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Academic Section */}
              {activeSection === 'academic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="ios-form-label">Religión</label>
                      <select
                        value={student.tipo_religion || ''}
                        onChange={(e) => handleStudentChange('tipo_religion', e.target.value)}
                        className="ios-form-input"
                      >
                        <option value="">Seleccione...</option>
                        <option value="Católica">Católica</option>
                        <option value="Evangélica">Evangélica</option>
                        <option value="Ninguna">Ninguna</option>
                      </select>
                    </div>
                    <div>
                      <label className="ios-form-label">Curso Base</label>
                      <select
                        value={student.curso_base || ''}
                        onChange={(e) => handleStudentChange('curso_base', e.target.value)}
                        className="ios-form-input"
                      >
                        <option value="">Seleccione...</option>
                        {uniqueCourseBases.map(base => (
                          <option key={base} value={base}>{base}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="ios-form-label">Letra</label>
                      <select
                        value={student.letra || ''}
                        onChange={(e) => handleStudentChange('letra', e.target.value)}
                        className="ios-form-input"
                        disabled={!student.curso_base}
                      >
                        <option value="">Seleccione...</option>
                        {availableLetters.map(letra => (
                          <option key={letra} value={letra}>{letra}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="ios-form-label">Estado</label>
                      <div className="ios-card p-3" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
                        <span className="font-semibold">✅ {student.estado}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEE Section */}
              {activeSection === 'nee' && (
                <div className="space-y-6">
                  <NEEForm
                    selectedNees={(student.nees as number[]) || []}
                    onNeeChange={(ids) => handleStudentChange('nees' as keyof Student, ids as any)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <AlertCircle className="text-red-500 mr-2" size={24} />
              <span>Error al cargar los datos del estudiante</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex-1">
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            {successMessage && (
              <div className="text-green-600 text-sm">{successMessage}</div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="ios-btn ios-btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !student}
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
      </div>
    </div>
  );
};

export default EditStudentModal;