import React, { useState, useEffect } from 'react';
import StudentDataForm from './StudentDataForm';
import AcademicInfoForm from './AcademicInfoForm';
import ProgramsAndBenefitsForm from './ProgramsAndBenefitsForm';
import NEEForm from './NEEForm';
import Accordion from './Accordion';
import { nacionalidades, parentescoOptions } from '../utils/chilean-data';
import { convertToISO, convertFromISO } from '../utils/dateUtils';
import { calculateDV } from '../utils/rutUtils';
import type { StudentData, ApoderadoData } from '../types';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface MatriculaV2FormProps {
  userRole?: 'Profesor' | 'Inspector' | 'Administrador';
  currentYear: number;
  onBackToHome?: () => void;
}

const MatriculaV2Form: React.FC<MatriculaV2FormProps> = ({
  userRole = 'Administrador',
  currentYear: _currentYear,
  onBackToHome
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [_assignedCourses, setAssignedCourses] = useState<any[]>([]);
  const [missingFields, setMissingFields] = useState<{[key: string]: boolean}>({});

  // Estado unificado con apoderados separados
  const [studentData, setStudentData] = useState<StudentData>({
    estado: 'matriculado',
    apoderados: [
      { // Apoderado Principal
        tipo_documento: 'RUT',
        rut: '', dv: '', dni: '', pasaporte: '',
        nombre: '', apellido_paterno: '', apellido_materno: '',
        parentesco: '', fecha_nacimiento: '', genero: '',
        nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
        celular: '', email: '',
        es_principal: true
      },
      { // Apoderado Suplente
        tipo_documento: 'RUT',
        rut: '', dv: '', dni: '', pasaporte: '',
        nombre: '', apellido_paterno: '', apellido_materno: '',
        parentesco: '', fecha_nacimiento: '', genero: '',
        nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
        celular: '', email: '',
        es_principal: false
      }
    ] as ApoderadoData[]
  } as StudentData);

  useEffect(() => {
    // Cargar cursos asignados para profesores
    const fetchAssignedCourses = async () => {
      if (userRole.toLowerCase() !== 'profesor') return;

      try {
        const response = await fetch('/api/user/assigned-courses', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const courses = await response.json();
          setAssignedCourses(courses);
        }
      } catch (error) {
        console.error('Error cargando cursos asignados:', error);
      }
    };

    fetchAssignedCourses();
  }, [userRole]);

  const handleStudentChange = (field: keyof StudentData, value: any) => {
    setStudentData(prev => ({ ...prev, [field]: value }));

    // Auto-calcular DV si es el campo RUT del estudiante
    if (field === 'rut' && value) {
      const dv = calculateDV(value);
      setStudentData(prev => ({ ...prev, dv }));
    }
  };

  // Handler específico para NEE
  const handleNeeChange = (selectedNeeIds: number[]) => {
    console.log('🔵 [MatriculaV2Form] handleNeeChange ejecutado. NEEs seleccionadas:', selectedNeeIds);
    setStudentData(prev => ({ ...prev, nees: selectedNeeIds }));
  };

  // Búsqueda de estudiante por RUT
  const handleSearchStudent = async () => {
    const rut = studentData.rut;

    if (!rut) {
      toast.error('Por favor, ingrese el RUT del estudiante');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/student/check/${rut}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const result = await response.json();
      console.log('Respuesta de búsqueda:', result);

      // Manejar los diferentes estados según StudentCheck
      if (result.status === 'nuevo' || result.status === 'precarga') {
        // Estudiante nuevo o precarga
        setIsEditMode(false);

        if (result.status === 'precarga' && result.data) {
          // Cargar datos de precarga
          const studentPayload = result.data;

          // Separar apoderados en principales y suplentes
          const allApoderados = studentPayload.apoderados || [];
          const apoderadosPrincipales = allApoderados
            .filter((apod: any) => apod.es_principal === true)
            .map((apod: any) => ({
              id: apod.id,
              tipo_documento: apod.tipo_documento || (apod.rut ? 'RUT' : apod.dni ? 'DNI' : 'Pasaporte'),
              rut: apod.rut || '',
              dv: apod.dv || '',
              dni: apod.dni || '',
              pasaporte: apod.pasaporte || '',
              nombre: apod.nombre || '',
              apellido_paterno: apod.apellido_paterno || '',
              apellido_materno: apod.apellido_materno || '',
              parentesco: apod.parentesco || '',
              fecha_nacimiento: apod.fecha_nacimiento || '',
              genero: apod.genero || '',
              nacionalidad: apod.nacionalidad || 'Chilena',
              direccion: apod.direccion || '',
              complemento_direccion: apod.complemento_direccion || '',
              region: apod.region || '',
              comuna: apod.comuna || '',
              celular: apod.celular || '',
              email: apod.email || '',
              es_principal: true
            }));

          const apoderadosSuplentes = allApoderados
            .filter((apod: any) => apod.es_principal === false) // Changed filter
            .map((apod: any) => ({
              id: apod.id,
              tipo_documento: apod.tipo_documento || (apod.rut ? 'RUT' : apod.dni ? 'DNI' : 'Pasaporte'),
              rut: apod.rut || '',
              dv: apod.dv || '',
              dni: apod.dni || '',
              pasaporte: apod.pasaporte || '',
              nombre: apod.nombre || '',
              apellido_paterno: apod.apellido_paterno || '',
              apellido_materno: apod.apellido_materno || '',
              parentesco: apod.parentesco || '',
              fecha_nacimiento: apod.fecha_nacimiento || '',
              genero: apod.genero || '',
              nacionalidad: apod.nacionalidad || 'Chilena',
              direccion: apod.direccion || '',
              complemento_direccion: apod.complemento_direccion || '',
              region: apod.region || '',
              comuna: apod.comuna || '',
              celular: apod.celular || '',
              email: apod.email || '',
              es_principal: false
            }));

          // Si no hay apoderados, crear uno vacío
          const defaultPrincipal = {
            tipo_documento: 'RUT',
            rut: '', dv: '', dni: '', pasaporte: '',
            nombre: '', apellido_paterno: '', apellido_materno: '',
            parentesco: '', fecha_nacimiento: '', genero: '',
            nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
            celular: '', email: '',
            es_principal: true
          };
          const defaultSuplente = {
            tipo_documento: 'RUT',
            rut: '', dv: '', dni: '', pasaporte: '',
            nombre: '', apellido_paterno: '', apellido_materno: '',
            parentesco: '', fecha_nacimiento: '', genero: '',
            nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
            celular: '', email: '',
            es_principal: false
          };

          const finalApoderados = [
            apoderadosPrincipales.length > 0 ? apoderadosPrincipales[0] : defaultPrincipal,
            apoderadosSuplentes.length > 0 ? apoderadosSuplentes[0] : defaultSuplente
          ];

          setStudentData({
            ...studentPayload,
            rut,
            dv: studentData.dv,
            apoderados: finalApoderados
          });
          toast.info(`Datos de precarga encontrados para RUT ${rut}. Complete el formulario.`);
        } else {
          toast.info(`El RUT ${rut} no está registrado. Complete el formulario para crear un nuevo estudiante.`);
        }
      } else if (result.status === 'exists') {
        // Estudiante ya existe y está activo
        toast.info(result.message || 'El estudiante ya está matriculado. Use "Gestión de Estudiantes" para editar.');
        // Limpiar formulario
        setStudentData(prev => ({
          ...prev,
          rut: '',
          dv: ''
        }));
      }

    } catch (err: any) {
      console.error('Error en la búsqueda del estudiante:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleGuardianChange = (index: number, field: keyof ApoderadoData, value: any) => {
    const newApoderados = [...(studentData.apoderados || [])];
    if (newApoderados[index]) { // Ensure the guardian exists at this index
      newApoderados[index] = { ...newApoderados[index], [field]: value };

      // Auto-calcular DV si es RUT
      if (field === 'rut' && value) {
        const dv = calculateDV(value);
        newApoderados[index].dv = dv;
      }
      setStudentData(prev => ({ ...prev, apoderados: newApoderados }));
    }
  };



  const handleSearchGuardian = async (index: number, rut?: string) => {
    if (!rut) {
      toast.error('Por favor, ingrese el RUT del apoderado.');
      return;
    }

    try {
      const response = await fetch(`/api/guardians/check/${rut}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 404) {
        toast.info(`El RUT ${rut} no está registrado. Complete el formulario para registrar este apoderado.`);
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al buscar apoderado.');
      }

      const data = await response.json();

      const { parentesco, ...apoderadoData } = data;

      const newApoderados = [...(studentData.apoderados || [])];
      if (newApoderados[index]) {
        newApoderados[index] = {
          ...newApoderados[index],
          ...apoderadoData,
          parentesco: '',
          es_principal: newApoderados[index].es_principal // Preserve existing es_principal
        };
        setStudentData(prev => ({ ...prev, apoderados: newApoderados }));
        toast.success(`Apoderado ${data.nombre} ${data.apellido_paterno} encontrado. Complete el parentesco.`);
      }

    } catch (err: any) {
      console.error('Error en la búsqueda del apoderado:', err);
      toast.error(`Error: ${err.message}`);
    }
  };



  const handleCopyStudentAddressToGuardian = (index: number) => {
    const newApoderados = [...(studentData.apoderados || [])];
    if (newApoderados[index]) {
      newApoderados[index] = {
        ...newApoderados[index],
        direccion: studentData.direccion || '',
        region: studentData.region || '',
        comuna: studentData.comuna || ''
      };
      setStudentData(prev => ({ ...prev, apoderados: newApoderados }));
    }
  };




  const handleSaveStudent = async () => {
    setLoading(true);
    try {
      // Validaciones
      if (!studentData.tipo_religion) {
        toast.error('La religión es obligatoria.');
        setLoading(false);
        return;
      }

      if (!studentData.curso_base || !studentData.letra) {
        toast.error('El curso y letra son obligatorios.');
        setLoading(false);
        return;
      }

      // Validar que exista al menos un apoderado principal válido
      const apoderadoPrincipal = studentData.apoderados?.[0];
      if (!apoderadoPrincipal) {
        toast.error('Debe registrar al menos un apoderado principal.');
        setLoading(false);
        return;
      }

      // Validar campos obligatorios del apoderado principal
      const camposObligatoriosApoderado = [
        { campo: 'nombre', label: 'Nombre' },
        { campo: 'apellido_paterno', label: 'Apellido Paterno' },
        { campo: 'apellido_materno', label: 'Apellido Materno' },
        { campo: 'parentesco', label: 'Parentesco' },
        { campo: 'celular', label: 'Celular' },
        { campo: 'direccion', label: 'Dirección' },
        { campo: 'fecha_nacimiento', label: 'Fecha de Nacimiento' },
        { campo: 'genero', label: 'Género' },
        { campo: 'nacionalidad', label: 'Nacionalidad' }
      ];

      // Validar RUT/DNI/Pasaporte del apoderado principal
      if (apoderadoPrincipal.tipo_documento === 'RUT') {
        if (!apoderadoPrincipal.rut || !apoderadoPrincipal.dv) {
          toast.error('El RUT del apoderado principal es obligatorio.');
          setLoading(false);
          return;
        }
      } else if (apoderadoPrincipal.tipo_documento === 'DNI') {
        if (!apoderadoPrincipal.dni) {
          toast.error('El DNI del apoderado principal es obligatorio.');
          setLoading(false);
          return;
        }
      } else if (apoderadoPrincipal.tipo_documento === 'Pasaporte') {
        if (!apoderadoPrincipal.pasaporte) {
          toast.error('El Pasaporte del apoderado principal es obligatorio.');
          setLoading(false);
          return;
        }
      }

      for (const { campo, label } of camposObligatoriosApoderado) {
        if (!apoderadoPrincipal[campo as keyof typeof apoderadoPrincipal]) {
          toast.error(`El campo "${label}" del apoderado principal es obligatorio.`);
          setLoading(false);
          return;
        }
      }

      // Validar que el celular tenga formato válido (+569XXXXXXXX)
      if (!(apoderadoPrincipal.celular ?? '').match(/^\+569\d{8}$/)) {
        toast.error('El celular del apoderado principal debe tener formato válido (+569XXXXXXXX).');
        setLoading(false);
        return;
      }

      // Si hay apoderado suplente, validar que tenga datos completos o esté completamente vacío
      const apoderadoSuplente = studentData.apoderados?.[1]; // Reference the second guardian in the unified array
      if (apoderadoSuplente && apoderadoSuplente.nombre) { // Check if the suplente actually has data (e.g., a name)
        const tieneAlgunDato = apoderadoSuplente.nombre ||
                               apoderadoSuplente.apellido_paterno ||
                               apoderadoSuplente.rut ||
                               apoderadoSuplente.dni ||
                               apoderadoSuplente.pasaporte ||
                               apoderadoSuplente.celular;

        if (tieneAlgunDato) {
          // Si tiene algún dato, validar que tenga todos los campos obligatorios
          if (apoderadoSuplente.tipo_documento === 'RUT') {
            if (!apoderadoSuplente.rut || !apoderadoSuplente.dv) {
              toast.error('Si ingresa un apoderado suplente, el RUT es obligatorio.');
              setLoading(false);
              return;
            }
          } else if (apoderadoSuplente.tipo_documento === 'DNI') {
            if (!apoderadoSuplente.dni) {
              toast.error('Si ingresa un apoderado suplente, el DNI es obligatorio.');
              setLoading(false);
              return;
            }
          } else if (apoderadoSuplente.tipo_documento === 'Pasaporte') {
            if (!apoderadoSuplente.pasaporte) {
              toast.error('Si ingresa un apoderado suplente, el Pasaporte es obligatorio.');
              setLoading(false);
              return;
            }
          }

          for (const { campo, label } of camposObligatoriosApoderado) {
            if (!apoderadoSuplente[campo as keyof typeof apoderadoSuplente]) {
              toast.error(`Si ingresa un apoderado suplente, el campo "${label}" es obligatorio.`);
              setLoading(false);
              return;
            }
          }

          if (!(apoderadoSuplente.celular ?? '').match(/^\+569\d{8}$/)) {
            toast.error('El celular del apoderado suplente debe tener formato válido (+569XXXXXXXX).');
            setLoading(false);
            return;
          }
        }
      }

      // Verificar autenticación
      const authCheck = await fetch('/api/auth/validate-token', {
        credentials: 'include'
      });
      if (!authCheck.ok) {
        toast.error('No está autenticado. Por favor, inicie sesión.');
        setLoading(false);
        return;
      }

      // Determinar si es edición o creación
      const url = isEditMode && studentData.id
        ? `/api/students/${studentData.id}`
        : '/api/students';
      const method = isEditMode && studentData.id ? 'PUT' : 'POST';

      const dataToSend = { ...studentData };

      // Si no es edición, remover el ID
      if (!isEditMode) {
        delete dataToSend.id;
      }

      console.log(`🔵 [MatriculaV2Form] ${isEditMode ? 'Actualizando' : 'Creando'} estudiante`);
      console.log('🔵 [MatriculaV2Form] Campo nees en dataToSend:', dataToSend.nees);
      console.log('🔵 [MatriculaV2Form] Datos completos:', dataToSend);

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar la matrícula');
      }

      toast.success(isEditMode
        ? '¡Matrícula actualizada exitosamente!'
        : '¡Matrícula creada exitosamente!');

      // Limpiar formulario o volver al inicio
      if (onBackToHome) {
        onBackToHome();
      } else {
        // Resetear formulario (con margen para que se alcance a leer el aviso antes de recargar)
        setTimeout(() => window.location.reload(), 1500);
      }

    } catch (error: any) {
      console.error('Error al guardar matrícula:', error);
      toast.error('Error al guardar la matrícula: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => { // Removed isSuplente parameter
    let value = e.target.value;

    if (value === '') {
      handleGuardianChange(index, 'celular', ''); // Use unified handler
      return;
    }

    value = value.replace(/[^\d+]/g, '');

    if (!value.startsWith('+56')) {
      if (value.startsWith('+')) {
        value = '+56' + value.slice(1).replace(/[^\d]/g, '');
      } else if (value.startsWith('569')) {
        value = '+' + value;
      } else if (value.startsWith('56')) {
        value = '+' + value;
      } else if (value.startsWith('9')) {
        value = '+56' + value;
      } else if (value.length > 0) {
        value = '+569' + value;
      }
    }

    if (value.length > 12) {
      value = value.substring(0, 12);
    }

    if (value.length >= 4 && value.charAt(3) !== '9') {
      value = value.substring(0, 3) + '9' + value.substring(4);
    }

    handleGuardianChange(index, 'celular', value); // Use unified handler
  };

  // Limpiar formulario para nuevo estudiante
  const handleNuevoEstudiante = async () => {
    const confirmed = await confirm('¿Está seguro de que desea limpiar el formulario para crear un nuevo estudiante?');
    if (confirmed) {
      setIsEditMode(false);
      setStudentData({
        estado: 'matriculado',
        apoderados: [
          { // Apoderado Principal
            tipo_documento: 'RUT',
            rut: '', dv: '', dni: '', pasaporte: '',
            nombre: '', apellido_paterno: '', apellido_materno: '',
            parentesco: '', fecha_nacimiento: '', genero: '',
            nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
            celular: '', email: '',
            es_principal: true
          },
          { // Apoderado Suplente
            tipo_documento: 'RUT',
            rut: '', dv: '', dni: '', pasaporte: '',
            nombre: '', apellido_paterno: '', apellido_materno: '',
            parentesco: '', fecha_nacimiento: '', genero: '',
            nacionalidad: 'Chilena', direccion: '', region: '', comuna: '',
            celular: '', email: '',
            es_principal: false
          }
        ] as ApoderadoData[]
      } as StudentData);
      setMissingFields({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '2px solid var(--color-border)' }}>
        <div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-foreground)' }}>
            Matrícula v2 - Formulario Único
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-secondary)' }}>
            Complete toda la información del estudiante y apoderados en una sola página
          </p>
        </div>
        <button
          type="button"
          onClick={handleNuevoEstudiante}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white'
          }}
          title="Limpiar formulario para crear un nuevo estudiante"
        >
          🆕 Nuevo Estudiante
        </button>
      </div>

      {/* SECCIÓN 1: DATOS DEL ESTUDIANTE */}
      <Accordion
        title={`Datos del Estudiante${isEditMode ? ' (Editando)' : ''}`}
        icon="📋"
        defaultOpen={true}
      >
        {/* Búsqueda compacta */}
        <div className="flex gap-2 items-end mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="w-32">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>RUT</label>
            <input
              type="text"
              value={studentData.rut || ''}
              onChange={(e) => handleStudentChange('rut', e.target.value.replace(/[^0-9]/g, ''))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchStudent();
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-sm border"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)'
              }}
              placeholder="12345678"
              disabled={searching}
            />
          </div>
          <div className="w-12">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>DV</label>
            <input
              type="text"
              value={studentData.dv || ''}
              readOnly
              className="w-full px-2 py-2 rounded-lg text-sm text-center border"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)'
              }}
              maxLength={1}
            />
          </div>
          <button
            type="button"
            onClick={handleSearchStudent}
            disabled={searching || !studentData.rut}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: searching || !studentData.rut ? 'var(--color-border)' : 'var(--color-primary)',
              color: 'white',
              cursor: searching || !studentData.rut ? 'not-allowed' : 'pointer'
            }}
          >
            {searching ? '🔍...' : '🔍 Buscar'}
          </button>
        </div>

        {/* Formulario de datos - ocultando RUT si ya se buscó */}
        <StudentDataForm
          student={studentData}
          onStudentChange={handleStudentChange}
          isEditing={isEditMode}
          missingFields={missingFields}
          hideRutFields={!!studentData.rut}
        />
      </Accordion>

      {/* SECCIÓN 2: APODERADO PRINCIPAL */}
      <Accordion
        title="Apoderado Principal"
        icon="👨‍👩‍👧‍👦"
        defaultOpen={false}
      >
        {renderApoderadoForm(studentData.apoderados?.[0], 0, false)}
      </Accordion>

      {/* SECCIÓN 3: APODERADO SUPLENTE */}
      <Accordion
        title="Apoderado Suplente (Opcional)"
        icon="👤"
        defaultOpen={false}
      >
        {renderApoderadoForm(studentData.apoderados?.[1], 1, true)}
      </Accordion>

      {/* SECCIÓN 4: INFORMACIÓN ACADÉMICA */}
      <Accordion
        title="Información Académica"
        icon="🎓"
        defaultOpen={false}
      >
        <AcademicInfoForm
          academicInfo={studentData}
          onAcademicInfoChange={handleStudentChange}
          userRole={userRole?.toLowerCase() as 'profesor' | 'inspector' | 'administrador'}
        />
      </Accordion>

      {/* SECCIÓN 5: PROGRAMAS Y BENEFICIOS */}
      <Accordion
        title="Programas y Beneficios"
        icon="🎯"
        defaultOpen={false}
      >
        <ProgramsAndBenefitsForm
          programsInfo={studentData}
          onProgramsInfoChange={handleStudentChange}
        />
      </Accordion>

      {/* SECCIÓN 6: NEE */}
      <Accordion
        title="Necesidades Educativas Especiales"
        icon="♿"
        defaultOpen={false}
      >
        <NEEForm
          selectedNees={Array.isArray(studentData.nees)
            ? studentData.nees.map((nee: any) => typeof nee === 'number' ? nee : nee.id)
            : []
          }
          onNeeChange={handleNeeChange}
        />
      </Accordion>

      {/* SECCIÓN 7: OBSERVACIONES */}
      <Accordion
        title="Observaciones"
        icon="📝"
        defaultOpen={false}
      >
        <div>
          <label htmlFor="observaciones_matriculador" className="ios-form-label">
            Observaciones del Matriculador - INDICAR ENFERMEDADES - ALERGIA - OTROS
          </label>
          <textarea
            id="observaciones_matriculador"
            value={studentData.observaciones_matriculador || ''}
            onChange={(e) => handleStudentChange('observaciones_matriculador', e.target.value.toUpperCase())}
            rows={4}
            className="ios-form-input"
            style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            placeholder="Ej: ALÉRGICO A LA PENICILINA, ASMA, DIABETES, ETC."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            Indicar información médica importante: enfermedades, alergias u otras observaciones relevantes
          </p>
        </div>
      </Accordion>

      {/* BOTÓN FINAL DE GUARDAR */}
      <div className="mt-8 pt-6" style={{ borderTop: '2px solid var(--color-border)' }}>
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-primary-light)', borderLeft: '4px solid var(--color-primary)' }}>
            <p className="ios-body font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>
              ✅ Listo para guardar
            </p>
            <p className="ios-caption" style={{ color: 'var(--color-text)' }}>
              {isEditMode
                ? 'Se actualizarán todos los datos del estudiante, apoderados e información académica.'
                : 'Se creará un nuevo registro con toda la información del estudiante, apoderados e información académica.'}
            </p>
          </div>
          <button
            onClick={handleSaveStudent}
            disabled={loading}
            className="w-full ios-btn ios-btn-primary text-lg py-4"
          >
            {loading
              ? '⏳ Guardando...'
              : isEditMode
                ? '💾 Actualizar Matrícula'
                : '✅ Guardar Matrícula'}
          </button>
        </div>
      </div>
    </div>
  );

  // Función auxiliar para renderizar formulario de apoderado
  function renderApoderadoForm(apoderado: ApoderadoData | undefined, index: number, _isSuplente: boolean) {
    if (!apoderado) return null;

    const handleChange = handleGuardianChange; // Always use the unified handler
    const handleSearch = handleSearchGuardian; // Always use the unified handler
    const handleCopyAddress = handleCopyStudentAddressToGuardian; // Always use the unified handler

    return (
      <>
        {/* Datos Personales */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Datos Personales</h5>
          <div className="ios-grid ios-grid-3">
            <div>
              <label className="ios-form-label">Tipo Documento <span style={{color: 'var(--color-error)'}}>*</span></label>
              <select
                value={apoderado.tipo_documento}
                onChange={(e) => handleChange(index, 'tipo_documento', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              >
                <option value="RUT">RUT</option>
                <option value="DNI">DNI</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>

            {apoderado.tipo_documento === 'RUT' ? (
              <>
                <div className="grid grid-cols-3 gap-4 col-span-2">
                  <div className="col-span-2">
                    <label className="ios-form-label">RUT <span style={{color: 'var(--color-error)'}}>*</span></label>
                    <input
                      type="text"
                      value={apoderado.rut || ''}
                      onChange={(e) => handleChange(index, 'rut', e.target.value.replace(/[^0-9]/g, ''))}
                      className="ios-form-input"
                      style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                      placeholder="Ej: 12345678"
                      required
                    />
                  </div>
                  <div>
                    <label className="ios-form-label">DV <span style={{color: 'var(--color-error)'}}>*</span></label>
                    <input
                      type="text"
                      value={apoderado.dv || ''}
                      readOnly
                      className="ios-form-input"
                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                      maxLength={1}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleSearch(index, apoderado.rut)}
                    className="ios-btn ios-btn-secondary w-full"
                  >
                    🔍 Buscar
                  </button>
                </div>
              </>
            ) : apoderado.tipo_documento === 'DNI' ? (
              <div className="col-span-2">
                <label className="ios-form-label">DNI <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input
                  type="text"
                  value={apoderado.dni || ''}
                  onChange={(e) => handleChange(index, 'dni', e.target.value)}
                  className="ios-form-input"
                  style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                  required
                />
              </div>
            ) : (
              <div className="col-span-2">
                <label className="ios-form-label">Pasaporte <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input
                  type="text"
                  value={apoderado.pasaporte || ''}
                  onChange={(e) => handleChange(index, 'pasaporte', e.target.value)}
                  className="ios-form-input"
                  style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                  required
                />
              </div>
            )}

            <div>
              <label className="ios-form-label">Nombres <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="text"
                value={apoderado.nombre}
                onChange={(e) => handleChange(index, 'nombre', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              />
            </div>
            <div>
              <label className="ios-form-label">Apellido Paterno <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="text"
                value={apoderado.apellido_paterno}
                onChange={(e) => handleChange(index, 'apellido_paterno', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              />
            </div>
            <div>
              <label className="ios-form-label">Apellido Materno <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="text"
                value={apoderado.apellido_materno}
                onChange={(e) => handleChange(index, 'apellido_materno', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              />
            </div>
            <div>
              <label className="ios-form-label">Parentesco <span style={{color: 'var(--color-error)'}}>*</span></label>
              <select
                value={apoderado.parentesco}
                onChange={(e) => handleChange(index, 'parentesco', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              >
                <option value="">Seleccione...</option>
                {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="ios-form-label">Fecha Nacimiento <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="date"
                value={convertToISO(apoderado.fecha_nacimiento) || ''}
                onChange={(e) => handleChange(index, 'fecha_nacimiento', convertFromISO(e.target.value))}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              />
            </div>
            <div>
              <label className="ios-form-label">Género <span style={{color: 'var(--color-error)'}}>*</span></label>
              <select
                value={apoderado.genero}
                onChange={(e) => handleChange(index, 'genero', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              >
                <option value="">Seleccione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className="ios-form-label">Nacionalidad <span style={{color: 'var(--color-error)'}}>*</span></label>
              <select
                value={apoderado.nacionalidad || 'Chilena'}
                onChange={(e) => handleChange(index, 'nacionalidad', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              >
                {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Datos de Domicilio */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Datos de Domicilio</h5>
          <div className="ios-grid ios-grid-3">
            <div className="col-span-2">
              <label className="ios-form-label">Dirección <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="text"
                value={apoderado.direccion}
                onChange={(e) => handleChange(index, 'direccion', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleCopyAddress(index)}
                className="ios-btn ios-btn-secondary w-full"
              >
                📋 Copiar del estudiante
              </button>
            </div>
          </div>
        </div>

        {/* Datos de Contacto */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Datos de Contacto</h5>
          <div className="ios-grid ios-grid-2">
            <div>
              <label className="ios-form-label">Celular <span style={{color: 'var(--color-error)'}}>*</span></label>
              <input
                type="text"
                value={apoderado.celular}
                onChange={(e) => handlePhoneChange(index, e)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                placeholder="+569XXXXXXXX"
                maxLength={12}
                required
              />
            </div>
            <div>
              <label className="ios-form-label">Email</label>
              <input
                type="email"
                value={apoderado.email || ''}
                onChange={(e) => handleChange(index, 'email', e.target.value)}
                className="ios-form-input"
                style={{ backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default MatriculaV2Form;
