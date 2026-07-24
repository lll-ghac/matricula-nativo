const { prisma } = require('../config/db');

async function getAnioVigente() {
  const row = await prisma.anio_vigente.findFirst({ where: { activo: true } });
  if (!row) {
    console.error('[DB] No se encontró año vigente activo');
    return null;
  }
  return row.anio;
}

function getErrorMessage(error) {
  if (!error) return 'Error desconocido';
  const codes = {
    '23505': 'Ya existe un registro con esos datos únicos (posible duplicado)',
    '23503': 'No se puede realizar la operación porque viola una restricción de clave foránea',
    '23502': 'Faltan campos obligatorios',
    '42P01': 'La tabla no existe'
  };
  const code = error.code || error.error_code;
  if (code && codes[code]) return codes[code];
  return error.message || 'Error en la base de datos';
}

function normalizeAlumnoData(alumnoData) {
  const normalized = { ...alumnoData };

  if (normalized.genero) {
    const map = { M: 'Masculino', F: 'Femenino', Masculino: 'Masculino', Femenino: 'Femenino' };
    normalized.genero = map[normalized.genero] || normalized.genero;
  }

  if (normalized.fecha_nacimiento) {
    const m = String(normalized.fecha_nacimiento).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) normalized.fecha_nacimiento = `${m[3]}-${m[2]}-${m[1]}`;
  }

  if (!normalized.region || normalized.region.trim() === '') normalized.region = 'Antofagasta';
  if (!normalized.comuna || normalized.comuna.trim() === '') normalized.comuna = 'Antofagasta';

  delete normalized.nivel_educacional_asociado;
  delete normalized.situacion_laboral_asociado;
  delete normalized.trabaja_principalmente_asociado;

  Object.keys(normalized).forEach(k => {
    if (normalized[k] === '' || normalized[k] === undefined) normalized[k] = null;
  });

  return normalized;
}

function normalizeApoderadoData(apoderadoData) {
  const normalized = { ...apoderadoData };

  if (normalized.genero) {
    const map = { M: 'Masculino', F: 'Femenino', Masculino: 'Masculino', Femenino: 'Femenino' };
    normalized.genero = map[normalized.genero] || normalized.genero;
  }

  if (normalized.region && normalized.region.startsWith('Región de ')) {
    normalized.region = normalized.region.replace('Región de ', '');
  }

  if (normalized.fecha_nacimiento) {
    const m = String(normalized.fecha_nacimiento).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) normalized.fecha_nacimiento = `${m[3]}-${m[2]}-${m[1]}`;
  }

  delete normalized.es_principal;
  delete normalized.es_suplente;
  delete normalized.orden;
  delete normalized.parentesco;
  delete normalized.id;
  delete normalized.creado_en;
  delete normalized.actualizado_en;

  Object.keys(normalized).forEach(k => {
    if (normalized[k] === '' || normalized[k] === undefined) normalized[k] = null;
  });

  return normalized;
}

function separarApoderadosPorTipo(apoderados = [], alumnoId = null) {
  if (!apoderados || apoderados.length === 0) return { principales: [], suplentes: [] };
  const principales = [];
  const suplentes = [];
  apoderados.forEach(apoderado => {
    if (apoderado.alumno_apoderado && Array.isArray(apoderado.alumno_apoderado)) {
      const relacion = alumnoId
        ? apoderado.alumno_apoderado.find(r => r.alumno_id === parseInt(alumnoId))
        : apoderado.alumno_apoderado[0];
      if (relacion) {
        const ap = { ...apoderado, tipo_relacion: relacion.tipo_relacion, parentesco: relacion.parentesco || 'No especificado', es_principal: relacion.tipo_relacion === 'principal', es_suplente: relacion.tipo_relacion === 'suplente', alumno_apoderado: undefined };
        if (relacion.tipo_relacion === 'principal') principales.push(ap);
        else if (relacion.tipo_relacion === 'suplente') suplentes.push(ap);
      }
    } else if (apoderado.tipo_relacion) {
      if (apoderado.tipo_relacion === 'principal') principales.push(apoderado);
      else if (apoderado.tipo_relacion === 'suplente') suplentes.push(apoderado);
    } else if (apoderado.es_principal) principales.push(apoderado);
    else if (apoderado.es_suplente) suplentes.push(apoderado);
  });
  return { principales, suplentes };
}

// Prevent CSV injection: fields starting with =+-@ can be interpreted as formulas in Excel/Sheets
function sanitizeCSVField(value) {
  const s = String(value == null ? '' : value);
  return /^[=+\-@\t|]/.test(s) ? "'" + s : s;
}

module.exports = {
  getAnioVigente,
  getErrorMessage,
  normalizeAlumnoData,
  normalizeApoderadoData,
  separarApoderadosPorTipo,
  sanitizeCSVField
};
