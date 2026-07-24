import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const MassUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Solo se permiten archivos CSV');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Solo se permiten archivos CSV');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Seleccione un archivo CSV');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: Implement CSV upload API
      console.log('Uploading file:', file.name);
      
      // Simulated upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        total: 100,
        success: 95,
        errors: 5,
        warnings: ['Algunos registros tenían datos incompletos']
      });
    } catch (err: any) {
      setError(err.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Upload size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Carga Masiva de Estudiantes</h3>
      </div>

      {/* Instructions */}
      <div className="ios-card p-6" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <h4 className="ios-subtitle mb-3">📋 Instrucciones para la Carga Masiva</h4>
        <ul className="space-y-2 ios-body" style={{color: 'var(--color-secondary)'}}>
          <li>• Use el formato CSV estándar con las columnas requeridas</li>
          <li>• El archivo debe incluir: RUT, nombres, apellidos, curso, etc.</li>
          <li>• Los apoderados existentes se buscarán automáticamente por RUT</li>
          <li>• Se validará cada registro antes de la importación</li>
        </ul>
        <button className="ios-btn ios-btn-secondary mt-4">
          <FileText size={16} className="mr-2" />
          Descargar Plantilla CSV
        </button>
      </div>

      {/* Upload Area */}
      <div className="ios-card p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload size={48} className="mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
          
          {!file ? (
            <>
              <h4 className="ios-subtitle mb-2">Arrastre su archivo CSV aquí</h4>
              <p className="ios-body mb-4" style={{color: 'var(--color-text-light)'}}>
                o haga clic para seleccionar
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="ios-btn ios-btn-primary cursor-pointer">
                Seleccionar Archivo CSV
              </label>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <FileText size={24} style={{color: 'var(--color-success)'}} />
                <span className="ios-subtitle">{file.name}</span>
              </div>
              <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
                Tamaño: {(file.size / 1024).toFixed(2)} KB
              </p>
              <div className="space-x-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="ios-btn ios-btn-primary"
                >
                  {uploading ? 'Procesando...' : 'Procesar Archivo'}
                </button>
                <button
                  onClick={() => {setFile(null); setResult(null); setError(null);}}
                  className="ios-btn ios-btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 ios-card p-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} />
              <span className="ios-body">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="ios-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle size={24} style={{color: 'var(--color-success)'}} />
            <h4 className="ios-subtitle">Resultado de la Carga</h4>
          </div>
          
          <div className="ios-grid ios-grid-3 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>{result.total}</div>
              <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Total Procesados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--color-success)'}}>{result.success}</div>
              <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Exitosos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: 'var(--color-error)'}}>{result.errors}</div>
              <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Con Errores</div>
            </div>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="ios-card p-4" style={{backgroundColor: 'var(--color-warning)', color: 'white'}}>
              <h5 className="font-medium mb-2">Advertencias:</h5>
              <ul className="list-disc list-inside">
                {result.warnings.map((warning: string, index: number) => (
                  <li key={index} className="ios-body">{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MassUpload;