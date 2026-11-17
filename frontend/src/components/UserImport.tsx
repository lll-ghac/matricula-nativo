import React, { useState } from 'react';
import { Upload, FileText, Users, Check, X, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
  duplicates: string[];
}

const UserImport: React.FC = () => {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error('Por favor seleccione un archivo CSV válido.');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast.error('Por favor seleccione un archivo CSV válido.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/users/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        toast.error(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error importing users:', error);
      toast.error('Error al importar usuarios. Verifique su conexión.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `usuario,contraseña,nombre_completo,rol
12345678,31-01-1980,Juan Pérez González,profesor
87654321,15-06-1975,María Rodríguez López,inspector
23456789,10-12-1985,Ana Silva Martínez,administrador
34567890,22-03-1990,Carlos López Torres,sololectura`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_usuarios.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Users size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Importación Masiva de Usuarios</h3>
      </div>

      {/* Template Download */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">📋 Plantilla CSV</h4>
        <p className="ios-body mb-4" style={{color: 'var(--color-secondary)'}}>
          Descarga la plantilla con el formato correcto para importar usuarios.
        </p>
        
        <div className="ios-card p-4 mb-4" style={{backgroundColor: 'var(--color-background-alt)'}}>
          <h5 className="ios-subtitle mb-2">Formato requerido:</h5>
          <ul className="text-sm space-y-1" style={{color: 'var(--color-secondary)'}}>
            <li><strong>Usuario:</strong> RUT sin puntos, sin guión, sin DV (ej: 12345678)</li>
            <li><strong>Contraseña:</strong> Fecha de nacimiento DD-MM-YYYY (ej: 31-01-1980)</li>
            <li><strong>Nombre Completo:</strong> Nombre completo del usuario</li>
            <li><strong>Rol:</strong> profesor, inspector, administrador, sololectura</li>
          </ul>
        </div>

        <button
          onClick={downloadTemplate}
          className="ios-btn ios-btn-secondary flex items-center gap-2"
        >
          <Download size={18} />
          Descargar Plantilla CSV
        </button>
      </div>

      {/* File Upload */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">📁 Subir Archivo CSV</h4>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload size={48} className={`mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="ios-body mb-2">
            Arrastra tu archivo CSV aquí o
          </p>
          <label className="ios-btn ios-btn-primary cursor-pointer">
            <FileText size={18} className="mr-2" />
            Seleccionar Archivo
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="mt-4 ios-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} style={{color: 'var(--color-primary)'}} />
                <div>
                  <p className="ios-subtitle">{file.name}</p>
                  <p className="ios-caption" style={{color: 'var(--color-secondary)'}}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`ios-btn flex items-center gap-2 ${
                  isUploading ? 'ios-btn-secondary' : 'ios-btn-primary'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Importar Usuarios
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="ios-card p-6">
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <Check size={24} style={{color: 'var(--color-success)'}} />
            ) : (
              <X size={24} style={{color: 'var(--color-error)'}} />
            )}
            <h4 className="ios-subtitle">
              {result.success ? 'Importación Completada' : 'Importación con Errores'}
            </h4>
          </div>

          <div className="space-y-4">
            {result.created > 0 && (
              <div className="ios-card p-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
                <div className="flex items-center gap-2">
                  <Check size={20} />
                  <span className="ios-subtitle">
                    {result.created} usuario{result.created !== 1 ? 's' : ''} creado{result.created !== 1 ? 's' : ''} exitosamente
                  </span>
                </div>
              </div>
            )}

            {result.updated > 0 && (
              <div className="ios-card p-4" style={{backgroundColor: '#0066CC', color: 'white'}}>
                <div className="flex items-center gap-2">
                  <Check size={20} />
                  <span className="ios-subtitle">
                    {result.updated} usuario{result.updated !== 1 ? 's' : ''} actualizado{result.updated !== 1 ? 's' : ''} exitosamente
                  </span>
                </div>
              </div>
            )}

            {result.duplicates.length > 0 && (
              <div className="ios-card p-4" style={{backgroundColor: 'var(--color-warning)', color: 'white'}}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} />
                  <span className="ios-subtitle">Usuarios Duplicados (No Creados):</span>
                </div>
                <ul className="text-sm space-y-1 ml-6">
                  {result.duplicates.map((dup, index) => (
                    <li key={index}>• {dup}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="ios-card p-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
                <div className="flex items-center gap-2 mb-2">
                  <X size={20} />
                  <span className="ios-subtitle">Errores de Validación:</span>
                </div>
                <ul className="text-sm space-y-1 ml-6">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setResult(null);
              setFile(null);
            }}
            className="ios-btn ios-btn-secondary mt-4"
          >
            Importar Otro Archivo
          </button>
        </div>
      )}
    </div>
  );
};

export default UserImport;