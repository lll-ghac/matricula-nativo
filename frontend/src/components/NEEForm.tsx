import React, { useEffect, useState } from 'react';
import type { TipoNee, CategoriasNee } from '../types';

interface NEEFormProps {
  selectedNees: number[]; // Array de IDs de NEE seleccionadas
  onNeeChange: (selectedIds: number[]) => void;
}

const NEEForm: React.FC<NEEFormProps> = ({ selectedNees = [], onNeeChange }) => {
  const [categoriasNee, setCategoriasNee] = useState<CategoriasNee>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar tipos de NEE desde el backend
  useEffect(() => {
    const fetchNees = async () => {
      try {
        setLoading(true);
        console.log('🔄 Cargando tipos de NEE...');

        const response = await fetch('/api/nee/categorias', {
          method: 'GET',
          credentials: 'include', // Importante: envía las cookies httpOnly automáticamente
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error del servidor:', errorText);
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data: CategoriasNee = await response.json();
        console.log('✅ NEE cargadas:', Object.keys(data).length, 'categorías');
        setCategoriasNee(data);
        setError(null);
      } catch (err) {
        console.error('❌ Error cargando NEE:', err);
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los tipos de NEE');
      } finally {
        setLoading(false);
      }
    };

    fetchNees();
  }, []);

  const handleCheckboxChange = (neeId: number) => {
    if (selectedNees.includes(neeId)) {
      // Remover si ya está seleccionado
      onNeeChange(selectedNees.filter(id => id !== neeId));
    } else {
      // Agregar si no está seleccionado
      onNeeChange([...selectedNees, neeId]);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="ios-spinner mx-auto mb-3"></div>
        <p className="ios-caption" style={{ color: 'var(--color-text-light)' }}>
          Cargando tipos de NEE...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ios-card bg-red-50 border-red-200 p-4">
        <p className="ios-body text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="ios-button-secondary mt-3"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Ordenar categorías
  const ordenCategorias = [
    'Sensorial',
    'Motora',
    'Intelectual',
    'Espectro Autista',
    'Lenguaje y Comunicación',
    'Aprendizaje',
    'Conductual',
    'Emocional',
    'Médicas',
    'Talento Específico',
    'Contextual',
    'Transversal',
    'Otras'
  ];

  const categoriasOrdenadas = ordenCategorias
    .filter(cat => categoriasNee[cat])
    .map(cat => ({ nombre: cat, nees: categoriasNee[cat] }));

  return (
    <div>
      <div className="mb-6">
        <p className="ios-caption" style={{ color: 'var(--color-text-light)' }}>
          Para estudiantes de Prekínder a 4° Medio. Seleccione todas las que correspondan.
        </p>
        {selectedNees.length > 0 && (
          <p className="ios-caption mt-2" style={{ color: 'var(--color-primary)' }}>
            {selectedNees.length} NEE seleccionada{selectedNees.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {categoriasOrdenadas.map(({ nombre, nees }) => (
        <div key={nombre} className="mb-8">
          <h4 className="ios-subtitle mb-4" style={{ color: 'var(--color-primary)' }}>
            {nombre}
          </h4>
          <div className="space-y-3">
            {nees.map((nee: TipoNee) => (
              <label key={nee.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedNees.includes(nee.id)}
                  onChange={() => handleCheckboxChange(nee.id)}
                  className="ios-checkbox"
                />
                <span className="ios-body">{nee.descripcion}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {categoriasOrdenadas.length === 0 && (
        <div className="text-center py-8">
          <p className="ios-body" style={{ color: 'var(--color-text-light)' }}>
            No hay tipos de NEE disponibles
          </p>
        </div>
      )}
    </div>
  );
};

export default NEEForm;
