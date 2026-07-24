import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ProgramsData {
  pie?: boolean;
  beca?: boolean;
  tipo_beca?: string;
  pae?: boolean;
}

interface ProgramsFormProps {
  programsInfo: ProgramsData;
  onProgramsInfoChange: (field: keyof ProgramsData, value: any) => void;
}

const ProgramsAndBenefitsForm: React.FC<ProgramsFormProps> = ({ programsInfo, onProgramsInfoChange }) => {
  const [showPAEWarning, setShowPAEWarning] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Si se selecciona PAE, mostrar advertencia inline
    if (id === 'pae' && checked) {
      setShowPAEWarning(true);
    }

    onProgramsInfoChange(id as keyof ProgramsData, type === 'checkbox' ? checked : value);
  };

  const handlePAEWarningAccept = () => {
    setShowPAEWarning(false);
  };

  const handlePAEWarningCancel = () => {
    setShowPAEWarning(false);
    onProgramsInfoChange('pae', false);
  };

  // Mostrar banner automáticamente si PAE ya está marcado
  useEffect(() => {
    if (programsInfo.pae && !showPAEWarning) {
      setShowPAEWarning(true);
    }
  }, [programsInfo.pae]);

  return (
    <div>
      {/* Título removido - se muestra en el padre */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="pie"
            checked={programsInfo.pie || false}
            onChange={handleInputChange}
            className="ios-checkbox mr-3"
          />
          <label htmlFor="pie" className="ios-form-label">PIE (Programa de Integración Escolar)</label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="pae"
            checked={programsInfo.pae || false}
            onChange={handleInputChange}
            className="ios-checkbox mr-3"
          />
          <label htmlFor="pae" className="ios-form-label">
            PAE (Programa de Alimentación Escolar)
          </label>
        </div>
      </div>

      {/* Banner de advertencia PAE inline - Se expande cuando PAE está marcado */}
      {programsInfo.pae && showPAEWarning && (
        <div
          style={{
            overflow: 'hidden',
            animation: 'expandDown 0.3s ease-out',
            marginTop: '1rem'
          }}
        >
          <div
            className="ios-card p-5"
            style={{
              backgroundColor: '#fff3cd',
              borderColor: '#ffc107',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderRadius: '12px'
            }}
          >
            {/* Encabezado */}
            <div className="flex items-start mb-4">
              <AlertTriangle
                size={24}
                style={{
                  color: '#ff9800',
                  minWidth: '24px',
                  marginTop: '2px'
                }}
                className="mr-3"
              />
              <div className="flex-1">
                <h4
                  className="font-semibold mb-1"
                  style={{
                    color: '#856404',
                    fontSize: '1.1rem'
                  }}
                >
                  IMPORTANTE - REQUISITO OBLIGATORIO
                </h4>
              </div>
            </div>

            {/* Contenido del mensaje */}
            <div className="mb-4 ml-9">
              <div
                className="p-4 mb-3"
                style={{
                  backgroundColor: '#ff9800',
                  borderRadius: '8px',
                  color: 'white'
                }}
              >
                <p className="text-sm font-medium mb-1">
                  📄 Requisito del Programa PAE:
                </p>
                <p className="text-sm">
                  <strong>DEBE entregar físicamente el documento Registro Social de Hogares (RSH).</strong>
                </p>
              </div>

              <div style={{ color: '#856404' }}>
                <p className="text-sm mb-2">
                  <strong>Si NO tiene el documento RSH:</strong>
                </p>
                <ul className="text-sm ml-4" style={{ listStyleType: 'disc' }}>
                  <li>NO marque esta opción</li>
                  <li>El apoderado deberá gestionar con la encargada del programa en <strong>Marzo</strong></li>
                </ul>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 ml-9">
              <button
                onClick={handlePAEWarningCancel}
                className="ios-btn ios-btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                No tengo el RSH
              </button>
              <button
                onClick={handlePAEWarningAccept}
                className="ios-btn"
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                Tengo el RSH - Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para animación de expansión suave */}
      <style>{`
        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgramsAndBenefitsForm;