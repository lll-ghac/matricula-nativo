import React, { useState } from 'react';
import { X, Save, User, Phone } from 'lucide-react';
import { convertToISO, convertFromISO } from '../utils/dateUtils';

interface GuardianEditModalProps {
  guardian: any;
  onSave: (guardian: any) => void;
  onClose: () => void;
}

const GuardianEditModal: React.FC<GuardianEditModalProps> = ({ guardian, onSave, onClose }) => {
  const [editedGuardian, setEditedGuardian] = useState({...guardian});

  const handleInputChange = (field: string, value: string) => {
    // Convert date format for fecha_nacimiento from HTML input (YYYY-MM-DD) to database format (DD-MM-YYYY)
    if (field === 'fecha_nacimiento') {
      const convertedDate = convertFromISO(value);
      setEditedGuardian((prev: any) => ({
        ...prev,
        [field]: convertedDate
      }));
    } else {
      setEditedGuardian((prev: any) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = () => {
    onSave(editedGuardian);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <img 
                src="/InsigniaEcuador.png" 
                alt="Escuela Ecuador" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Editar Apoderado</h3>
                <p className="text-gray-600 text-sm">RUT: {guardian.rut}-{guardian.dv}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <User size={20} className="text-blue-600" />
                <h4 className="font-semibold text-gray-700">Información Personal</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editedGuardian.nombre || ''}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Paterno</label>
                <input
                  type="text"
                  value={editedGuardian.apellido_paterno || ''}
                  onChange={(e) => handleInputChange('apellido_paterno', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Materno</label>
                <input
                  type="text"
                  value={editedGuardian.apellido_materno || ''}
                  onChange={(e) => handleInputChange('apellido_materno', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco</label>
                <select
                  value={editedGuardian.parentesco || ''}
                  onChange={(e) => handleInputChange('parentesco', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione parentesco</option>
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Tío/a">Tío/a</option>
                  <option value="Hermano/a">Hermano/a</option>
                  <option value="Tutor">Tutor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={convertToISO(editedGuardian.fecha_nacimiento) || ''}
                  onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: DD-MM-YYYY (día-mes-año)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                <select
                  value={editedGuardian.genero || ''}
                  onChange={(e) => handleInputChange('genero', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione género</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Phone size={20} className="text-green-600" />
                <h4 className="font-semibold text-gray-700">Contacto y Ubicación</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="text"
                  value={editedGuardian.celular || ''}
                  onChange={(e) => handleInputChange('celular', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editedGuardian.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
                <input
                  type="text"
                  value={editedGuardian.nacionalidad || ''}
                  onChange={(e) => handleInputChange('nacionalidad', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editedGuardian.direccion || ''}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento Dirección</label>
                <input
                  type="text"
                  value={editedGuardian.complemento_direccion || ''}
                  onChange={(e) => handleInputChange('complemento_direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Depto, casa, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
                <input
                  type="text"
                  value={editedGuardian.region || ''}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comuna</label>
                <input
                  type="text"
                  value={editedGuardian.comuna || ''}
                  onChange={(e) => handleInputChange('comuna', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Información del Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>ID: {guardian.id}</div>
              <div>Principal: {guardian.es_principal ? 'Sí' : 'No'}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X size={16} className="inline mr-2" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save size={16} className="inline mr-2" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianEditModal;