const { prisma } = require('../config/db');
const { getAnioVigente, getErrorMessage } = require('../utils/helpers');

async function getGeneralStatistics(req, res) {
  try {
    const anioVigente = await getAnioVigente();
    if (!anioVigente) {
      return res.status(400).json({ message: 'No hay un año vigente configurado' });
    }

    const students = await prisma.alumnos.findMany({
      where: {
        anio_matricula: anioVigente,
        OR: [{ eliminado: null }, { eliminado: false }]
      },
      select: { genero: true, estado: true, nacionalidad: true }
    });

    const stats = {
      totalEstudiantes: students.length,
      totalMasculino: students.filter(s => s.genero?.toUpperCase().trim() === 'MASCULINO').length,
      totalFemenino: students.filter(s => s.genero?.toUpperCase().trim() === 'FEMENINO').length,
      porEstado: {
        Matriculado: students.filter(s => s.estado?.toUpperCase().trim() === 'MATRICULADO').length,
        Inscrito: students.filter(s => s.estado?.toUpperCase().trim() === 'INSCRITO').length,
        Incompleto: students.filter(s => s.estado?.toUpperCase().trim() === 'INCOMPLETO').length,
        Retirado: students.filter(s => s.estado?.toUpperCase().trim() === 'RETIRADO').length,
      },
      anioVigente
    };

    const nationalityMap = {};
    students.forEach(student => {
      const nationality = student.nacionalidad?.trim() || 'Sin especificar';
      const gender = student.genero?.toUpperCase().trim() || '';
      if (!nationalityMap[nationality]) {
        nationalityMap[nationality] = { nacionalidad: nationality, total: 0, masculino: 0, femenino: 0 };
      }
      nationalityMap[nationality].total++;
      if (gender === 'MASCULINO') nationalityMap[nationality].masculino++;
      if (gender === 'FEMENINO') nationalityMap[nationality].femenino++;
    });
    stats.porNacionalidad = Object.values(nationalityMap).sort((a, b) => b.total - a.total);

    res.json(stats);
  } catch (error) {
    console.error('[Statistics] ❌ Error al obtener estadísticas generales:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener estadísticas generales' });
  }
}

async function getCourseStatistics(req, res) {
  try {
    const anioVigente = await getAnioVigente();
    if (!anioVigente) {
      return res.status(400).json({ message: 'No hay un año vigente configurado' });
    }

    const students = await prisma.alumnos.findMany({
      where: {
        anio_matricula: anioVigente,
        OR: [{ eliminado: null }, { eliminado: false }]
      },
      select: { curso_base: true, letra: true, genero: true, nacionalidad: true },
      orderBy: [{ curso_base: 'asc' }, { letra: 'asc' }]
    });

    const courseMap = {};
    students.forEach(student => {
      const key = `${student.curso_base}_${student.letra}`;
      const gender = student.genero?.toUpperCase().trim() || '';
      const nationality = student.nacionalidad?.trim() || 'Sin especificar';
      if (!courseMap[key]) {
        courseMap[key] = {
          curso_base: student.curso_base,
          letra: student.letra,
          curso_completo: `${student.curso_base} ${student.letra}`,
          total: 0, masculino: 0, femenino: 0,
          nacionalidades: {}
        };
      }
      courseMap[key].total++;
      if (gender === 'MASCULINO') courseMap[key].masculino++;
      if (gender === 'FEMENINO') courseMap[key].femenino++;
      if (!courseMap[key].nacionalidades[nationality]) {
        courseMap[key].nacionalidades[nationality] = { nacionalidad: nationality, total: 0, masculino: 0, femenino: 0 };
      }
      courseMap[key].nacionalidades[nationality].total++;
      if (gender === 'MASCULINO') courseMap[key].nacionalidades[nationality].masculino++;
      if (gender === 'FEMENINO') courseMap[key].nacionalidades[nationality].femenino++;
    });

    const courseStats = Object.values(courseMap).map(course => ({
      ...course,
      nacionalidades: Object.values(course.nacionalidades).sort((a, b) => b.total - a.total)
    }));

    res.json(courseStats);
  } catch (error) {
    console.error('[Statistics] ❌ Error al obtener estadísticas por curso:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener estadísticas por curso' });
  }
}


