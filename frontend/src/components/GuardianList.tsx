import React, { useState, useEffect } from 'react';
import { validateChileanCellPhone, formatCellPhoneInput } from '../utils/phoneUtils';
import type { ApoderadoData } from '../types';

interface GuardianListProps {
  guardians: ApoderadoData[];
  onChange: (guardians: ApoderadoData[]) => void;
  onSearchGuardian: (index: number, rut?: string) => Promise<{ found: boolean; message: string; rut?: string } | undefined>;
  missingFields?: {[key: string]: boolean};
}

const GuardianList: React.FC<GuardianListProps> = ({
  guardians,
  onChange,
  onSearchGuardian,
  missingFields = {}
}) => {
  const [phoneErrors, setPhoneErrors] = useState<{[key: string]: string}>({});
  const [searchMessages, setSearchMessages] = useState<{[index: number]: {show: boolean; text: string; type: 'info' | 'error'}}>({});

  // Auto-ocultar mensajes después de 5 segundos
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    Object.entries(searchMessages).forEach(([index, message]) => {
      if (message.show) {
        const timer = setTimeout(() => {
          setSearchMessages(prev => ({
            ...prev,
            [index]: {show: false, text: '', type: 'info'}
          }));
        }, 5000);
        timers.push(timer);
      }
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [searchMessages]);

  const calculateDV = (rut: string): string => {
    let sum = 0;
    let multiplier = 2;

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



  const handleRemoveGuardian = (index: number) => {
    const newGuardians = guardians.filter((_, i) => i !== index);

    // Si eliminamos el principal y quedan apoderados, hacer principal al primero
    if (guardians[index].es_principal && newGuardians.length > 0) {
      newGuardians[0].es_principal = true;
    }

    onChange(newGuardians);
  };

  const handleSetPrincipal = (index: number) => {
    const newGuardians = guardians.map((g, i) => ({
      ...g,
      es_principal: i === index
    }));
    onChange(newGuardians);
  };

  const toUpperCaseIfNeeded = (fieldName: string, value: any): any => {
    const excludeFields = ['rut', 'dv', 'celular', 'fecha_nacimiento', 'parentesco', 'genero', 'nacionalidad', 'es_principal'];
    if (excludeFields.includes(fieldName) || typeof value !== 'string') {
      return value;
    }
    return value.toUpperCase();
  };

  const handleGuardianChange = (index: number, field: keyof ApoderadoData, value: any) => {
    const newGuardians = [...guardians];

    // Manejar cambio de RUT con auto-cálculo de DV
    if (field === 'rut') {
      const cleanRut = value.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '');
      newGuardians[index] = {
        ...newGuardians[index],
        rut: cleanRut,
        dv: calculateDV(cleanRut)
      };
    } else if (field === 'celular') {
      const formatted = formatCellPhoneInput(value);
      newGuardians[index] = { ...newGuardians[index], [field]: formatted };

      // Validar teléfono
      const validation = validateChileanCellPhone(formatted);
      setPhoneErrors(prev => ({
        ...prev,
        [`guardian_${index}`]: validation.isValid ? '' : (validation.message ?? '')
      }));
    } else {
      const finalValue = toUpperCaseIfNeeded(field, value);
      newGuardians[index] = { ...newGuardians[index], [field]: finalValue };
    }

    onChange(newGuardians);
  };

  const handleSearch = async (index: number, rut?: string) => {
    const result = await onSearchGuardian(index, rut);

    if (result && !result.found) {
      setSearchMessages(prev => ({
        ...prev,
        [index]: {
          show: true,
          text: result.message,
          type: 'info'
        }
      }));
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Apoderados ({guardians.length})
        </h3>
      </div>



      {guardians.map((guardian, index) => {
        const isPrincipal = guardian.es_principal;
        const message = searchMessages[index];

        return (
          <div
            key={index}
            className={`relative p-6 rounded-lg border-2 ${
              isPrincipal
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'
            }`}
          >
            {/* Header con tipo y botón eliminar */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="principal_guardian"
                    checked={isPrincipal}
                    onChange={() => handleSetPrincipal(index)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className={`font-semibold ${isPrincipal ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'}`}>
                    {isPrincipal ? 'Apoderado Principal' : 'Apoderado Suplente'}
                  </span>
                </label>
              </div>

              {guardians.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveGuardian(index)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                  Eliminar
                </button>
              )}
            </div>

            {/* Mensaje de búsqueda */}
            {message && message.show && (
              <div className={`mb-4 p-3 rounded ${
                message.type === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {message.text}
              </div>
            )}

            {/* Grid de campos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RUT */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  RUT <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="flex-grow flex gap-2">
                    <input
                      type="text"
                      value={guardian.rut || ''}
                      onChange={(e) => handleGuardianChange(index, 'rut', e.target.value)}
                      placeholder="12345678"
                      className={`flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                        missingFields[`apoderado_${index}_rut`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      maxLength={8}
                    />
                    <input
                      type="text"
                      value={guardian.dv || ''}
                      readOnly
                      placeholder="K"
                      className="w-12 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white text-center"
                    />
                  </div>
                  <button type="button" onClick={() => handleSearch(index, guardian.rut)} className="ios-btn ios-btn-secondary w-full sm:w-auto">
                    Buscar
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guardian.nombre || ''}
                  onChange={(e) => handleGuardianChange(index, 'nombre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_nombre`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Apellido Paterno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellido Paterno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guardian.apellido_paterno || ''}
                  onChange={(e) => handleGuardianChange(index, 'apellido_paterno', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_apellido_paterno`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Apellido Materno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellido Materno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guardian.apellido_materno || ''}
                  onChange={(e) => handleGuardianChange(index, 'apellido_materno', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_apellido_materno`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Parentesco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parentesco <span className="text-red-500">*</span>
                </label>
                <select
                  value={guardian.parentesco || ''}
                  onChange={(e) => handleGuardianChange(index, 'parentesco', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_parentesco`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccione...</option>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={guardian.fecha_nacimiento || ''}
                  onChange={(e) => handleGuardianChange(index, 'fecha_nacimiento', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_fecha_nacimiento`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Género */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Género <span className="text-red-500">*</span>
                </label>
                <select
                  value={guardian.genero || ''}
                  onChange={(e) => handleGuardianChange(index, 'genero', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_genero`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Nacionalidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nacionalidad <span className="text-red-500">*</span>
                </label>
                <select
                  value={guardian.nacionalidad || ''}
                  onChange={(e) => handleGuardianChange(index, 'nacionalidad', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_nacionalidad`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Seleccione...</option>
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

              {/* Celular */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Celular <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={guardian.celular || ''}
                  onChange={(e) => handleGuardianChange(index, 'celular', e.target.value)}
                  placeholder="+56912345678"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_celular`] || phoneErrors[`guardian_${index}`]
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {phoneErrors[`guardian_${index}`] && (
                  <p className="text-red-500 text-xs mt-1">{phoneErrors[`guardian_${index}`]}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={guardian.email || ''}
                  onChange={(e) => handleGuardianChange(index, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Dirección */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guardian.direccion || ''}
                  onChange={(e) => handleGuardianChange(index, 'direccion', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white ${
                    missingFields[`apoderado_${index}_direccion`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>
        );
      })}

      {guardians.length > 0 && !guardians.some(g => g.es_principal) && (
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg text-yellow-800 dark:text-yellow-300">
          ⚠️ Debes marcar al menos un apoderado como principal.
        </div>
      )}
    </div>
  );
};

export default GuardianList;
