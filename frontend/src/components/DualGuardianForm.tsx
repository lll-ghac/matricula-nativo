import React, { useState, useEffect } from 'react';
import { validateChileanCellPhone, PHONE_FORMAT_EXAMPLES, formatCellPhoneInput } from '../utils/phoneUtils';
import type { ApoderadoData } from '../types';

interface DualGuardianFormProps {
  principalGuardian: ApoderadoData;
  suplenteGuardian: ApoderadoData;
  onPrincipalChange: (guardian: ApoderadoData) => void;
  onSuplenteChange: (guardian: ApoderadoData) => void;
  onSearchPrincipal: (rut?: string) => Promise<{ found: boolean; message: string; rut?: string } | undefined>;
  onSearchSuplente: (rut?: string) => Promise<{ found: boolean; message: string; rut?: string } | undefined>;
  missingFields?: {[key: string]: boolean};
}

const DualGuardianForm: React.FC<DualGuardianFormProps> = ({
  principalGuardian,
  suplenteGuardian,
  onPrincipalChange,
  onSuplenteChange,
  onSearchPrincipal,
  onSearchSuplente
}) => {
  console.log('🔍 DualGuardianForm - Apoderado Suplente recibido:', suplenteGuardian);
  console.log('🔍 DualGuardianForm - Region:', suplenteGuardian.region);
  console.log('🔍 DualGuardianForm - Comuna:', suplenteGuardian.comuna);

  const [phoneErrors, setPhoneErrors] = useState<{[key: string]: string}>({});
  const [principalMessage, setPrincipalMessage] = useState<{show: boolean; text: string; type: 'info' | 'error'}>({show: false, text: '', type: 'info'});
  const [suplenteMessage, setSuplenteMessage] = useState<{show: boolean; text: string; type: 'info' | 'error'}>({show: false, text: '', type: 'info'});

  // Auto-ocultar mensajes después de 5 segundos
  useEffect(() => {
    if (principalMessage.show) {
      const timer = setTimeout(() => {
        setPrincipalMessage({show: false, text: '', type: 'info'});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [principalMessage.show]);

  useEffect(() => {
    if (suplenteMessage.show) {
      const timer = setTimeout(() => {
        setSuplenteMessage({show: false, text: '', type: 'info'});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [suplenteMessage.show]);

  // Wrapper para manejar la búsqueda con mensajes inline
  const handleSearch = async (type: 'principal' | 'suplente', rut?: string) => {
    const searchFn = type === 'principal' ? onSearchPrincipal : onSearchSuplente;
    const setMessage = type === 'principal' ? setPrincipalMessage : setSuplenteMessage;

    const result = await searchFn(rut);

    if (result && !result.found) {
      setMessage({
        show: true,
        text: result.message,
        type: 'info'
      });
    }
  };

  const calculateDV = (rut: string): string => {
    let sum = 0;
    let multiplier = 2;

    // Procesar RUT de derecha a izquierda
    for (let i = rut.length - 1; i >= 0; i--) {
      sum += parseInt(rut[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const dv = 11 - remainder;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
  };

  // Función helper para convertir a mayúsculas (excepto campos específicos)
  const toUpperCaseIfNeeded = (fieldName: string, value: string | boolean): string | boolean => {
    // Campos que NO deben convertirse a mayúsculas
    const excludeFields = ['email', 'celular', 'telefono', 'fecha_nacimiento', 'rut', 'dv', 'dni', 'pasaporte', 'parentesco', 'genero', 'nacionalidad', 'region', 'comuna'];

    if (typeof value !== 'string' || excludeFields.includes(fieldName)) {
      return value;
    }

    return value.toUpperCase();
  };

  const handleFieldChange = (
    type: 'principal' | 'suplente',
    field: keyof ApoderadoData,
    value: string | boolean
  ) => {
    const currentGuardian = type === 'principal' ? principalGuardian : suplenteGuardian;
    const onChange = type === 'principal' ? onPrincipalChange : onSuplenteChange;
    const errorKey = `${type}_${field}`;

    // Validación específica para teléfono celular
    if (field === 'celular' && typeof value === 'string') {
      // Formatear automáticamente el input
      const formattedValue = formatCellPhoneInput(value);
      const validation = validateChileanCellPhone(formattedValue);

      // Actualizar errores
      const newErrors = { ...phoneErrors };
      if (!validation.isValid && formattedValue.trim() !== '') {
        newErrors[errorKey] = validation.message || 'Formato inválido';
      } else {
        delete newErrors[errorKey];
      }
      setPhoneErrors(newErrors);

      // Usar el valor formateado
      onChange({
        ...currentGuardian,
        [field]: formattedValue,
        // Asegurar que siempre se mantengan los flags correctos
        es_principal: type === 'principal' ? true : false,
        es_suplente: type === 'suplente' ? true : false
      });
      return; // Salir temprano para evitar el onChange adicional
    }

    if (field === 'rut' && typeof value === 'string') {
      const cleanedRut = value.replace(/[^0-9]/g, '');
      const dv = calculateDV(cleanedRut);
      onChange({
        ...currentGuardian,
        rut: cleanedRut,
        dv: dv,
        // Asegurar que siempre se mantengan los flags correctos
        es_principal: type === 'principal' ? true : false,
        es_suplente: type === 'suplente' ? true : false
      });
    } else {
      // Convertir a mayúsculas si es necesario
      const finalValue = toUpperCaseIfNeeded(field, value);
      onChange({
        ...currentGuardian,
        [field]: finalValue,
        // Asegurar que siempre se mantengan los flags correctos
        es_principal: type === 'principal' ? true : false,
        es_suplente: type === 'suplente' ? true : false
      });
    }
  };

  const renderGuardianColumn = (
    guardian: ApoderadoData,
    type: 'principal' | 'suplente',
    title: string
  ) => {
    const message = type === 'principal' ? principalMessage : suplenteMessage;

    return (
      <div className="flex-1 ios-card p-6" style={{
        borderWidth: '3px',
        borderColor: type === 'principal' ? 'var(--color-primary)' : 'var(--color-info)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <h3 className="ios-title mb-6 pb-3" style={{
          borderBottom: '3px solid ' + (type === 'principal' ? 'var(--color-primary)' : 'var(--color-info)'),
          paddingBottom: '12px',
          marginBottom: '24px',
          color: type === 'principal' ? 'var(--color-primary)' : 'var(--color-info)'
        }}>
          {title}
        </h3>

        <div className="space-y-4">
          {/* RUT Chileno - Obligatorio */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="ios-form-label">
                RUT * (Obligatorio)
              </label>
              <input
                type="text"
                id={`${type}_rut`}
                value={guardian.rut || ''}
                onChange={(e) => handleFieldChange(type, 'rut', e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => handleSearch(type, guardian.rut)}
                placeholder="12345678"
                className="ios-form-input"
                required
              />
            </div>
            <div>
              <label className="ios-form-label">
                DV *
              </label>
              <input
                type="text"
                id={`${type}_dv`}
                value={guardian.dv || ''}
                readOnly
                className="ios-form-input"
                disabled
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleSearch(type, guardian.rut)}
                className="ios-btn ios-btn-primary w-full"
                style={{ minHeight: '48px' }}
              >
                🔍 Buscar
              </button>
            </div>
          </div>

          {/* Mensaje inline para apoderado no encontrado */}
          {message.show && (
            <div className="ios-card p-4 animate-fade-in" style={{
              backgroundColor: 'var(--color-info-light)',
              borderLeft: '4px solid var(--color-info)',
              boxShadow: 'var(--shadow-small)'
            }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">ℹ️</div>
                <div className="flex-1">
                  <p className="ios-body" style={{color: 'var(--color-info)'}}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Documentos Adicionales (Opcionales) */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="ios-form-label">
                DNI (Opcional - Solo informativo)
              </label>
              <input
                type="text"
                id={`${type}_dni`}
                value={guardian.dni || ''}
                onChange={(e) => handleFieldChange(type, 'dni', e.target.value)}
                placeholder="12345678"
                className="ios-form-input"
              />
            </div>
            <div>
              <label className="ios-form-label">
                Pasaporte (Opcional - Solo informativo)
              </label>
              <input
                type="text"
                id={`${type}_pasaporte`}
                value={guardian.pasaporte || ''}
                onChange={(e) => handleFieldChange(type, 'pasaporte', e.target.value)}
                placeholder="A12345678"
                className="ios-form-input"
              />
            </div>
          </div>

          {/* Nombres */}
          <div>
            <label className="ios-form-label">
              Nombres *
            </label>
            <input
              type="text"
              id={`${type}_nombre`}
              value={guardian.nombre}
              onChange={(e) => handleFieldChange(type, 'nombre', e.target.value)}
              className="ios-form-input"
            />
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ios-form-label">
                Apellido Paterno *
              </label>
              <input
                type="text"
                id={`${type}_apellido_paterno`}
                value={guardian.apellido_paterno}
                onChange={(e) => handleFieldChange(type, 'apellido_paterno', e.target.value)}
                className="ios-form-input"
              />
            </div>
            <div>
              <label className="ios-form-label">
                Apellido Materno *
              </label>
              <input
                type="text"
                id={`${type}_apellido_materno`}
                value={guardian.apellido_materno}
                onChange={(e) => handleFieldChange(type, 'apellido_materno', e.target.value)}
                className="ios-form-input"
              />
            </div>
          </div>

          {/* Parentesco */}
          <div>
            <label className="ios-form-label">
              Parentesco *
            </label>
            <select
              id={`${type}_parentesco`}
              value={guardian.parentesco}
              onChange={(e) => handleFieldChange(type, 'parentesco', e.target.value)}
              className="ios-form-input"
            >
              <option value="">Seleccionar parentesco</option>
              <option value="Padre">Padre</option>
              <option value="Madre">Madre</option>
              <option value="Abuelo">Abuelo</option>
              <option value="Abuela">Abuela</option>
              <option value="Tío">Tío</option>
              <option value="Tía">Tía</option>
              <option value="Hermano">Hermano</option>
              <option value="Hermana">Hermana</option>
              <option value="Tutor Legal">Tutor Legal</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="ios-form-label">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              lang="es"
              id={`${type}_fecha_nacimiento`}
              value={guardian.fecha_nacimiento || ''}
              onChange={(e) => handleFieldChange(type, 'fecha_nacimiento', e.target.value)}
              className="ios-form-input"
            />
            {guardian.fecha_nacimiento && (
              <p className="ios-caption mt-1" style={{ color: 'var(--color-text-light)' }}>
                {(() => {
                  const [y, m, d] = (guardian.fecha_nacimiento || '').split('-');
                  return d && m && y ? `📅 ${d}-${m}-${y}` : '';
                })()}
              </p>
            )}
          </div>

          {/* Género */}
          <div>
            <label className="ios-form-label">
              Género *
            </label>
            <select
              id={`${type}_genero`}
              value={guardian.genero || ''}
              onChange={(e) => handleFieldChange(type, 'genero', e.target.value)}
              className="ios-form-input"
            >
              <option value="">Seleccionar género</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Nacionalidad */}
          <div>
            <label className="ios-form-label">
              Nacionalidad *
            </label>
            <select
              id={`${type}_nacionalidad`}
              value={guardian.nacionalidad || ''}
              onChange={(e) => handleFieldChange(type, 'nacionalidad', e.target.value)}
              className="ios-form-input"
            >
              <option value="">Seleccionar nacionalidad</option>
              <option value="Chilena">Chilena</option>
              <option value="Argentina">Argentina</option>
              <option value="Boliviana">Boliviana</option>
              <option value="Brasileña">Brasileña</option>
              <option value="Colombiana">Colombiana</option>
              <option value="Ecuatoriana">Ecuatoriana</option>
              <option value="Paraguaya">Paraguaya</option>
              <option value="Peruana">Peruana</option>
              <option value="Uruguaya">Uruguaya</option>
              <option value="Venezolana">Venezolana</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          {/* Contacto */}
          <div>
            <label className="ios-form-label">
              Teléfono Celular *
            </label>
            <input
              type="tel"
              id={`${type}_celular`}
              value={guardian.celular}
              onChange={(e) => handleFieldChange(type, 'celular', e.target.value)}
              placeholder="Escriba números, se formatea automáticamente"
              className={`ios-form-input ${phoneErrors[`${type}_celular`] ? 'error' : ''}`}
            />
            {phoneErrors[`${type}_celular`] && (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-error)' }}>
                {phoneErrors[`${type}_celular`]}
              </p>
            )}
            <p className="mt-1 ios-caption">
              Formatos válidos: {PHONE_FORMAT_EXAMPLES.cellPhone.join(', ')}
            </p>
          </div>

          <div>
            <label className="ios-form-label">
              Email
            </label>
            <input
              type="email"
              id={`${type}_email`}
              value={guardian.email}
              onChange={(e) => handleFieldChange(type, 'email', e.target.value)}
              className="ios-form-input"
              placeholder="ejemplo@correo.com"
            />
            <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
              Opcional
            </p>
          </div>

          {/* Dirección */}
          <div>
            <label className="ios-form-label">
              Dirección Completa - Calle y Numero *
            </label>
            <input
              type="text"
              id={`${type}_direccion`}
              value={guardian.direccion}
              onChange={(e) => handleFieldChange(type, 'direccion', e.target.value)}
              className="ios-form-input"
            />
          </div>

          {/* Complemento Dirección */}
          <div>
            <label className="ios-form-label">
              Complemento Dirección (Depto, Block, Villa, etc.)
            </label>
            <input
              type="text"
              id={`${type}_complemento_direccion`}
              value={guardian.complemento_direccion || ''}
              onChange={(e) => handleFieldChange(type, 'complemento_direccion', e.target.value)}
              placeholder="Ej: Depto 305, Block B, Villa Los Robles"
              className="ios-form-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="ios-title-large mb-2">
          Datos de Apoderados
        </h2>
        <p className="ios-body">
          Complete la información del apoderado principal y suplente
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {renderGuardianColumn(principalGuardian, 'principal', '👨‍👩‍👧‍👦 Apoderado Principal')}
        {renderGuardianColumn(suplenteGuardian, 'suplente', '🔄 Apoderado Suplente')}
      </div>
    </div>
  );
};

export default DualGuardianForm;