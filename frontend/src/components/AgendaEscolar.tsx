import React, { useState, useEffect } from 'react';
import { Search, Phone, User, GraduationCap } from 'lucide-react';

interface Student {
  id: number;
  rut: string | number;
  dv: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  curso_base: string;
  letra: string;
  apoderados: Apoderado[];
}

interface Apoderado {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  celular: string;
  email?: string;
  parentesco: string;
  es_principal: boolean;
}

const AgendaEscolar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedLetra, setSelectedLetra] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cursos = ['Pre-Kinder', 'Kinder', '1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico', '7° Básico', '8° Básico'];
  const letras = ['A', 'B', 'C', 'D'];

  // Cargar estudiantes desde el backend
  const searchStudents = async () => {
    // Buscar solo si hay 3+ caracteres O si hay filtros seleccionados
    if (searchTerm.length < 3 && !selectedCurso && !selectedLetra) {
      setFilteredStudents([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.length >= 3) params.append('search', searchTerm);
      if (selectedCurso) params.append('curso', selectedCurso);
      if (selectedLetra) params.append('letra', selectedLetra);

      console.log('🔍 Buscando estudiantes con params:', params.toString());
      const response = await fetch(`/api/students/agenda?${params}`, {
        credentials: 'include'
      });
      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Estudiantes encontrados:', data.length);
        setFilteredStudents(data);
      } else {
        console.error('❌ Error en response:', response.status);
      }
    } catch (error) {
      console.error('Error buscando estudiantes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchStudents();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedCurso, selectedLetra]);

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const formatRut = (rut: string | number, dv: string) => {
    const rutString = String(rut);
    const cleanRut = rutString.replace(/[^\d]/g, '');
    const formattedRut = cleanRut.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedRut}-${dv}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ios-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
            <Search className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Agenda Telefónica</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>Busca estudiantes por RUT, nombre o apellido</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="ios-card p-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2" size={24} style={{ color: 'var(--color-primary)' }} />
          <input
            type="text"
            placeholder="Buscar por RUT (ej: 12345678), nombre o apellido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            style={{
              backgroundColor: 'var(--color-input-bg)',
              border: '3px solid var(--color-border)',
              borderRadius: 'var(--radius-medium)',
              padding: '16px 16px 16px 56px',
              fontSize: '18px',
              color: 'var(--color-foreground)',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)';
              e.target.style.boxShadow = '0 0 0 4px var(--color-primary-light)';
              e.target.style.backgroundColor = 'var(--color-card-elevated)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)';
              e.target.style.boxShadow = 'none';
              e.target.style.backgroundColor = 'var(--color-input-bg)';
            }}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            style={{
              backgroundColor: 'var(--color-input-bg)',
              border: '3px solid var(--color-border)',
              borderRadius: 'var(--radius-medium)',
              padding: '14px 16px',
              fontSize: '17px',
              color: 'var(--color-foreground)',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2334495e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '24px',
              paddingRight: '48px'
            }}
          >
            <option value="">Todos los cursos</option>
            {cursos.map((curso) => (
              <option key={curso} value={curso}>{curso}</option>
            ))}
          </select>

          <select
            value={selectedLetra}
            onChange={(e) => setSelectedLetra(e.target.value)}
            style={{
              backgroundColor: 'var(--color-input-bg)',
              border: '3px solid var(--color-border)',
              borderRadius: 'var(--radius-medium)',
              padding: '14px 16px',
              fontSize: '17px',
              color: 'var(--color-foreground)',
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2334495e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '24px',
              paddingRight: '48px'
            }}
          >
            <option value="">Todas las letras</option>
            {letras.map((letra) => (
              <option key={letra} value={letra}>{letra}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tips */}
      {filteredStudents.length === 0 && !isLoading && (
        <div className="ios-card p-6" style={{ backgroundColor: 'var(--color-primary-light)', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            💡 Tips de búsqueda:
          </h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-foreground)' }}>
            <li>• <strong>Por RUT:</strong> Escribe solo números (ej: 12345678)</li>
            <li>• <strong>Por nombre:</strong> Escribe el nombre o apellido del estudiante</li>
            <li>• <strong>Búsqueda múltiple:</strong> Combina palabras para filtrar mejor</li>
            <li>• Mínimo 3 caracteres para activar la búsqueda</li>
          </ul>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="ios-card p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-text-light)' }}>Buscando...</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="ios-card p-4 hover:shadow-lg transition-shadow">
              {/* Student Info */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                  <User className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                    {student.nombres} {student.apellido_paterno} {student.apellido_materno}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-light)' }}>
                    RUT: {formatRut(student.rut, student.dv)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <GraduationCap size={16} style={{ color: 'var(--color-text-light)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {student.curso_base} {student.letra}
                    </span>
                  </div>
                </div>
              </div>

              {/* Apoderados */}
              <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                {student.apoderados && student.apoderados.length > 0 ? (
                  student.apoderados.map((apoderado, index) => (
                    <div key={index} className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-background)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {apoderado.nombre} {apoderado.apellido_paterno} {apoderado.apellido_materno}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
                            {apoderado.parentesco} {apoderado.es_principal && '(Principal)'}
                          </p>
                          {apoderado.email && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
                              {apoderado.email}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleCall(apoderado.celular)}
                          className="flex-shrink-0 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Phone size={18} />
                          <span className="hidden sm:inline">{apoderado.celular}</span>
                          <span className="sm:hidden">Llamar</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-card)', border: '2px solid var(--color-warning)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-warning)', fontWeight: '600' }}>
                      ⚠️ Este estudiante no tiene apoderados registrados
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgendaEscolar;

