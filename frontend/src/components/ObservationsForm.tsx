import React from 'react';

interface ObservationsData {
  observaciones_matriculador?: string;
}

interface ObservationsFormProps {
  observations: ObservationsData;
  onObservationsChange: (field: keyof ObservationsData, value: string) => void;
  onSaveStudent: () => void;
  loading?: boolean;
  isSuccessfullySaved?: boolean;
}

const ObservationsForm: React.FC<ObservationsFormProps> = ({ observations, onObservationsChange, onSaveStudent, loading = false, isSuccessfullySaved = false }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Convertir a mayúsculas las observaciones
    const finalValue = value.toUpperCase();
    onObservationsChange(id as keyof ObservationsData, finalValue);
  };

  return (
    <div className="ios-form-section">
      <h3 className="ios-title mb-6">Enfermedades o Alergias</h3>
      <div>
        <label htmlFor="observaciones_matriculador" className="ios-form-label">Observaciones</label>
        <textarea
          id="observaciones_matriculador"
          value={observations.observaciones_matriculador || ''}
          onChange={handleInputChange}
          rows={4}
          className="ios-form-input"
          placeholder="Opcional: Informe aqui enfermedades o alergias del estudiante"
        ></textarea>
        <p className="ios-caption mt-1">
          Opcional: Informe aqui enfermedades o alergias del estudiante
        </p>
      </div>

      {/* Botón Guardar Matrícula */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => {
            if (!isSuccessfullySaved) {
              console.log('🔥 Botón Guardar Matrícula clicado!');
              onSaveStudent();
            }
          }}
          disabled={loading || isSuccessfullySaved}
          className={`ios-btn w-full py-4 text-lg font-semibold ${
            loading ? 'ios-btn-secondary opacity-50 cursor-not-allowed' : 
            isSuccessfullySaved ? 'opacity-90 cursor-not-allowed' :
            'ios-btn-primary'
          }`}
          style={{
            backgroundColor: 
              loading ? 'var(--color-secondary)' : 
              isSuccessfullySaved ? 'var(--color-success)' :
              'var(--color-primary)',
            color: 'white'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Guardando Matrícula...</span>
            </div>
          ) : isSuccessfullySaved ? (
            <div className="flex items-center justify-center space-x-2">
              <span>✅ Matrícula Guardada Exitosamente</span>
            </div>
          ) : (
            '💾 Guardar Matrícula'
          )}
        </button>
        <p className="ios-caption text-center mt-2" style={{color: 'var(--color-text-light)'}}>
          Al guardar se generará automáticamente el comprobante de matrícula
        </p>
      </div>
    </div>
  );
};

export default ObservationsForm;