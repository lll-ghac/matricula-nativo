import React, { useState, useEffect, useRef } from 'react';
import { nacionalidades, parentescoOptions } from '../utils/chilean-data';
import { convertToISO, convertFromISO } from '../utils/dateUtils';
import { calculateDV } from '../utils/rutUtils';

// Interfaces
interface ApoderadoData {
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
  otro_parentesco?: string;
  fecha_nacimiento: string;
  genero: string;
  nacionalidad: string;
  direccion: string;
  complemento_direccion?: string; // Added this field
  region: string;
  comuna: string;
  celular: string; // No longer required in interface, but type is string
  email?: string;
  es_principal: boolean;
}

interface GuardianFormProps {
  apoderados: ApoderadoData[];
  apoderados_suplentes?: ApoderadoData[];
  activeTab?: 'principal' | 'suplente';
  onTabChange?: (tab: 'principal' | 'suplente') => void;
  onApoderadoChange: (index: number, field: keyof ApoderadoData, value: any) => void;
  onSuplenteChange?: (index: number, field: keyof ApoderadoData, value: any) => void;
  onAddApoderado: () => void;
  onAddSuplente?: () => void;
  onRemoveApoderado: (index: number) => void;
  onRemoveSuplente?: (index: number) => void;
  onSetPrincipal: (index: number) => void;
  onCopyStudentAddress: (index: number) => void; // Added this prop
  onCopyStudentAddressToSuplente?: (index: number) => void;
  onSearchApoderado: (index: number, rut?: string) => void;
  onSearchSuplente?: (index: number, rut?: string) => void;
  showOnlyPrincipal?: boolean; // Nueva prop para mostrar solo principal
  showOnlySupplente?: boolean; // Nueva prop para mostrar solo suplente
}

