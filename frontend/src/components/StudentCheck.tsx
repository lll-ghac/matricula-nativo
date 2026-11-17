import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { StudentData } from '../types';
import { useToast } from '../context/ToastContext';

// Definimos las props que el componente espera, incluyendo la función callback
interface StudentCheckProps {
  onStudentFound: (data: StudentData) => void;
}

const StudentCheck: React.FC<StudentCheckProps> = ({ onStudentFound }) => {
  const toast = useToast();
  const [rut, setRut] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [existingStudent, setExistingStudent] = useState<any>(null);

  // Función para calcular el dígito verificador
  const calcularDV = (rutNumero: string): string => {
    if (!rutNumero || rutNumero.length === 0) return '';

    let suma = 0;
    let multiplo = 2;

    // Recorrer el RUT de derecha a izquierda
    for (let i = rutNumero.length - 1; i >= 0; i--) {
      suma += parseInt(rutNumero.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const resto = suma % 11;
    const dv = 11 - resto;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
  };

  // Calcular DV automáticamente cuando cambia el RUT
  const dvCalculado = calcularDV(rut);

  // Funciones para manejar el modal de estudiante ya matriculado
  const handleGoToManagement = () => {
    console.log('✅ Usuario va a Gestión de Estudiantes');
    setShowEditModal(false);
    setExistingStudent(null);
    setRut('');
    // Aquí podríamos agregar navegación directa a Gestión de Estudiantes
    toast.info('Vaya a "Gestión de Estudiantes" para editar los datos del estudiante.');
  };

  const handleCancelEdit = () => {
    console.log('❌ Usuario canceló y busca otro estudiante');
    setShowEditModal(false);
    setExistingStudent(null);
    setRut('');
    setError('');
  };

  const handleCheck = async () => {
    if (!rut.trim()) {
      setError('Por favor, ingrese un RUT.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/student/check/${rut}`);
      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }
      const data = await response.json();

      console.log('Respuesta de la API:', data);

      // Nueva lógica de manejo de estados
      if (data.status === 'nuevo' || data.status === 'precarga') {
        // Para 'nuevo', data.data será undefined, para 'precarga' contendrá los datos.
        // Si es nuevo, pasamos un objeto solo con el RUT para el nuevo formulario.
        const studentPayload = data.data || { rut: rut, apoderados: [] };
        onStudentFound(studentPayload);
      } else if (data.status === 'exists') {
        // Estudiante ya matriculado y activo, mostrar alerta y no continuar.
        console.log('⚠️ Estudiante ya existe y está activo:', data.message);
        toast.info(data.message); // Muestra el mensaje del backend, ej: "El alumno ya se encuentra Matriculado..."
        setRut(''); // Limpiar el input
      } else {
        // Manejar cualquier otro caso inesperado
        setError(`Respuesta inesperada del servidor: ${data.status}`);
      }

    } catch (err) {
      console.error('Error al verificar el RUT:', err);
      setError('Error al conectar con el servidor. Asegúrese de que está encendido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  return (
    <div className="ios-card max-w-lg mx-auto p-8">
      <h2 className="ios-title-large text-center mb-8">
        Matricular Estudiante
      </h2>
      
      <div className="space-y-6">
        <div>
          <div className="flex gap-3 items-end mb-2">
            <label htmlFor="rut-input" className="ios-form-label flex-1">
              RUT del Estudiante
            </label>
            <label htmlFor="dv-display" className="ios-form-label text-xs" style={{ width: '80px', textAlign: 'center' }}>
              DV (calculado)
            </label>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <input
                id="rut-input"
                type="text"
                value={rut}
                onChange={(e) => {
                  // Eliminar puntos, comas, guiones y espacios, solo permitir números
                  const cleanValue = e.target.value.replace(/[.,\-\s]/g, '').replace(/[^\d]/g, '');
                  setRut(cleanValue);
                }}
                onKeyPress={handleKeyPress}
                placeholder="Ej: 12345678"
                className="ios-form-input"
                disabled={isLoading}
              />
            </div>
            <div style={{ width: '80px' }}>
              <input
                id="dv-display"
                type="text"
                value={dvCalculado}
                readOnly
                disabled
                className="ios-form-input text-center font-bold text-lg"
                style={{
                  backgroundColor: '#f0f0f0',
                  color: dvCalculado ? '#2A9D8F' : '#999',
                  cursor: 'not-allowed'
                }}
                placeholder="-"
              />
            </div>
          </div>
          <div className="ios-card mt-3 p-4" style={{ 
            backgroundColor: 'var(--color-primary-light)', 
            borderColor: 'var(--color-primary)'
          }}>
            <p className="ios-body font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
              📝 Ejemplo de cómo ingresar el RUT:
            </p>
            <div className="flex items-center justify-center gap-2 text-lg font-mono mb-2">
              <span className="ios-caption" style={{ color: 'var(--color-secondary)' }}>
                Si tu RUT es: 12.345.678-9
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="ios-body" style={{ color: 'var(--color-primary)' }}>Solo ingresa:</span>
              <div 
                className="px-3 py-1 rounded-md font-mono font-bold text-lg" 
                style={{ 
                  backgroundColor: 'var(--color-primary)', 
                  color: 'white',
                  boxShadow: 'var(--shadow-small)'
                }}
              >
                12345678
              </div>
              <span className="ios-caption" style={{ color: 'var(--color-secondary)' }}>(sin</span>
              <span className="line-through font-mono" style={{ color: 'var(--color-error)' }}>-9</span>
              <span className="ios-caption" style={{ color: 'var(--color-secondary)' }}>)</span>
            </div>
            <p className="ios-caption mt-3 text-center" style={{ color: 'var(--color-primary)' }}>
              ⚠️ Sin puntos, sin guión, sin dígito verificador
            </p>
          </div>
        </div>

        <button
          onClick={handleCheck}
          disabled={isLoading}
          className={`ios-btn w-full ${isLoading ? 'ios-btn-secondary' : 'ios-btn-primary'} flex items-center justify-center gap-2`}
        >
          {isLoading && <Loader2 size={20} className="animate-spin" />}
          {isLoading ? 'Buscando...' : 'Buscar Estudiante'}
        </button>

        {error && (
          <div className="ios-card p-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
            <p className="text-center font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Modal personalizado para estudiante ya matriculado */}
      {showEditModal && existingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="ios-card max-w-md w-full mx-4 overflow-hidden">
            {/* Header del modal */}
            <div className="ios-card p-6 mb-0" style={{ 
              backgroundColor: 'var(--color-warning)', 
              borderRadius: 'var(--radius-large) var(--radius-large) 0 0'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }}>
                  <span className="text-white text-xl">⚠️</span>
                </div>
                <h3 className="ios-title text-white">
                  Estudiante ya matriculado
                </h3>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="ios-subtitle">
                    {existingStudent.nombres} {existingStudent.apellido_paterno} {existingStudent.apellido_materno || ''}
                  </p>
                  <p className="ios-body mt-1" style={{ color: 'var(--color-secondary)' }}>
                    RUT: {existingStudent.rut}-{existingStudent.dv}
                  </p>
                </div>
                
                <div className="ios-card p-4" style={{ 
                  backgroundColor: 'var(--color-info)', 
                  color: 'white',
                  borderColor: 'var(--color-info)'
                }}>
                  <p className="text-sm leading-relaxed">
                    Ya está matriculado en este año académico con estado: 
                    <span className="font-semibold ml-1">{existingStudent.estado}</span>
                  </p>
                </div>

                <div className="text-center">
                  <p className="ios-body font-medium mb-2">
                    ¿Desea editar la matrícula existente?
                  </p>
                  <p className="ios-caption" style={{ color: 'var(--color-secondary)' }}>
                    • Editar: Abrir formulario para modificar la matrícula<br/>
                    • Cancelar: Volver a buscar otro estudiante
                  </p>
                </div>
              </div>
            </div>

            {/* Botones del modal */}
            <div className="p-6 pt-0 flex gap-3 justify-end">
              <button
                onClick={handleCancelEdit}
                className="ios-btn ios-btn-secondary"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleGoToManagement}
                className="ios-btn ios-btn-primary"
              >
                Ir a Gestión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCheck;
