import React, { useEffect, useState } from 'react';
import { nacionalidades, etnias, conQuienViveOptions } from '../utils/chilean-data';
import { convertToISO, convertFromISO } from '../utils/dateUtils';
import type { StudentData, PrevisionSalud } from '../types';

interface StudentDataFormProps {
  student: StudentData | Partial<StudentData>;
  onStudentChange: (field: keyof StudentData, value: any) => void;
  isEditing: boolean;
  missingFields?: {[key: string]: boolean};
  hideRutFields?: boolean;
}

const StudentDataForm: React.FC<StudentDataFormProps> = ({ student, onStudentChange, isEditing, missingFields = {} }) => {
  const [previsionesSalud, setPrevisionesSalud] = useState<PrevisionSalud[]>([]);

  // Cargar catálogo de previsiones de salud
  useEffect(() => {
    const fetchPrevisionesSalud = async () => {
      try {
        const response = await fetch('/api/catalogs/previsiones-salud', { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          setPrevisionesSalud(result.data || []);
        }
      } catch (error) {
        console.error('Error cargando previsiones de salud:', error);
        // Si falla la carga, usar datos por defecto
        setPrevisionesSalud([
          { id: 1, codigo: 'FONASA', nombre: 'FONASA', descripcion: 'Fondo Nacional de Salud', orden: 1, activo: true },
          { id: 2, codigo: 'ISAPRE', nombre: 'ISAPRE', descripcion: 'Instituciones de Salud Previsional', orden: 2, activo: true },
          { id: 3, codigo: 'CAPREDENA', nombre: 'CAPREDENA', descripcion: 'Caja de Previsión de la Defensa Nacional', orden: 3, activo: true },
          { id: 4, codigo: 'DIPRECA', nombre: 'DIPRECA', descripcion: 'Dirección de Previsión de Carabineros de Chile', orden: 4, activo: true },
          { id: 5, codigo: 'OTRO', nombre: 'Otra / No tiene / No sabe', descripcion: 'Otra previsión, sin previsión o desconoce', orden: 5, activo: true }
        ]);
      }
    };
    fetchPrevisionesSalud();
  }, []);

  // Función para calcular el DV del RUT
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

  // Calcular DV automáticamente cuando se recibe un RUT sin DV
  useEffect(() => {
    const rut = student.rut?.toString().trim();
    const dv = student.dv?.toString().trim();

    console.log('🔍 useEffect - RUT:', rut, 'DV:', dv);

    // Si hay RUT pero no hay DV, calcularlo
    if (rut && rut.length >= 7 && rut.length <= 8 && !dv) {
      const calculatedDV = calculateDV(rut);
      console.log('🔄 Calculando DV automáticamente para RUT:', rut, '→ DV:', calculatedDV);
      if (calculatedDV) {
        // Usar setTimeout para evitar problemas de renderizado
        setTimeout(() => {
          onStudentChange('dv', calculatedDV);
        }, 0);
      }
    }
  }, [student.rut]); // Solo depender del RUT, no del DV

  // Función helper para aplicar estilos de resaltado a campos faltantes
  const getFieldStyle = (fieldName: string) => {
    if (missingFields[fieldName]) {
      return {
        borderColor: 'var(--color-error)',
        borderWidth: '2px',
        boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1)'
      };
    }
    return {};
  };

  // Función helper para convertir a mayúsculas (excepto campos específicos)
  const toUpperCaseIfNeeded = (fieldName: string, value: string): string => {
    // Campos que NO deben convertirse a mayúsculas (selects y campos especiales)
    const excludeFields = [
      'telefono',
      'telefono_fijo',
      'fecha_nacimiento',
      'genero',
      'nacionalidad',
      'etnia',
      'con_quien_vive',
      'region',
      'comuna',
      'nivel_educacional_asociado',
      'situacion_laboral_asociado',
      'trabaja_principalmente_asociado'
    ];

    if (excludeFields.includes(fieldName) || typeof value !== 'string') {
      return value;
    }

    return value.toUpperCase();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;

    // Convert date format for fecha_nacimiento from HTML input (YYYY-MM-DD) to database format (DD-MM-YYYY)
    if (id === 'fecha_nacimiento') {
      const convertedDate = convertFromISO(value);
      onStudentChange(id as keyof StudentData, convertedDate);
    } else if (id === 'rut') {
      // Para el RUT: solo permitir números, eliminar puntos, comas y guiones
      let cleanValue = value.replace(/[.,\-\s]/g, '');
      // Solo permitir números
      cleanValue = cleanValue.replace(/[^\d]/g, '');
      console.log('📝 RUT ingresado:', cleanValue, 'Longitud:', cleanValue.length);
      onStudentChange(id as keyof StudentData, cleanValue);

      // Calcular DV automáticamente si el RUT tiene 7-8 dígitos
      if (cleanValue.length >= 7 && cleanValue.length <= 8) {
        const calculatedDV = calculateDV(cleanValue);
        console.log('🧮 DV calculado:', calculatedDV);
        if (calculatedDV) {
          onStudentChange('dv', calculatedDV);
        }
      }
    } else {
      // Convertir a mayúsculas si es necesario
      const finalValue = toUpperCaseIfNeeded(id, value);
      onStudentChange(id as keyof StudentData, finalValue);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Si está vacío, no hacer nada
    if (value === '') {
      onStudentChange('telefono', '');
      return;
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
    
    onStudentChange('telefono', value);
  };

  // NO inicializar valores por defecto - el usuario debe seleccionar explícitamente
  // useEffect(() => {
  //   if (!student.region && !isEditing) {
  //     onStudentChange('region', DEFAULT_REGION);
  //     onStudentChange('comuna', DEFAULT_COMUNA);
  //   }
  // }, [student.region, onStudentChange, isEditing]);

  return (
    <div>
      {/* Título removido - se muestra en el padre */}
      <div className="ios-grid ios-grid-2">
        <div>
          <label htmlFor="rut" className="ios-form-label">RUT <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="rut" 
            value={student.rut || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            readOnly={isEditing} 
            required 
            style={getFieldStyle('rut')}
          />
        </div>
        <div>
          <label htmlFor="dv" className="ios-form-label">DV <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="dv" 
            value={student.dv || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            readOnly={isEditing} 
            maxLength={1} 
            required 
            style={getFieldStyle('dv')}
          />
        </div>
        <div>
          <label htmlFor="nombres" className="ios-form-label">Nombres <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="nombres" 
            value={student.nombres || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('nombres')}
          />
        </div>
        <div>
          <label htmlFor="nombre_social" className="ios-form-label">Nombre Social <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
          <input type="text" id="nombre_social" value={student.nombre_social || ''} onChange={handleChange} className="ios-form-input" />
        </div>
        <div>
          <label htmlFor="apellido_paterno" className="ios-form-label">Apellido Paterno <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="apellido_paterno" 
            value={student.apellido_paterno || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('apellido_paterno')}
          />
        </div>
        <div>
          <label htmlFor="apellido_materno" className="ios-form-label">Apellido Materno <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="apellido_materno" 
            value={student.apellido_materno || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('apellido_materno')}
          />
        </div>
        <div>
          <label htmlFor="fecha_nacimiento" className="ios-form-label">Fecha de Nacimiento <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="date" 
            id="fecha_nacimiento" 
            value={convertToISO(student.fecha_nacimiento) || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('fecha_nacimiento')}
          />
          <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
            Formato: DD-MM-YYYY (día-mes-año)
          </p>
        </div>
        <div>
          <label htmlFor="genero" className="ios-form-label">Género <span style={{color: 'var(--color-error)'}}>*</span></label>
          <select 
            id="genero" 
            value={student.genero || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('genero')}
          >
            <option value="">Seleccione...</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
        </div>
        <div>
          <label htmlFor="nacionalidad" className="ios-form-label">Nacionalidad <span style={{color: 'var(--color-error)'}}>*</span></label>
          <select
            id="nacionalidad"
            value={student.nacionalidad || ''}
            onChange={handleChange}
            className="ios-form-input"
            required
            style={getFieldStyle('nacionalidad')}
          >
            <option value="">Seleccione...</option>
            {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="etnia" className="ios-form-label">Etnia <span style={{color: 'var(--color-error)'}}>*</span></label>
          <select
            id="etnia"
            value={student.etnia || ''}
            onChange={handleChange}
            className="ios-form-input"
            required
            style={getFieldStyle('etnia')}
          >
            <option value="">Seleccione...</option>
            {etnias.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="direccion" className="ios-form-label">Dirección Completa <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="direccion" 
            value={student.direccion || ''} 
            onChange={handleChange} 
            className="ios-form-input" 
            required 
            style={getFieldStyle('direccion')}
          />
        </div>
        <div>
          <label htmlFor="complemento_direccion" className="ios-form-label">Complementos Dirección <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
          <input type="text" id="complemento_direccion" value={student.complemento_direccion || ''} onChange={handleChange} className="ios-form-input" placeholder="Ej: Depto 301, Block B, Piso 2" />
          <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
            Ingrese departamento o piso, población o nombre de la toma
          </p>
        </div>
        <div>
          <label htmlFor="telefono" className="ios-form-label">Teléfono Móvil <span style={{color: 'var(--color-error)'}}>*</span></label>
          <input 
            type="text" 
            id="telefono" 
            value={student.telefono || ''} 
            onChange={handlePhoneChange} 
            className="ios-form-input" 
            placeholder="+569XXXXXXXX"
            maxLength={12}
            required
            style={getFieldStyle('telefono')}
          />
          <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
            Formato chileno: +56 seguido de 9 dígitos
          </p>
        </div>
        <div>
          <label htmlFor="telefono_fijo" className="ios-form-label">Teléfono Fijo <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
          <input type="text" id="telefono_fijo" value={student.telefono_fijo || ''} onChange={handleChange} className="ios-form-input" placeholder="Ej: 552234567" />
          <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
            Opcional: código de área + número local
          </p>
        </div>
        <div>
          <label htmlFor="con_quien_vive" className="ios-form-label">Con Quién Vive <span style={{color: 'var(--color-error)'}}>*</span></label>
          <select
            id="con_quien_vive"
            value={student.con_quien_vive || ''}
            onChange={handleChange}
            className="ios-form-input"
            required
            style={getFieldStyle('con_quien_vive')}
          >
            <option value="">Seleccione...</option>
            {conQuienViveOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Previsión de Salud */}
      <div className="ios-card" style={getFieldStyle('prevision_salud_id')}>
        <label className="ios-form-label" style={{ display: 'block', marginBottom: '1rem' }}>
          Previsión de salud <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {previsionesSalud.map((prevision) => {
            const isSelected = student.prevision_salud_id === prevision.id;
            return (
              <label
                key={prevision.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: isSelected ? 'var(--color-bg-secondary)' : 'transparent',
                  border: '2px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                  minHeight: '60px'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--color-primary-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }
                }}
              >
                <input
                  type="radio"
                  name="prevision_salud"
                  value={prevision.id}
                  checked={isSelected}
                  onChange={(e) => onStudentChange('prevision_salud_id', parseInt(e.target.value))}
                  style={{
                    marginRight: '1rem',
                    marginTop: '0.15rem',
                    flexShrink: 0,
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '0.95rem', flex: 1, lineHeight: '1.5' }}>
                  <strong style={{ display: 'block', marginBottom: prevision.descripcion && prevision.codigo !== 'OTRO' ? '0.25rem' : '0' }}>
                    {prevision.nombre}
                  </strong>
                  {prevision.descripcion && prevision.codigo !== 'OTRO' && (
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', display: 'block' }}>
                      {prevision.descripcion}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Nuevas preguntas sobre persona asociada al estudiante */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderLeft: '4px solid var(--color-primary)',
        borderRadius: '0.5rem'
      }}>
        <p style={{
          color: 'var(--color-primary)',
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
          lineHeight: '1.6'
        }}>
          Responda las siguientes preguntas basándose en la persona asociada al estudiante (quien viva la mayor parte del tiempo con el estudiante)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pregunta 3: Nivel educacional */}
          <div>
            <label htmlFor="nivel_educacional_asociado" className="ios-form-label" style={{ fontWeight: '600' }}>
              3.- Indique el último nivel educacional cursado por la persona asociada al estudiante. (Si la persona está estudiando, indique el nivel que se encuentra cursando) <span style={{color: 'var(--color-error)'}}>*</span>
            </label>
            <select
              id="nivel_educacional_asociado"
              value={student.nivel_educacional_asociado || ''}
              onChange={handleChange}
              className="ios-form-input"
              required
              style={getFieldStyle('nivel_educacional_asociado')}
            >
              <option value="">:: Seleccione ::</option>
              <option value="1º año de educación básica">1º año de educación básica</option>
              <option value="2º año de educación básica">2º año de educación básica</option>
              <option value="3º año de educación básica">3º año de educación básica</option>
              <option value="4º año de educación básica">4º año de educación básica</option>
              <option value="5º año de educación básica">5º año de educación básica</option>
              <option value="6º año de educación básica">6º año de educación básica</option>
              <option value="7º año de educación básica">7º año de educación básica</option>
              <option value="8º año de educación básica">8º año de educación básica</option>
              <option value="1º año de educación media">1º año de educación media</option>
              <option value="2º año de educación media">2º año de educación media</option>
              <option value="3º año de educación media">3º año de educación media</option>
              <option value="4º año de educación media Científico Humanista">4º año de educación media Científico Humanista</option>
              <option value="4º ó 5º año de educación media Técnico Profesional o Vocacional">4º ó 5º año de educación media Técnico Profesional o Vocacional</option>
              <option value="Educación en un Centro de Formación Técnica o Instituto Profesional en curso o incompleta">Educación en un Centro de Formación Técnica o Instituto Profesional en curso o incompleta</option>
              <option value="Titulado de un Centro de Formación Técnica o Instituto Profesional">Titulado de un Centro de Formación Técnica o Instituto Profesional</option>
              <option value="Educación Universitaria en curso o incompleta">Educación Universitaria en curso o incompleta</option>
              <option value="Titulado de una Universidad">Titulado de una Universidad</option>
              <option value="Estudiante o titulado de magíster">Estudiante o titulado de magíster</option>
              <option value="Estudiante o titulado de doctorado">Estudiante o titulado de doctorado</option>
            </select>
          </div>

          {/* Pregunta 4: Situación laboral */}
          <div>
            <label htmlFor="situacion_laboral_asociado" className="ios-form-label" style={{ fontWeight: '600' }}>
              4.- ¿Cuál es la situación laboral de la persona asociada al estudiante? Seleccione una Alternativa. <span style={{color: 'var(--color-error)'}}>*</span>
            </label>
            <select
              id="situacion_laboral_asociado"
              value={student.situacion_laboral_asociado || ''}
              onChange={handleChange}
              className="ios-form-input"
              required
              style={getFieldStyle('situacion_laboral_asociado')}
            >
              <option value="">:: Seleccione ::</option>
              <option value="Trabaja jornada completa (todo el día)">Trabaja jornada completa (todo el día)</option>
              <option value="Trabaja jornada parcial (medio día o algunas horas al día)">Trabaja jornada parcial (medio día o algunas horas al día)</option>
              <option value="No trabaja en este momento, pero está en búsqueda de trabajo (cesante o busca trabajo por primera vez)">No trabaja en este momento, pero está en búsqueda de trabajo (cesante o busca trabajo por primera vez)</option>
              <option value="No trabaja y no está en búsqueda de trabajo (dueña de casa, jubilado, pensionado, etc.)">No trabaja y no está en búsqueda de trabajo (dueña de casa, jubilado, pensionado, etc.)</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Pregunta 5: Dónde trabaja principalmente */}
          <div>
            <label className="ios-form-label" style={{ fontWeight: '600', display: 'block', marginBottom: '0.75rem' }}>
              5.- Si actualmente la persona trabaja, ¿dónde trabaja principalmente? Seleccione una Alternativa.
            </label>
            <div style={{ display: 'flex', gap: '2rem', paddingLeft: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="trabaja_principalmente_asociado"
                  value="En el hogar"
                  checked={student.trabaja_principalmente_asociado === 'En el hogar'}
                  onChange={(e) => onStudentChange('trabaja_principalmente_asociado', e.target.value)}
                  style={{
                    marginRight: '0.5rem',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '0.95rem' }}>En el hogar</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="trabaja_principalmente_asociado"
                  value="Fuera del hogar"
                  checked={student.trabaja_principalmente_asociado === 'Fuera del hogar'}
                  onChange={(e) => onStudentChange('trabaja_principalmente_asociado', e.target.value)}
                  style={{
                    marginRight: '0.5rem',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '0.95rem' }}>Fuera del hogar</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDataForm;