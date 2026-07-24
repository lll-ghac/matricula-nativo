import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Users, GraduationCap, Search, RefreshCw } from 'lucide-react';

interface ValidationResult {
  type: 'student' | 'guardian';
  id: number;
  rut: string;
  dv: string;
  name: string;
  isValid: boolean;
  error?: string;
  table: string;
}

const RutValidator: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [stats, setStats] = useState({
    totalChecked: 0,
    validRuts: 0,
    invalidRuts: 0,
    students: 0,
    guardians: 0
  });

  // Función para validar RUT chileno
  const validateChileanRut = (rut: string, dv: string): boolean => {
    if (!rut || !dv) return false;
    
    // Limpiar RUT (quitar puntos y espacios)
    const cleanRut = rut.toString().replace(/\./g, '').replace(/\s/g, '');
    const cleanDv = dv.toString().toUpperCase();
    
    // Verificar que el RUT sea numérico
    if (!/^\d+$/.test(cleanRut)) return false;
    
    // Verificar que el DV sea válido (0-9 o K)
    if (!/^[0-9K]$/.test(cleanDv)) return false;
    
    // Calcular DV
    let sum = 0;
    let multiplier = 2;
    
    // Recorrer el RUT de derecha a izquierda
    for (let i = cleanRut.length - 1; i >= 0; i--) {
      sum += parseInt(cleanRut[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const remainder = sum % 11;
    let calculatedDv;
    
    if (remainder === 1) {
      calculatedDv = 'K';
    } else if (remainder === 0) {
      calculatedDv = '0';
    } else {
      calculatedDv = (11 - remainder).toString();
    }
    
    return calculatedDv === cleanDv;
  };

  const validateAllRuts = async () => {
    setIsValidating(true);
    setValidationResults([]);
    setStats({ totalChecked: 0, validRuts: 0, invalidRuts: 0, students: 0, guardians: 0 });
    
    try {
      const response = await fetch('/api/admin/validate-ruts', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al obtener datos para validación');
      }

      const data = await response.json();
      const results: ValidationResult[] = [];
      let validCount = 0;
      let invalidCount = 0;
      let studentsCount = 0;
      let guardiansCount = 0;

      // Validar estudiantes
      if (data.students) {
        data.students.forEach((student: any) => {
          studentsCount++;
          const isValid = validateChileanRut(student.rut, student.dv);
          if (isValid) validCount++;
          else invalidCount++;

          results.push({
            type: 'student',
            id: student.id,
            rut: student.rut,
            dv: student.dv,
            name: `${student.nombres || ''} ${student.apellido_paterno || ''}`.trim(),
            isValid,
            error: isValid ? undefined : 'RUT inválido según algoritmo chileno',
            table: `alumnos_${new Date().getFullYear()}`
          });
        });
      }

      // Validar apoderados
      if (data.guardians) {
        data.guardians.forEach((guardian: any) => {
          // Solo validar si tiene RUT (algunos pueden tener DNI o pasaporte)
          if (guardian.rut && guardian.dv) {
            guardiansCount++;
            const isValid = validateChileanRut(guardian.rut, guardian.dv);
            if (isValid) validCount++;
            else invalidCount++;

            results.push({
              type: 'guardian',
              id: guardian.id,
              rut: guardian.rut,
              dv: guardian.dv,
              name: `${guardian.nombre || ''} ${guardian.apellido_paterno || ''}`.trim(),
              isValid,
              error: isValid ? undefined : 'RUT inválido según algoritmo chileno',
              table: 'apoderados_ok'
            });
          }
        });
      }

      setValidationResults(results);
      setStats({
        totalChecked: studentsCount + guardiansCount,
        validRuts: validCount,
        invalidRuts: invalidCount,
        students: studentsCount,
        guardians: guardiansCount
      });

    } catch (error) {
      console.error('Error en validación:', error);
      alert('Error al realizar la validación: ' + error);
    } finally {
      setIsValidating(false);
    }
  };

  const invalidResults = validationResults.filter(r => !r.isValid);
  const validResults = validationResults.filter(r => r.isValid);

  return (
    <div className="ios-form-section">
      <div className="flex items-center space-x-4 mb-6">
        <Shield size={32} style={{color: 'var(--color-primary)'}} />
        <div>
          <h3 className="ios-title-large">Validador de RUT</h3>
          <p className="ios-caption" style={{color: 'var(--color-text-light)'}}>
            Identifica RUTs mal digitados en estudiantes y apoderados
          </p>
        </div>
      </div>

      {/* Panel de control */}
      <div className="ios-card p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="ios-subtitle mb-2">Validación de Integridad</h4>
            <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
              Verifica que todos los RUTs cumplan con el algoritmo de validación chileno
            </p>
          </div>
          <button
            onClick={validateAllRuts}
            disabled={isValidating}
            className={`ios-btn ${isValidating ? 'ios-btn-secondary' : 'ios-btn-primary'} flex items-center space-x-2`}
          >
            {isValidating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Validar Todos los RUTs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats.totalChecked > 0 && (
        <div className="ios-grid ios-grid-4 mb-6">
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-primary)'}}>{stats.totalChecked}</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>RUTs Verificados</div>
          </div>
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-success)'}}>{stats.validRuts}</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>RUTs Válidos</div>
          </div>
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-error)'}}>{stats.invalidRuts}</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>RUTs Inválidos</div>
          </div>
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{color: 'var(--color-warning)'}}>
              {stats.totalChecked > 0 ? ((stats.invalidRuts / stats.totalChecked) * 100).toFixed(1) : 0}%
            </div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>Error Rate</div>
          </div>
        </div>
      )}

      {/* Resumen por categoría */}
      {stats.totalChecked > 0 && (
        <div className="ios-grid ios-grid-2 mb-6">
          <div className="ios-card p-6">
            <div className="flex items-center space-x-3 mb-3">
              <GraduationCap size={24} style={{color: 'var(--color-primary)'}} />
              <h4 className="ios-subtitle">Estudiantes</h4>
            </div>
            <div className="text-lg font-semibold mb-1">{stats.students} RUTs verificados</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>
              En tabla alumnos_{new Date().getFullYear()}
            </div>
          </div>
          <div className="ios-card p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Users size={24} style={{color: 'var(--color-primary)'}} />
              <h4 className="ios-subtitle">Apoderados</h4>
            </div>
            <div className="text-lg font-semibold mb-1">{stats.guardians} RUTs verificados</div>
            <div className="ios-caption" style={{color: 'var(--color-text-light)'}}>
              En tabla apoderados_ok (solo RUTs chilenos)
            </div>
          </div>
        </div>
      )}

      {/* Resultados - RUTs Inválidos */}
      {invalidResults.length > 0 && (
        <div className="ios-card mb-6">
          <div className="p-6 border-b" style={{borderColor: 'var(--color-border)'}}>
            <div className="flex items-center space-x-3">
              <AlertTriangle size={24} style={{color: 'var(--color-error)'}} />
              <h4 className="ios-subtitle">RUTs Inválidos Encontrados ({invalidResults.length})</h4>
            </div>
            <p className="ios-body mt-2" style={{color: 'var(--color-text-light)'}}>
              Estos RUTs no cumplen con el algoritmo de validación chileno y requieren corrección.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{backgroundColor: 'var(--color-card)'}}>
                  <th className="py-3 px-4 text-left ios-caption font-semibold">Tipo</th>
                  <th className="py-3 px-4 text-left ios-caption font-semibold">RUT</th>
                  <th className="py-3 px-4 text-left ios-caption font-semibold">Nombre</th>
                  <th className="py-3 px-4 text-left ios-caption font-semibold">Tabla</th>
                  <th className="py-3 px-4 text-left ios-caption font-semibold">ID</th>
                </tr>
              </thead>
              <tbody>
                {invalidResults.map((result, index) => (
                  <tr key={index} className="border-b" style={{borderColor: 'var(--color-border)'}}>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 ios-caption font-semibold rounded-full text-white ${
                        result.type === 'student' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                        {result.type === 'student' ? 'Estudiante' : 'Apoderado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-red-600 font-semibold">
                      {result.rut}-{result.dv}
                    </td>
                    <td className="py-3 px-4 ios-body">{result.name}</td>
                    <td className="py-3 px-4 ios-caption" style={{color: 'var(--color-text-light)'}}>
                      {result.table}
                    </td>
                    <td className="py-3 px-4 ios-caption font-mono" style={{color: 'var(--color-text-light)'}}>
                      #{result.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultados - RUTs Válidos (solo mostrar resumen si hay resultados) */}
      {validResults.length > 0 && invalidResults.length > 0 && (
        <div className="ios-card">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle size={24} style={{color: 'var(--color-success)'}} />
              <h4 className="ios-subtitle">RUTs Válidos ({validResults.length})</h4>
            </div>
            <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
              Estos RUTs están correctamente digitados y cumplen con el algoritmo de validación chileno.
            </p>
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {validationResults.length === 0 && !isValidating && (
        <div className="ios-card p-8 text-center">
          <Shield size={48} className="mx-auto mb-4" style={{color: 'var(--color-text-light)'}} />
          <h4 className="ios-subtitle mb-2">Validador de RUT Listo</h4>
          <p className="ios-body" style={{color: 'var(--color-text-light)'}}>
            Haz clic en "Validar Todos los RUTs" para identificar RUTs mal digitados en el sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default RutValidator;