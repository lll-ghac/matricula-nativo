import React, { useState, useEffect, useRef } from 'react';
import StudentDataForm from './StudentDataForm';
import DualGuardianForm from './DualGuardianForm';
import AcademicInfoForm from './AcademicInfoForm';
import ProgramsAndBenefitsForm from './ProgramsAndBenefitsForm';
import NEEForm from './NEEForm';
import ObservationsForm from './ObservationsForm';
import AutorizacionImagenForm, { AUTORIZACIONES_IMAGEN } from './AutorizacionImagenForm';
import PDFReceipt from './PDFReceipt';
import type { StudentData, ApoderadoData } from '../types';
import { useToast } from '../context/ToastContext';

interface StudentFormProps {
  student?: Partial<StudentData>;
  editStudentId?: string | number;
  userRole: 'profesor' | 'inspector' | 'administrador';
  userId?: number;
  onBackToStudentSearch?: () => void;
  onBackToHome?: () => void;
  currentYear: number;
  onStudentSaved?: () => void;
  isProfesorJefe?: boolean;
  cursoAsignado?: { curso_id: number; curso_nombre: string };
}

const StudentForm: React.FC<StudentFormProps> = ({
  student: initialStudentData,
  userRole,
  userId,
  onBackToStudentSearch,
  currentYear,
  onStudentSaved,
  isProfesorJefe = false,
  cursoAsignado = null
}) => {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedStudentData, setSavedStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  // true en matrícula nueva o rematrícula: hay que preguntar y registrar la autorización de imagen.
  const [requiereAutorizacion, setRequiereAutorizacion] = useState(true);
  // Protección contra clics que "caen" en otro botón al cambiar de paso: el botón "Siguiente"
  // del paso 6 y "Guardar Matrícula" del paso 7 quedan en la misma zona de la pantalla, y un
  // doble clic guardaba la matrícula sin pasar por Observaciones (reportado 2026-11-17).
  const formTopRef = useRef<HTMLDivElement>(null);
  const pasoMostradoEn = useRef<number>(Date.now());
  const ESPERA_ANTES_DE_GUARDAR_MS = 1000;

  useEffect(() => {
    pasoMostradoEn.current = Date.now();
    formTopRef.current?.scrollIntoView({ block: 'start' });
  }, [currentStep]);

  const [studentData, setStudentData] = useState<Partial<StudentData>>({});

  useEffect(() => {
    const initialData = {
      ...(initialStudentData || {}),
      estado: initialStudentData?.estado || 'matriculado',
    };

    // Precarga desde un año anterior: es una matrícula NUEVA para el año vigente. Se quita el id
    // (si no, el formulario haría PUT sobre la fila del año pasado) y los datos propios de esa
    // fila, incluido el curso, que es por año académico.
    const anioPrecarga = (initialData as any).anio_matricula;
    const esPrecargaAnioAnterior = !!initialData.id && anioPrecarga != null
      && Number(anioPrecarga) !== Number(currentYear);
    if (esPrecargaAnioAnterior) {
      ['id', 'anio_matricula', 'fecha_creacion', 'fecha_modificacion', 'creado_en', 'creado_por', 'modificado_por',
        'eliminado', 'motivo_eliminacion', 'fecha_retiro', 'observacion_retiro', 'curso_id', 'curso_base', 'letra']
        .forEach(campo => { delete (initialData as any)[campo]; });
      initialData.estado = 'matriculado';
    }

    // Matrícula nueva o rematrícula de un eliminado: la autorización de imagen se renueva cada año,
    // así que parte sin responder para obligar a preguntarle al apoderado.
    const esRetirado = String(initialData.estado || '').toLowerCase() === 'retirado';
    const esMatricula = !initialData.id || (initialData as any).eliminado === true || esRetirado;
    if (esMatricula) {
      AUTORIZACIONES_IMAGEN.forEach(({ campo }) => { (initialData as any)[campo] = null; });
      // Rematrícula (eliminado o retirado): vuelve a quedar matriculado.
      initialData.estado = 'matriculado';
    }
    setRequiereAutorizacion(esMatricula);

    if (!initialData.apoderados || initialData.apoderados.length < 2) {
      const apoderados = initialData.apoderados || [];
      if (apoderados.length === 0) {
        apoderados.push({ es_principal: true } as ApoderadoData);
        apoderados.push({ es_principal: false } as ApoderadoData);
      } else if (apoderados.length === 1) {
        apoderados[0].es_principal = true;
        apoderados.push({ es_principal: false } as ApoderadoData);
      }
      initialData.apoderados = apoderados;
    }

    // Cargar datos de persona asociada desde el apoderado principal (si existe)
    if (initialData.apoderados && initialData.apoderados.length > 0) {
      const apoderadoPrincipal = initialData.apoderados.find(
        g => g.es_principal || g.tipo_relacion === 'principal'
      );

      if (apoderadoPrincipal) {
        // Copiar datos desde el apoderado principal a los campos temporales del estudiante
        initialData.nivel_educacional_asociado = apoderadoPrincipal.nivel_educacional;
        initialData.situacion_laboral_asociado = apoderadoPrincipal.situacion_laboral;
        initialData.trabaja_principalmente_asociado = apoderadoPrincipal.lugar_trabajo;
      }
    }

    if (isProfesorJefe && cursoAsignado) {
      (initialData as any).curso_id = cursoAsignado.curso_id;
      const nameParts = cursoAsignado.curso_nombre.split(' ');
      initialData.letra = nameParts.pop();
      initialData.curso_base = nameParts.join(' ');
    }
    setStudentData(initialData);
  }, [initialStudentData, isProfesorJefe, cursoAsignado, currentYear]);

  const handleStudentChange = (field: keyof StudentData, value: any) => {
    if (field === 'nees') {
      console.log('🟢 [StudentForm] handleStudentChange - NEE actualizado:', value);
      console.log('🟢 [StudentForm] Es array?', Array.isArray(value));
    }
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const updateGuardian = (guardianData: ApoderadoData, isPrincipal: boolean) => {
    setStudentData(prev => {
      const newApoderados = [...(prev.apoderados || [])];
      const index = newApoderados.findIndex(g => g.es_principal === isPrincipal);
      if (index !== -1) {
        newApoderados[index] = guardianData;
      } else {
        // This case should ideally not happen with the new structure
        newApoderados.push(guardianData);
      }
      return { ...prev, apoderados: newApoderados };
    });
  };

  const handleSearchGuardian = async (index: number, rut?: string): Promise<{ found: boolean; message: string; rut?: string } | undefined> => {
    if (!rut) {
      return { found: false, message: 'Por favor, ingrese el RUT del apoderado.' };
    }

    try {
      const response = await fetch(`/api/guardians/check/${rut}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 404) {
        return { found: false, message: `⚠️ Apoderado con RUT ${rut} no encontrado. Complete los datos manualmente.` };
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al buscar apoderado.');
      }

      const data = await response.json();

      const newApoderados = [...(studentData.apoderados || [])];
      const currentApoderado = newApoderados[index] || {};

      newApoderados[index] = {
        ...currentApoderado,
        ...data,
        parentesco: currentApoderado.parentesco || '',
        es_principal: currentApoderado.es_principal ?? (index === 0)
      };

      setStudentData(prev => ({ ...prev, apoderados: newApoderados }));

      return {
        found: true,
        message: `✅ Apoderado ${data.nombre} ${data.apellido_paterno} encontrado. Datos cargados correctamente.`,
        rut: rut
      };

    } catch (err: any) {
      console.error('Error en la búsqueda del apoderado:', err);
      return { found: false, message: `❌ Error: ${err.message}` };
    }
  };

  const handleSaveStudent = async () => {
    if (Date.now() - pasoMostradoEn.current < ESPERA_ANTES_DE_GUARDAR_MS) {
      console.warn('[StudentForm] Clic en Guardar ignorado: llegó justo al cambiar de paso.');
      return;
    }
    const autorizacionesPendientes = getMissingFieldsByStep(6);
    if (autorizacionesPendientes.length > 0) {
      toast.error('Falta registrar la autorización de uso de imagen (paso 6).');
      setCurrentStep(6);
      return;
    }
    setLoading(true);
    try {
      // Transferir datos de persona asociada al apoderado principal
      const dataToSend = { ...studentData, anio_matricula: currentYear };

      if (dataToSend.apoderados && dataToSend.apoderados.length > 0) {
        // Encontrar el apoderado principal
        const principalIndex = dataToSend.apoderados.findIndex(
          g => g.es_principal || g.tipo_relacion === 'principal'
        );

        if (principalIndex >= 0) {
          // Copiar los campos de persona asociada al apoderado principal
          dataToSend.apoderados[principalIndex] = {
            ...dataToSend.apoderados[principalIndex],
            nivel_educacional: dataToSend.nivel_educacional_asociado,
            situacion_laboral: dataToSend.situacion_laboral_asociado,
            lugar_trabajo: dataToSend.trabaja_principalmente_asociado
          };
        }
      }

      const url = studentData.id ? `/api/students/${studentData.id}` : '/api/students';
      const method = studentData.id ? 'PUT' : 'POST';

      console.log('🟢 [StudentForm] Guardando estudiante');
      console.log('🟢 [StudentForm] Campo nees en dataToSend:', dataToSend.nees);
      console.log('🟢 [StudentForm] Es array?', Array.isArray(dataToSend.nees));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar la matrícula');
      }

      if (onStudentSaved) onStudentSaved();
      setSavedStudentData(result.data);
      setShowReceipt(true);

    } catch (error: any) {
      console.error('❌ Error en handleSaveStudent:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 6 && getMissingFieldsByStep(6).length > 0) {
      setValidationError('Debe registrar las 3 respuestas de autorización de uso de imagen (sí o no) antes de continuar.');
      return;
    }
    if (currentStep === 1) {
      // Validation logic can be added here
    }
    setValidationError('');
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setValidationError('');
    setCurrentStep(prev => prev - 1);
  };

  // Helper para validar campos vacíos (incluye null/undefined y strings con espacios)
  const isEmpty = (value: any) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  };

  // Función para validar campos obligatorios por paso y retornar nombres amigables
  const getMissingFieldsByStep = (step: number): string[] => {
    const missing: string[] = [];

    if (step === 1) {
      // Paso 1: Datos del Estudiante
      if (!studentData.rut) missing.push('RUT');
      if (!studentData.dv) missing.push('DV');
      if (!studentData.nombres) missing.push('Nombres');
      if (!studentData.apellido_paterno) missing.push('Apellido Paterno');
      if (!studentData.apellido_materno) missing.push('Apellido Materno');
      if (!studentData.fecha_nacimiento) missing.push('Fecha de Nacimiento');
      if (!studentData.genero) missing.push('Género');
      if (!studentData.nacionalidad) missing.push('Nacionalidad');
      if (!studentData.etnia) missing.push('Etnia');
      if (!studentData.direccion) missing.push('Dirección');
      if (!studentData.telefono) missing.push('Teléfono Móvil');
      if (!studentData.con_quien_vive) missing.push('Con Quién Vive');
      if (!studentData.prevision_salud_id) missing.push('Previsión de Salud');

      // Nuevas preguntas obligatorias sobre persona asociada
      if (!studentData.nivel_educacional_asociado) missing.push('Nivel Educacional de la Persona Asociada');
      if (!studentData.situacion_laboral_asociado) missing.push('Situación Laboral de la Persona Asociada');
      // Pregunta 5 es condicional (solo si trabaja), no es obligatoria
    } else if (step === 2) {
      // Paso 2: Apoderados
      const principal = studentData.apoderados?.find(
        g => g.es_principal || g.tipo_relacion === 'principal'
      );
      if (!principal) {
        missing.push('Apoderado Principal (todos los datos)');
      } else {
        if (isEmpty(principal.rut)) missing.push('RUT del Apoderado Principal');
        if (isEmpty(principal.dv)) missing.push('DV del Apoderado Principal');
        if (isEmpty(principal.nombre)) missing.push('Nombres del Apoderado Principal');
        if (isEmpty(principal.apellido_paterno)) missing.push('Apellido Paterno del Apoderado Principal');
        if (isEmpty(principal.apellido_materno)) missing.push('Apellido Materno del Apoderado Principal');
        if (isEmpty(principal.parentesco)) missing.push('Parentesco del Apoderado Principal');
        if (isEmpty(principal.fecha_nacimiento)) missing.push('Fecha de Nacimiento del Apoderado Principal');
        if (isEmpty(principal.genero)) missing.push('Género del Apoderado Principal');
        if (isEmpty(principal.nacionalidad)) missing.push('Nacionalidad del Apoderado Principal');
        if (isEmpty(principal.celular)) missing.push('Celular del Apoderado Principal');
        if (isEmpty(principal.direccion)) missing.push('Dirección del Apoderado Principal');
      }
    } else if (step === 3) {
      // Paso 3: Información Académica
      if (!studentData.tipo_religion) missing.push('Religión');
      if (!studentData.curso_id && (!studentData.curso_base || !studentData.letra)) {
        missing.push('Curso');
      }
    } else if (step === 6 && requiereAutorizacion) {
      // Paso 6: Autorización de uso de imagen (obligatoria en matrícula/rematrícula)
      AUTORIZACIONES_IMAGEN.forEach(({ campo, letra, titulo }) => {
        if (studentData[campo] !== true && studentData[campo] !== false) {
          missing.push(`Autorización ${letra}: ${titulo}`);
        }
      });
    }
    // Pasos 4, 5 y 7 no tienen campos obligatorios
    return missing;
  };

  if (showReceipt && savedStudentData) {
    return <PDFReceipt student={savedStudentData} onBackToHome={onBackToStudentSearch ?? (() => {})} />;
  }

  const principalGuardian = studentData.apoderados?.find(g => g.es_principal) || { es_principal: true } as ApoderadoData;
  const suplenteGuardian = studentData.apoderados?.find(g => !g.es_principal) || { es_principal: false } as ApoderadoData;

  const principalIndex = studentData.apoderados?.findIndex(g => g.es_principal) ?? 0;
  const suplenteIndex = studentData.apoderados?.findIndex(g => !g.es_principal) ?? 1;

  // Obtener campos faltantes del paso actual
  const missingFields = getMissingFieldsByStep(currentStep);

  // Convertir array de campos faltantes a objeto para resaltar campos
  const missingFieldsMap: {[key: string]: boolean} = {};
  if (currentStep === 1) {
    if (!studentData.rut) missingFieldsMap['rut'] = true;
    if (!studentData.dv) missingFieldsMap['dv'] = true;
    if (!studentData.nombres) missingFieldsMap['nombres'] = true;
    if (!studentData.apellido_paterno) missingFieldsMap['apellido_paterno'] = true;
    if (!studentData.apellido_materno) missingFieldsMap['apellido_materno'] = true;
    if (!studentData.fecha_nacimiento) missingFieldsMap['fecha_nacimiento'] = true;
    if (!studentData.genero) missingFieldsMap['genero'] = true;
    if (!studentData.nacionalidad) missingFieldsMap['nacionalidad'] = true;
    if (!studentData.etnia) missingFieldsMap['etnia'] = true;
    if (!studentData.direccion) missingFieldsMap['direccion'] = true;
    if (!studentData.telefono) missingFieldsMap['telefono'] = true;
    if (!studentData.con_quien_vive) missingFieldsMap['con_quien_vive'] = true;
    if (!studentData.prevision_salud_id) missingFieldsMap['prevision_salud_id'] = true;
    if (!studentData.nivel_educacional_asociado) missingFieldsMap['nivel_educacional_asociado'] = true;
    if (!studentData.situacion_laboral_asociado) missingFieldsMap['situacion_laboral_asociado'] = true;
  }

  return (
    <div ref={formTopRef} className="max-w-5xl mx-auto p-6 ios-card mt-6" style={{ scrollMarginTop: '1rem' }}>
      <div className="text-center mb-6">
        <h2 className="ios-title-large">Formulario de Matrícula - Paso {currentStep} de 7</h2>
      </div>

      {validationError && (
        <div style={{ backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', color: '#c33', fontSize: '0.95rem' }}>
          {validationError}
        </div>
      )}

      {currentStep === 1 && <StudentDataForm student={studentData} onStudentChange={handleStudentChange} isEditing={!!studentData.id} missingFields={missingFieldsMap} />}
      {currentStep === 2 && (
        <DualGuardianForm
          principalGuardian={principalGuardian}
          suplenteGuardian={suplenteGuardian}
          onPrincipalChange={(g) => updateGuardian(g, true)}
          onSuplenteChange={(g) => updateGuardian(g, false)}
          onSearchPrincipal={(rut) => handleSearchGuardian(principalIndex, rut)}
          onSearchSuplente={(rut) => handleSearchGuardian(suplenteIndex, rut)}
        />
      )}
      {currentStep === 3 && <AcademicInfoForm academicInfo={studentData} onAcademicInfoChange={handleStudentChange} userRole={userRole} userId={userId} />}
      {currentStep === 4 && <ProgramsAndBenefitsForm programsInfo={studentData} onProgramsInfoChange={handleStudentChange} />}
      {currentStep === 5 && (
        <NEEForm
          selectedNees={(() => {
            const selected = Array.isArray(studentData.nees)
              ? studentData.nees.map((nee: any) => typeof nee === 'number' ? nee : nee.id)
              : [];
            console.log('🟢 [StudentForm] Paso 5 - NEEs seleccionadas para NEEForm:', selected);
            console.log('🟢 [StudentForm] studentData.nees original:', studentData.nees);
            return selected;
          })()}
          onNeeChange={(nees) => {
            console.log('🟢 [StudentForm] NEEForm onChange - Nuevas NEEs:', nees);
            handleStudentChange('nees', nees);
          }}
        />
      )}
      {currentStep === 6 && (
        <AutorizacionImagenForm
          data={studentData}
          onChange={(campo, valor) => { setValidationError(''); handleStudentChange(campo, valor); }}
          currentYear={currentYear}
          obligatorio={requiereAutorizacion}
        />
      )}
      {currentStep === 7 && <ObservationsForm observations={studentData} onObservationsChange={handleStudentChange} onSaveStudent={handleSaveStudent} loading={loading} />}

      {/* Indicador visual de campos faltantes */}
      {missingFields.length > 0 && (
        <div className="mt-8 p-4 rounded-lg" style={{
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="flex items-start gap-3">
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2" style={{ color: '#856404', fontSize: '1rem' }}>
                Campos obligatorios pendientes ({missingFields.length})
              </h4>
              <p className="text-sm mb-3" style={{ color: '#856404' }}>
                Complete los siguientes campos antes de guardar la matrícula:
              </p>
              <ul className="space-y-1">
                {missingFields.map((field, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm" style={{ color: '#856404' }}>
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>•</span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
              {currentStep < 7 && (
                <p className="text-xs mt-3 italic" style={{ color: '#856404' }}>
                  Puede continuar al siguiente paso, pero recuerde completar estos campos antes del paso final.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de paso completo */}
      {missingFields.length === 0 && (currentStep <= 3 || (currentStep === 6 && requiereAutorizacion)) && (
        <div className="mt-8 p-4 rounded-lg" style={{
          backgroundColor: '#d4edda',
          border: '2px solid #28a745',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: '1.5rem' }}>✅</div>
            <div>
              <h4 className="font-semibold" style={{ color: '#155724', fontSize: '1rem' }}>
                Paso {currentStep} completado
              </h4>
              <p className="text-sm" style={{ color: '#155724' }}>
                Todos los campos obligatorios han sido completados. Puede continuar al siguiente paso.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-between">
        {currentStep > 1 && <button type="button" onClick={prevStep} className="ios-btn ios-btn-secondary">Atrás</button>}
        {currentStep < 7 && <button type="button" onClick={nextStep} className="ios-btn ios-btn-primary ml-auto">Siguiente</button>}
      </div>
    </div>
  );
};

export default StudentForm;
