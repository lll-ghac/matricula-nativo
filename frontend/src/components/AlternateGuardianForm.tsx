import React, { useEffect } from 'react';
import { nacionalidades, parentescoOptions } from '../utils/chilean-data';
import { convertToISO, convertFromISO } from '../utils/dateUtils';

// Interfaces (re-defined for clarity, could be shared)
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
  complemento_direccion?: string;
  region: string;
  comuna: string;
  celular: string;
  email?: string;
  es_principal: boolean; // Kept for data structure consistency
}

interface AlternateGuardianFormProps {
  apoderados: ApoderadoData[];
  onApoderadoChange: (index: number, field: keyof ApoderadoData, value: any) => void;
  onAddApoderado: () => void;
  onRemoveApoderado: (index: number) => void;
  onCopyStudentAddress: (index: number) => void;
  onSearchApoderado: (index: number, rut?: string) => void;
}

const AlternateGuardianForm: React.FC<AlternateGuardianFormProps> = ({
    apoderados,
    onApoderadoChange,
    onAddApoderado,
    onRemoveApoderado,
    onCopyStudentAddress,
    onSearchApoderado
}) => {

  const handleParentescoChange = (index: number, value: string) => {
    onApoderadoChange(index, 'parentesco', value);
    if (value !== 'Otro (especificar)') {
      onApoderadoChange(index, 'otro_parentesco', '');
    }
  };

  const handleDateChange = (index: number, field: 'fecha_nacimiento', value: string) => {
    const convertedDate = convertFromISO(value);
    onApoderadoChange(index, field, convertedDate);
  };

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
    if (value === '') {
      onApoderadoChange(index, 'celular', '');
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
    onApoderadoChange(index, 'celular', value);
  };

  return (
    <div className="ios-form-section">
      <h3 className="ios-title mb-4">Sección 4: Apoderados Suplentes</h3>
      <p className="ios-caption mb-6" style={{ color: 'var(--color-secondary)' }}>
        Agregue aquí apoderados adicionales que puedan retirar al estudiante. Este paso es opcional.
      </p>
      {apoderados.map((apoderado, index) => (
        <div key={index} className="ios-card mb-8 p-6 relative">
          <h4 className="ios-subtitle mb-5">Apoderado Suplente {index + 1}</h4>

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
                <div className="col-span-2">
                  <div className="ios-grid ios-grid-2">
                    <div>
                      <label className="ios-form-label">RUT <span style={{color: 'var(--color-error)'}}>*</span></label>
                      <input 
                        type="text" 
                        value={apoderado.rut || ''} 
                        onChange={(e) => onApoderadoChange(index, 'rut', e.target.value)} 
                        onKeyPress={(e) => handleRutKeyPress(e, index, apoderado.rut)}
                        className="ios-form-input" 
                        placeholder="Ej: 12345678" 
                        required
                      />
                      <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
                        Ingrese solo números, sin - ni dígito verificador
                      </p>
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => onSearchApoderado(index, apoderado.rut)} className="ios-btn ios-btn-secondary w-full">
                        Buscar Apoderado
                      </button>
                    </div>
                  </div>
                </div>
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
                <label className="ios-form-label">Dirección <span style={{color: 'var(--color-error)'}}>*</span></label>
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

          {/* Remove Button */}
          {apoderados.length > 0 && (
            <button type="button" onClick={() => onRemoveApoderado(index)} className="absolute top-6 right-6 ios-btn ios-btn-danger text-xs py-2 px-3">
              🗑️ Eliminar Apoderado
            </button>
          )}
        </div>
      ))}
      <div className="ios-card mt-8 p-6" style={{ backgroundColor: 'var(--color-card)' }}>
        <div className="text-center mb-4">
          <p className="ios-caption mb-3" style={{ color: 'var(--color-secondary)' }}>
            Los datos de los apoderados suplentes se guardan automáticamente al continuar.
          </p>
          <button type="button" onClick={onAddApoderado} className="ios-btn ios-btn-secondary">
            ➕ Agregar Apoderado Suplente
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlternateGuardianForm;