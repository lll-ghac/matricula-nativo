import { useState, useRef } from 'react';
import { Search, User, Phone, Mail, MapPin, Loader2, X } from 'lucide-react';

interface SearchResult {
  id: number;
  rut: string | number;
  dv: string | number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  curso: string;
  letra: string;
  estado: string;
  apoderado_principal: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    celular: string;
    email: string;
    direccion: string;
  };
  apoderado_secundario: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    celular: string;
    email: string;
    direccion: string;
  };
}

interface SmartSearchProps {
  className?: string;
}

const SmartSearch: React.FC<SmartSearchProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = async (searchTerm: string) => {
    if (searchTerm.trim().length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/students/search?query=${encodeURIComponent(searchTerm)}&limit=15`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la búsqueda');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    inputRef.current?.focus();
  };

  // Format RUT display
  const formatRut = (rut: string | number, dv: string | number) => {
    if (!rut || !dv) return 'Sin RUT';
    const rutStr = String(rut);
    const dvStr = String(dv);
    const formattedRut = rutStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedRut}-${dvStr}`;
  };

  // Format full name
  const formatFullName = (nombres: string, apellidoP: string, apellidoM: string) => {
    return `${nombres} ${apellidoP} ${apellidoM || ''}`.trim();
  };

  // Check if guardian has data
  const hasGuardianData = (guardian: SearchResult['apoderado_principal']) => {
    return guardian.nombre || guardian.celular || guardian.email || guardian.direccion;
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-4 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-blue-500 text-white">
            <Search size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda Escolar</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Busca estudiantes por RUT, nombre o apellido
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Buscar por RUT (ej: 12345678), nombre o apellido..."
            className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
          {isLoading && (
            <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Search Tips */}
      {!query && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-800 mb-2">💡 Tips de búsqueda:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Por RUT:</strong> Escribe solo números (ej: 12345678)</li>
            <li>• <strong>Por nombre:</strong> Escribe el nombre o apellido del estudiante</li>
            <li>• <strong>Búsqueda múltiple:</strong> Combina palabras para filtrar mejor</li>
            <li>• Mínimo 3 caracteres para activar la búsqueda</li>
          </ul>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="font-medium text-red-800">Error en la búsqueda</span>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {query.length >= 3 && (
        <div className="space-y-4">
          {results.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <Search size={32} className="mx-auto mb-3 text-gray-300" />
              <p>No se encontraron estudiantes con "{query}"</p>
              <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            results.map((student) => (
              <div
                key={student.id}
                className="border border-gray-200 rounded-lg p-6 bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                {/* Student Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {formatFullName(student.nombres, student.apellido_paterno, student.apellido_materno)}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        RUT: {formatRut(student.rut, student.dv)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {student.curso}{student.letra}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{student.estado}</p>
                  </div>
                </div>

                {/* Guardians Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Primary Guardian */}
                  {hasGuardianData(student.apoderado_principal) && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <h4 className="font-medium text-blue-900">Apoderado Principal</h4>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-900">
                          {formatFullName(
                            student.apoderado_principal.nombre,
                            student.apoderado_principal.apellido_paterno,
                            student.apoderado_principal.apellido_materno
                          )}
                        </p>
                        {student.apoderado_principal.celular && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} />
                            <span>{student.apoderado_principal.celular}</span>
                          </div>
                        )}
                        {student.apoderado_principal.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            <span className="break-all">{student.apoderado_principal.email}</span>
                          </div>
                        )}
                        {student.apoderado_principal.direccion && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={14} />
                            <span>{student.apoderado_principal.direccion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Secondary Guardian */}
                  {hasGuardianData(student.apoderado_secundario) && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <h4 className="font-medium text-gray-700">Apoderado Secundario</h4>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-900">
                          {formatFullName(
                            student.apoderado_secundario.nombre,
                            student.apoderado_secundario.apellido_paterno,
                            student.apoderado_secundario.apellido_materno
                          )}
                        </p>
                        {student.apoderado_secundario.celular && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} />
                            <span>{student.apoderado_secundario.celular}</span>
                          </div>
                        )}
                        {student.apoderado_secundario.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            <span className="break-all">{student.apoderado_secundario.email}</span>
                          </div>
                        )}
                        {student.apoderado_secundario.direccion && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={14} />
                            <span>{student.apoderado_secundario.direccion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No guardians message */}
                  {!hasGuardianData(student.apoderado_principal) && !hasGuardianData(student.apoderado_secundario) && (
                    <div className="col-span-2 text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      <p className="text-sm">No hay información de apoderados registrada</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Results Count */}
          {results.length > 0 && (
            <div className="text-center text-sm text-gray-600">
              Mostrando {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;