const GuardianForm: React.FC<GuardianFormProps> = ({
    apoderados,
    apoderados_suplentes = [],
    activeTab: controlledActiveTab,
    onTabChange,
    onApoderadoChange,
    onSuplenteChange,
    onAddApoderado,
    onAddSuplente,
    onRemoveApoderado,
    onSetPrincipal,
    onCopyStudentAddress, // Destructure the new prop
    onCopyStudentAddressToSuplente,
    onSearchApoderado,
    onSearchSuplente,
    showOnlyPrincipal = false,
    showOnlySupplente = false
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'principal' | 'suplente'>('principal');
  
  // Use controlled tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const lastGuardianRef = useRef<HTMLDivElement>(null);
  const lastSuplenteRef = useRef<HTMLDivElement>(null);
  const prevGuardiansLength = useRef(apoderados.length);
  const prevSuplentesLength = useRef(apoderados_suplentes.length);

  useEffect(() => {
    apoderados.forEach((apoderado, index) => {
      if (apoderado.rut) {
        const calculatedDv = calculateDV(apoderado.rut);
        if (apoderado.dv !== calculatedDv) {
          onApoderadoChange(index, 'dv', calculatedDv);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apoderados.map(a => a.rut).join(',')]);

  useEffect(() => {
    if (onSuplenteChange) {
      apoderados_suplentes.forEach((suplente, index) => {
        if (suplente.rut) {
          const calculatedDv = calculateDV(suplente.rut);
          if (suplente.dv !== calculatedDv) {
            onSuplenteChange(index, 'dv', calculatedDv);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apoderados_suplentes.map(a => a.rut).join(',')]);


  useEffect(() => {
    // Solo hacer scroll si se añadió un apoderado
    if (apoderados.length > prevGuardiansLength.current) {
      setTimeout(() => {
        if (lastGuardianRef.current) {
          // Debug: Cambiar el color de fondo para confirmar que la ref funciona
          lastGuardianRef.current.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          lastGuardianRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // Un timeout ligeramente mayor para asegurar la renderización
    }
    // Actualizar la longitud previa para la próxima renderización
    prevGuardiansLength.current = apoderados.length;
  }, [apoderados.length]);

  useEffect(() => {
    // Solo hacer scroll si se añadió un suplente
    if (apoderados_suplentes.length > prevSuplentesLength.current) {
      setTimeout(() => {
        if (lastSuplenteRef.current) {
          lastSuplenteRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    // Actualizar la longitud previa para la próxima renderización
    prevSuplentesLength.current = apoderados_suplentes.length;
  }, [apoderados_suplentes.length]);

  const handleParentescoChange = (index: number, value: string) => {
    onApoderadoChange(index, 'parentesco', value);
    if (value !== 'Otro (especificar)') {
      onApoderadoChange(index, 'otro_parentesco', '');
    }
  };

  // Handler for date fields to convert between HTML input format and database format
  const handleDateChange = (index: number, field: 'fecha_nacimiento', value: string) => {
    const convertedDate = convertFromISO(value);
    onApoderadoChange(index, field, convertedDate);
  };

  // Inicializar valores por defecto para apoderados nuevos
  useEffect(() => {
    apoderados.forEach((apoderado, index) => {
      // Solo setear valores por defecto si son realmente nuevos (sin RUT)
      if (!apoderado.rut) {
        if (!apoderado.nacionalidad) {
          onApoderadoChange(index, 'nacionalidad', 'Chilena');
        }
        if (!apoderado.tipo_documento) {
          onApoderadoChange(index, 'tipo_documento', 'RUT');
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apoderados.length]);

  const handleRutKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, index: number, rut?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchApoderado(index, rut);
    }
  };

  const handlePhoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Si está vacío, no hacer nada
    if (value === '') {
      onApoderadoChange(index, 'celular', '');
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
    
    onApoderadoChange(index, 'celular', value);
  };

  const handleSuplenteParentescoChange = (index: number, value: string) => {
    if (onSuplenteChange) {
      onSuplenteChange(index, 'parentesco', value);
      if (value !== 'Otro (especificar)') {
        onSuplenteChange(index, 'otro_parentesco', '');
      }
    }
  };

  const handleSuplentePhoneChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSuplenteChange) return;
    
    let value = e.target.value;
    
    // Si está vacío, no hacer nada
    if (value === '') {
      onSuplenteChange(index, 'celular', '');
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
    
    onSuplenteChange(index, 'celular', value);
  };

  const handleSuplenteRutKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, index: number, rut?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSearchSuplente) {
        onSearchSuplente(index, rut);
      }
    }
  };

  const handleSuplenteDateChange = (index: number, field: 'fecha_nacimiento', value: string) => {
    if (onSuplenteChange) {
      const convertedDate = convertFromISO(value);
      onSuplenteChange(index, field, convertedDate);
    }
  };

  return (
    <div className="ios-form-section">
      <h3 className="ios-title mb-4">
        {showOnlyPrincipal ? 'Paso 2: Apoderado Principal' : 
         showOnlySupplente ? 'Paso 3: Apoderado Suplente' : 
         'Sección 2: Apoderados'}
      </h3>
      <p className="ios-caption mb-6" style={{ color: 'var(--color-secondary)' }}>
        {showOnlyPrincipal ? 'Complete la información del apoderado principal. Es obligatorio.' :
         showOnlySupplente ? 'Complete la información del apoderado suplente. Es obligatorio.' :
         'Complete la información de al menos un apoderado principal. Los datos se guardan automáticamente.'}
      </p>
      
      {/* Tabs Navigation - Solo se muestra si no estamos en modo específico */}
      {!showOnlyPrincipal && !showOnlySupplente && (
        <div className="sticky top-16 z-10 mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              const newTab = 'principal';
              if (onTabChange) {
                onTabChange(newTab);
              } else {
                setInternalActiveTab(newTab);
              }
            }}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'principal'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg">👨‍👩‍👧‍👦</span>
            Apoderado Principal
          </button>
          <button
            type="button"
            onClick={() => {
              const newTab = 'suplente';
              if (onTabChange) {
                onTabChange(newTab);
              } else {
                setInternalActiveTab(newTab);
              }
            }}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'suplente'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-green-600 hover:bg-gray-200'
            }`}
          >
            <span className="text-lg">👤</span>
            Apoderado Suplente
          </button>
          </div>
        </div>
      )}
      {/* Principal Apoderados Tab */}
      {(activeTab === 'principal' || showOnlyPrincipal) && !showOnlySupplente && (
        <div>
          {apoderados.length === 0 ? (
            <div className="ios-card p-8 text-center">
              <div className="mb-4">
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
              </div>
              <h4 className="ios-subtitle mb-2">No hay apoderado principal</h4>
              <p className="ios-caption text-gray-600 mb-4">
                Es obligatorio tener al menos un apoderado principal.
              </p>
              <button type="button" onClick={onAddApoderado} className="ios-btn ios-btn-primary">
                ➕ Agregar Apoderado Principal
              </button>
            </div>
          ) : (
            apoderados.map((apoderado, index) => (
        <div 
          key={index} 
          className="ios-card mb-8 p-6 relative"
          ref={index === apoderados.length - 1 ? lastGuardianRef : null}
        >
          <h4 className="ios-subtitle mb-5">Apoderado {index + 1}</h4>

          {/* Personal Data Section */}
          <div className="mb-6">
            <h5 className="ios-body font-medium mb-4">Datos Personales</h5>
            <div className="ios-grid ios-grid-3">
              <div>
                <label className="ios-form-label">Tipo Documento <span style={{color: 'var(--color-error)'}}>*</span></label>
                <select value={apoderado.tipo_documento} onChange={(e) => onApoderadoChange(index, 'tipo_documento', e.target.value)} className="ios-form-input" required>
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
                        onChange={(e) => onApoderadoChange(index, 'rut', e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyPress={(e) => handleRutKeyPress(e, index, apoderado.rut)}
                        className="ios-form-input"
                        placeholder="Ej: 12345678"
                        required
                      />
                       <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                        Solo números, sin puntos ni guion
                      </p>
                    </div>
                    <div>
                      <label className="ios-form-label">DV <span style={{color: 'var(--color-error)'}}>*</span></label>
                      <input
                        type="text"
                        value={apoderado.dv || ''}
                        readOnly
                        className="ios-form-input bg-gray-100"
                        maxLength={1}
                        placeholder="K"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => onSearchApoderado(index, apoderado.rut)} className="ios-btn ios-btn-secondary w-full">
                      Buscar Apoderado
                    </button>
                  </div>
                </>
              ) : apoderado.tipo_documento === 'DNI' ? (
                <div className="col-span-2">
                  <label className="ios-form-label">DNI <span style={{color: 'var(--color-error)'}}>*</span></label>
                  <input type="text" value={apoderado.dni || ''} onChange={(e) => onApoderadoChange(index, 'dni', e.target.value)} className="ios-form-input" placeholder="Número de DNI" required />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="ios-form-label">Pasaporte <span style={{color: 'var(--color-error)'}}>*</span></label>
                  <input type="text" value={apoderado.pasaporte || ''} onChange={(e) => onApoderadoChange(index, 'pasaporte', e.target.value)} className="ios-form-input" placeholder="Número de Pasaporte" required />
                </div>
              )}
              
              <div>
                <label className="ios-form-label">Nombres <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input type="text" value={apoderado.nombre} onChange={(e) => onApoderadoChange(index, 'nombre', e.target.value)} className="ios-form-input" required placeholder="Nombres del apoderado" />
              </div>
              <div>
                <label className="ios-form-label">Apellido Paterno <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input type="text" value={apoderado.apellido_paterno} onChange={(e) => onApoderadoChange(index, 'apellido_paterno', e.target.value)} className="ios-form-input" required placeholder="Apellido Paterno" />
              </div>
              <div>
                <label className="ios-form-label">Apellido Materno <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input type="text" value={apoderado.apellido_materno} onChange={(e) => onApoderadoChange(index, 'apellido_materno', e.target.value)} className="ios-form-input" required placeholder="Apellido Materno" />
              </div>
              <div>
                <label className="ios-form-label">Parentesco <span style={{color: 'var(--color-error)'}}>*</span></label>
                <select
                  value={apoderado.parentesco}
                  onChange={(e) => handleParentescoChange(index, e.target.value)}
                  className="ios-form-input"
                  required
                >
                  <option value="">Seleccione...</option>
                  {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {apoderado.parentesco === 'Otro (especificar)' && (
                <div>
                  <label className="ios-form-label">Especifique Parentesco <span style={{color: 'var(--color-error)'}}>*</span></label>
                  <input
                    type="text"
                    value={apoderado.otro_parentesco || ''}
                    onChange={(e) => onApoderadoChange(index, 'otro_parentesco', e.target.value)}
                    className="ios-form-input"
                    placeholder="Especifique"
                    required
                  />
                </div>
              )}
              <div>
                <label className="ios-form-label">Fecha Nacimiento <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input 
                  type="date" 
                  value={convertToISO(apoderado.fecha_nacimiento) || ''} 
                  onChange={(e) => handleDateChange(index, 'fecha_nacimiento', e.target.value)} 
                  className="ios-form-input" 
                  required 
                />
                <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                  Formato: DD-MM-YYYY (día-mes-año)
                </p>
              </div>
              <div>
                <label className="ios-form-label">Género <span style={{color: 'var(--color-error)'}}>*</span></label>
                <select value={apoderado.genero} onChange={(e) => onApoderadoChange(index, 'genero', e.target.value)} className="ios-form-input" required>
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No Binario">No Binario</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="ios-form-label">Nacionalidad <span style={{color: 'var(--color-error)'}}>*</span></label>
                <select value={apoderado.nacionalidad || 'Chilena'} onChange={(e) => onApoderadoChange(index, 'nacionalidad', e.target.value)} className="ios-form-input" required>
                  {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="mb-6">
            <h5 className="ios-body font-medium mb-4">Datos de Domicilio</h5>
            <div className="ios-grid ios-grid-3">
              <div className="col-span-2">
                <label className="ios-form-label">Dirección exacta (calle y número) <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input type="text" value={apoderado.direccion} onChange={(e) => onApoderadoChange(index, 'direccion', e.target.value)} className="ios-form-input" required placeholder="Calle, número" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => onCopyStudentAddress(index)} className="ios-btn ios-btn-secondary w-full">
                  Copiar dirección de estudiante
                </button>
              </div>
              <div className="col-span-3">
                <label className="ios-form-label">Complementos Dirección <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
                <input type="text" value={apoderado.complemento_direccion || ''} onChange={(e) => onApoderadoChange(index, 'complemento_direccion', e.target.value)} className="ios-form-input" placeholder="Ej: Depto 301, Block B, Piso 2" />
                <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                  Ingrese departamento o piso, población o nombre de la toma
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mb-6">
            <h5 className="ios-body font-medium mb-4">Datos de Contacto</h5>
            <div className="ios-grid ios-grid-2">
              <div>
                <label className="ios-form-label">Celular <span style={{color: 'var(--color-error)'}}>*</span></label>
                <input 
                  type="text" 
                  value={apoderado.celular} 
                  onChange={(e) => handlePhoneChange(index, e)} 
                  className="ios-form-input" 
                  placeholder="+569XXXXXXXX" 
                  maxLength={12}
                  required
                />
                <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                  Formato chileno: +56 seguido de 9 dígitos
                </p>
              </div>
              <div>
                <label className="ios-form-label">Email <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
                <input type="email" value={apoderado.email || ''} onChange={(e) => onApoderadoChange(index, 'email', e.target.value)} className="ios-form-input" placeholder="correo@ejemplo.com" />
              </div>
            </div>
          </div>

          {/* Principal Guardian Checkbox */}
          <div className="flex items-center mt-6 p-4 ios-card">
            <input 
              type="checkbox" 
              id={`principal-${index}`} 
              checked={apoderado.es_principal} 
              onChange={() => onSetPrincipal(index)} 
              className="h-5 w-5 rounded border-2 focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--color-border)',
                accentColor: 'var(--color-primary)',
                backgroundColor: apoderado.es_principal ? 'var(--color-primary)' : 'var(--color-input-bg)'
              }}
            />
            <label htmlFor={`principal-${index}`} className="ml-3 ios-subtitle">Apoderado Principal</label>
          </div>

          {/* Remove Button */}
          {apoderados.length > 1 && (
            <button type="button" onClick={() => onRemoveApoderado(index)} className="absolute top-6 right-6 ios-btn ios-btn-danger text-xs py-2 px-3">
              🗑️ Eliminar Apoderado
            </button>
          )}
        </div>
          ))
        )}
        </div>
      )}

      {/* Suplente Apoderados Tab */}
      {(activeTab === 'suplente' || showOnlySupplente) && !showOnlyPrincipal && (
        <div>
          {apoderados_suplentes.length === 0 ? (
            <div className="ios-card p-8 text-center">
              <div className="mb-4">
                <span className="text-4xl">👤</span>
              </div>
              <h4 className="ios-subtitle mb-2">No hay apoderados suplentes</h4>
              <p className="ios-caption text-gray-600 mb-4">
                Los apoderados suplentes son opcionales pero pueden ser útiles en caso de emergencia.
              </p>
              {onAddSuplente && (
                <button type="button" onClick={onAddSuplente} className="ios-btn ios-btn-primary">
                  ➕ Agregar Apoderado Suplente
                </button>
              )}
            </div>
          ) : (
            <>
              {apoderados_suplentes.map((suplente, index) => (
                <div 
                  key={`suplente-${index}`} 
                  className="ios-card mb-8 p-6 relative"
                  ref={index === apoderados_suplentes.length - 1 ? lastSuplenteRef : null}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="ios-subtitle">Apoderado Suplente {index + 1}</h4>
                  </div>

                  {/* Personal Data Section */}
                  <div className="mb-6">
                    <h5 className="ios-body font-medium mb-4">Datos Personales</h5>
                    <div className="ios-grid ios-grid-3">
                      <div>
                        <label className="ios-form-label">Tipo Documento <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <select 
                          value={suplente.tipo_documento || 'RUT'} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'tipo_documento', e.target.value)} 
                          className="ios-form-input" 
                          required
                        >
                          <option value="RUT">RUT</option>
                          <option value="DNI">DNI</option>
                          <option value="Pasaporte">Pasaporte</option>
                        </select>
                      </div>
                      
                      {(suplente.tipo_documento || 'RUT') === 'RUT' ? (
                        <>
                          <div className="grid grid-cols-3 gap-4 col-span-2">
                            <div className="col-span-2">
                              <label className="ios-form-label">RUT <span style={{color: 'var(--color-error)'}}>*</span></label>
                              <input
                                type="text"
                                value={suplente.rut || ''}
                                onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'rut', e.target.value.replace(/[^0-9]/g, ''))}
                                onKeyPress={(e) => handleSuplenteRutKeyPress(e, index, suplente.rut)}
                                className="ios-form-input"
                                placeholder="Ej: 12345678"
                                required
                              />
                              <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                                Solo números, sin puntos ni guion
                              </p>
                            </div>
                            <div>
                              <label className="ios-form-label">DV <span style={{color: 'var(--color-error)'}}>*</span></label>
                              <input
                                type="text"
                                value={suplente.dv || ''}
                                readOnly
                                className="ios-form-input bg-gray-100"
                                maxLength={1}
                                placeholder="K"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => onSearchSuplente && onSearchSuplente(index, suplente.rut)}
                              className="ios-btn ios-btn-secondary w-full"
                            >
                              Buscar Apoderado
                            </button>
                          </div>
                        </>
                      ) : (suplente.tipo_documento || 'RUT') === 'DNI' ? (
                        <div className="col-span-2">
                          <label className="ios-form-label">DNI <span style={{color: 'var(--color-error)'}}>*</span></label>
                          <input 
                            type="text" 
                            value={suplente.dni || ''} 
                            onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'dni', e.target.value)} 
                            className="ios-form-input" 
                            placeholder="12345678" 
                            required
                          />
                        </div>
                      ) : (
                        <div className="col-span-2">
                          <label className="ios-form-label">Pasaporte <span style={{color: 'var(--color-error)'}}>*</span></label>
                          <input 
                            type="text" 
                            value={suplente.pasaporte || ''} 
                            onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'pasaporte', e.target.value)} 
                            className="ios-form-input" 
                            placeholder="AB123456" 
                            required
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="ios-grid ios-grid-3 mt-4">
                      <div>
                        <label className="ios-form-label">Nombres <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="text" 
                          value={suplente.nombre || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'nombre', e.target.value)} 
                          className="ios-form-input" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Apellido Paterno <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="text" 
                          value={suplente.apellido_paterno || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'apellido_paterno', e.target.value)} 
                          className="ios-form-input" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Apellido Materno <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="text" 
                          value={suplente.apellido_materno || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'apellido_materno', e.target.value)} 
                          className="ios-form-input" 
                          required 
                        />
                      </div>
                    </div>

                    <div className="ios-grid ios-grid-3 mt-4">
                      <div>
                        <label className="ios-form-label">Parentesco <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <select 
                          value={suplente.parentesco || ''} 
                          onChange={(e) => handleSuplenteParentescoChange(index, e.target.value)} 
                          className="ios-form-input" 
                          required
                        >
                          <option value="">Seleccione parentesco</option>
                          {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      {suplente.parentesco === 'Otro (especificar)' && (
                        <div>
                          <label className="ios-form-label">Especificar parentesco <span style={{color: 'var(--color-error)'}}>*</span></label>
                          <input 
                            type="text" 
                            value={suplente.otro_parentesco || ''} 
                            onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'otro_parentesco', e.target.value)} 
                            className="ios-form-input" 
                            placeholder="Ej: Tío, Hermano mayor" 
                            required 
                          />
                        </div>
                      )}
                      <div>
                        <label className="ios-form-label">Fecha Nacimiento <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="date" 
                          value={convertToISO(suplente.fecha_nacimiento) || ''} 
                          onChange={(e) => handleSuplenteDateChange(index, 'fecha_nacimiento', e.target.value)} 
                          className="ios-form-input" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="ios-form-label">Género <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <select 
                          value={suplente.genero || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'genero', e.target.value)} 
                          className="ios-form-input" 
                          required
                        >
                          <option value="">Seleccione género</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <label className="ios-form-label">Nacionalidad <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <select 
                          value={suplente.nacionalidad || 'Chilena'} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'nacionalidad', e.target.value)} 
                          className="ios-form-input" 
                          required
                        >
                          {nacionalidades.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="mb-6">
                    <h5 className="ios-body font-medium mb-4">Datos de Domicilio</h5>
                    <div className="ios-grid ios-grid-3">
                      <div className="md:col-span-1 lg:col-span-2">
                        <label className="ios-form-label">Dirección exacta (calle y número) <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="text" 
                          value={suplente.direccion || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'direccion', e.target.value)} 
                          className="ios-form-input" 
                          required 
                          placeholder="Calle, número" 
                        />
                      </div>
                      <div className="md:col-span-1 lg:col-span-1">
                        <label className="ios-form-label">Complemento Dirección</label>
                        <input 
                          type="text" 
                          value={suplente.complemento_direccion || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'complemento_direccion', e.target.value)} 
                          className="ios-form-input" 
                          placeholder="Depto, casa, piso..." 
                        />
                      </div>
                      <div className="flex items-end col-span-3">
                        <button
                          type="button"
                          onClick={() => onCopyStudentAddressToSuplente && onCopyStudentAddressToSuplente(index)}
                          className="ios-btn ios-btn-secondary"
                        >
                          Copiar dirección de estudiante
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Section */}
                  <div className="mb-6">
                    <h5 className="ios-body font-medium mb-4">Datos de Contacto</h5>
                    <div className="ios-grid ios-grid-2">
                      <div>
                        <label className="ios-form-label">Celular <span style={{color: 'var(--color-error)'}}>*</span></label>
                        <input 
                          type="text" 
                          value={suplente.celular || ''} 
                          onChange={(e) => handleSuplentePhoneChange(index, e)} 
                          className="ios-form-input" 
                          placeholder="+569XXXXXXXX" 
                          maxLength={12}
                          required
                        />
                        <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                          Formato chileno: +56 seguido de 9 dígitos
                        </p>
                      </div>
                      <div>
                        <label className="ios-form-label">Email <span className="ios-caption" style={{color: 'var(--color-text-light)'}}>(opcional)</span></label>
                        <input 
                          type="email" 
                          value={suplente.email || ''} 
                          onChange={(e) => onSuplenteChange && onSuplenteChange(index, 'email', e.target.value)} 
                          className="ios-form-input" 
                          placeholder="correo@ejemplo.com" 
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ))}
              
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GuardianForm;