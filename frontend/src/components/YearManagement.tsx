import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle } from 'lucide-react';

interface YearData {
  id: number;
  anio: number;
  activo: boolean;
  creado_por: string;
  creado_en: string;
}

const YearManagement: React.FC = () => {
  const [years, setYears] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const response = await fetch('/api/years', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar años académicos');
      }

      const data = await response.json();
      setYears(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newYear) {
      setError('El año es obligatorio');
      return;
    }

    const yearNumber = parseInt(newYear);
    if (isNaN(yearNumber) || yearNumber < 2020 || yearNumber > 2050) {
      setError('Ingrese un año válido (2020-2050)');
      return;
    }

    try {
      const response = await fetch('/api/years', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ anio: yearNumber })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al agregar año');
      }

      setSuccess('Año agregado exitosamente');
      setNewYear('');
      fetchYears(); // Recargar la lista
    } catch (err: any) {
      setError(err.message || 'Error al agregar año');
    }
  };

  const handleSetActive = async (yearId: number) => {
    try {
      const response = await fetch(`/api/years/${yearId}/activate`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar año vigente');
      }

      setSuccess('Año vigente actualizado exitosamente');
      fetchYears(); // Recargar la lista
    } catch (err: any) {
      setError(err.message || 'Error al actualizar año vigente');
    }
  };

  if (loading) {
    return (
      <div className="ios-card p-8 text-center">
        <Calendar size={48} className="mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
        <p className="ios-title">Cargando años académicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Calendar size={32} style={{color: 'var(--color-primary)'}} />
        <h3 className="ios-title">Gestión de Año Vigente</h3>
      </div>

      {/* Add New Year */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-4">Agregar Nuevo Año Académico</h4>
        <form onSubmit={handleAddYear} className="ios-grid ios-grid-2">
          <div>
            <label className="ios-form-label">Año Académico <span style={{color: 'var(--color-error)'}}>*</span></label>
            <input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="ios-form-input"
              placeholder="Ej: 2026"
              min="2020"
              max="2050"
              required
            />
            <p className="ios-caption mt-1" style={{color: 'var(--color-text-light)'}}>
              El año se creará como activo automáticamente
            </p>
          </div>
          <div className="flex items-end">
            <button type="submit" className="ios-btn ios-btn-primary w-full">
              <Plus size={20} className="mr-2" />
              Agregar Año
            </button>
          </div>
        </form>

        {error && (
          <div className="ios-card p-4 mt-4" style={{backgroundColor: 'var(--color-error)', color: 'white'}}>
            <p className="ios-body">{error}</p>
          </div>
        )}

        {success && (
          <div className="ios-card p-4 mt-4" style={{backgroundColor: 'var(--color-success)', color: 'white'}}>
            <p className="ios-body">{success}</p>
          </div>
        )}
      </div>

      {/* Years List */}
      <div className="ios-card p-6">
        <h4 className="ios-subtitle mb-6">Años Académicos Registrados</h4>
        
        {years.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-light)'}} />
            <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
              No hay años académicos registrados.
            </p>
            <p className="ios-caption mt-2" style={{color: 'var(--color-text-light)'}}>
              Agregue el primer año académico para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {years.map((year) => (
              <div
                key={year.id}
                className={`ios-card p-4 flex items-center justify-between ${
                  year.activo ? 'border-2' : ''
                }`}
                style={year.activo ? {borderColor: 'var(--color-success)'} : {}}
              >
                <div className="flex items-center space-x-4">
                  {year.activo && (
                    <CheckCircle size={24} style={{color: 'var(--color-success)'}} />
                  )}
                  <div>
                    <h5 className="ios-subtitle">
                      Año {year.anio}
                      {year.activo && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full" style={{
                          backgroundColor: 'var(--color-success)', 
                          color: 'white'
                        }}>
                          VIGENTE
                        </span>
                      )}
                    </h5>
                    <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
                      Creado por {year.creado_por} el {new Date(year.creado_en).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {!year.activo && (
                  <button
                    onClick={() => handleSetActive(year.id)}
                    className="ios-btn ios-btn-secondary"
                  >
                    Activar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="ios-card p-6" style={{backgroundColor: 'var(--color-primary-light)'}}>
        <h4 className="ios-subtitle mb-3">ℹ️ Información Importante</h4>
        <ul className="space-y-2 ios-body" style={{color: 'var(--color-secondary)'}}>
          <li>• Solo puede haber un año académico activo (vigente) a la vez</li>
          <li>• Al activar un año, el anterior se desactiva automáticamente</li>
          <li>• Las matrículas se guardan en la tabla correspondiente al año vigente</li>
          <li>• El sistema buscará estudiantes del año anterior para precarga</li>
        </ul>
      </div>
    </div>
  );
};

export default YearManagement;