// GET /api/statistics/autorizaciones-imagen
// Autorización anual de uso de imagen (sección 16 de la bitácora): resumen total y por curso
// de A (pedagógico), B (web/redes) y C (prensa) en sí / no / sin responder, cartas impresas y
// archivadas, y la lista de alumnos con alguna restricción. Solo alumnos matriculados del año vigente.
const USOS_IMAGEN = ['autoriza_imagen_pedagogico', 'autoriza_imagen_redes', 'autoriza_imagen_prensa'];

function resumenVacio() {
  const r = { total: 0, impresas: 0, archivadas: 0, con_restriccion: 0 };
  USOS_IMAGEN.forEach(u => { r[u] = { si: 0, no: 0, sin_responder: 0 }; });
  return r;
}

function sumarAlumno(r, a) {
  r.total++;
  USOS_IMAGEN.forEach(u => {
    if (a[u] === true) r[u].si++;
    else if (a[u] === false) r[u].no++;
    else r[u].sin_responder++;
  });
  if (a.documentos_impresos_en) r.impresas++;
  if (a.carta_imagen_archivada) r.archivadas++;
  if (USOS_IMAGEN.some(u => a[u] !== true)) r.con_restriccion++;
}

async function getImageAuthorizationStatistics(req, res) {
  try {
    const anioVigente = await getAnioVigente();
    if (!anioVigente) {
      return res.status(400).json({ message: 'No hay un año vigente configurado' });
    }

    const alumnos = await prisma.alumnos.findMany({
      where: {
        anio_matricula: anioVigente,
        estado: 'matriculado',
        OR: [{ eliminado: null }, { eliminado: false }]
      },
      select: {
        id: true, rut: true, dv: true, nombres: true, apellido_paterno: true, apellido_materno: true,
        curso_id: true, curso_base: true, letra: true,
        autoriza_imagen_pedagogico: true, autoriza_imagen_redes: true, autoriza_imagen_prensa: true,
        documentos_impresos_en: true, carta_imagen_archivada: true,
        cursos: { select: { nivel_educativo_id: true, grado_id: true, letra_id: true } }
      }
    });

    // Orden de cursos: nivel → grado → letra (como en la tabla cursos); sin curso, al final.
    const ordenCurso = a => a.cursos
      ? [a.cursos.nivel_educativo_id, a.cursos.grado_id, a.cursos.letra_id]
      : [999, 999, 999];
    const compararOrden = (x, y) => {
      for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    };

    const totales = resumenVacio();
    const porCurso = new Map();
    alumnos.forEach(a => {
      sumarAlumno(totales, a);
      const nombreCurso = [a.curso_base, a.letra].filter(Boolean).join(' ') || 'Sin curso';
      const clave = a.curso_id ? `id:${a.curso_id}` : `txt:${nombreCurso}`;
      if (!porCurso.has(clave)) porCurso.set(clave, { clave, curso: nombreCurso, orden: ordenCurso(a), ...resumenVacio() });
      sumarAlumno(porCurso.get(clave), a);
    });

    const cursos = [...porCurso.values()].sort((x, y) => compararOrden(x.orden, y.orden) || x.curso.localeCompare(y.curso, 'es'));
    const ordenPorClave = new Map(cursos.map((c, i) => [c.clave, i]));

    const lista = alumnos
      .map(a => {
        const nombreCurso = [a.curso_base, a.letra].filter(Boolean).join(' ') || 'Sin curso';
        return {
          id: Number(a.id),
          rut: a.rut,
          dv: a.dv,
          nombre: [a.apellido_paterno, a.apellido_materno, a.nombres].filter(Boolean).join(' '),
          curso: nombreCurso,
          curso_clave: a.curso_id ? `id:${a.curso_id}` : `txt:${nombreCurso}`,
          autoriza_imagen_pedagogico: a.autoriza_imagen_pedagogico,
          autoriza_imagen_redes: a.autoriza_imagen_redes,
          autoriza_imagen_prensa: a.autoriza_imagen_prensa,
          impresa: !!a.documentos_impresos_en,
          archivada: !!a.carta_imagen_archivada
        };
      })
      .sort((x, y) => (ordenPorClave.get(x.curso_clave) - ordenPorClave.get(y.curso_clave)) || x.nombre.localeCompare(y.nombre, 'es'));

    res.json({
      anio: anioVigente,
      totales,
      cursos: cursos.map(({ orden, ...c }) => c),
      alumnos: lista
    });
  } catch (error) {
    console.error('Error en GET /api/statistics/autorizaciones-imagen:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener estadísticas de autorizaciones' });
  }
}

module.exports = { getGeneralStatistics, getCourseStatistics, getImageAuthorizationStatistics };
