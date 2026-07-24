const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { Prisma } = require('@prisma/client');
const { getAnioVigente } = require('../utils/helpers');

async function getAnioFiltro(query_anio) {
  if (query_anio) return parseInt(query_anio);
  return (await getAnioVigente()) || new Date().getFullYear();
}

// GET /api/reports/cursos-por-nivel
router.get('/cursos-por-nivel', async (req, res) => {
  try {
    const anioFiltro = await getAnioFiltro(req.query.anio_academico);

    const data = await prisma.$queryRaw`
      SELECT * FROM cursos_resumen_por_nivel WHERE anio_academico = ${anioFiltro}
    `;

    const totales = data.reduce((acc, nivel) => ({
      total_cursos: acc.total_cursos + Number(nivel.total_cursos),
      capacidad_total: acc.capacidad_total + Number(nivel.capacidad_total),
      alumnos_matriculados: acc.alumnos_matriculados + Number(nivel.alumnos_matriculados),
      alumnos_pie: acc.alumnos_pie + Number(nivel.alumnos_pie),
      cupos_disponibles: acc.cupos_disponibles + Number(nivel.cupos_disponibles)
    }), { total_cursos: 0, capacidad_total: 0, alumnos_matriculados: 0, alumnos_pie: 0, cupos_disponibles: 0 });

    res.json({
      success: true,
      anio_academico: anioFiltro,
      data,
      totales,
      porcentaje_ocupacion_general: totales.capacidad_total > 0
        ? Math.round((totales.alumnos_matriculados / totales.capacidad_total) * 100 * 10) / 10
        : 0
    });
  } catch (error) {
    console.error('Error al obtener reporte por nivel:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reporte por nivel', details: error.message });
  }
});

// GET /api/reports/alumnos-sin-curso
router.get('/alumnos-sin-curso', async (req, res) => {
  try {
    const { anio_matricula } = req.query;

    let data;
    if (anio_matricula) {
      data = await prisma.$queryRaw`SELECT * FROM alumnos_sin_curso WHERE anio_matricula = ${parseInt(anio_matricula)}`;
    } else {
      data = await prisma.$queryRaw`SELECT * FROM alumnos_sin_curso`;
    }

    const porAnio = data.reduce((acc, alumno) => {
      const anio = alumno.anio_matricula;
      if (!acc[anio]) acc[anio] = { anio, total: 0, alumnos: [] };
      acc[anio].total++;
      acc[anio].alumnos.push(alumno);
      return acc;
    }, {});

    res.json({
      success: true,
      total_sin_curso: data.length,
      filters: { anio_matricula: anio_matricula ? parseInt(anio_matricula) : null },
      por_anio: Object.values(porAnio).sort((a, b) => b.anio - a.anio),
      data
    });
  } catch (error) {
    console.error('Error al obtener alumnos sin curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener alumnos sin curso', details: error.message });
  }
});

// GET /api/reports/ocupacion-cursos
router.get('/ocupacion-cursos', async (req, res) => {
  try {
    const { nivel_educativo_id, alerta } = req.query;
    const anioFiltro = await getAnioFiltro(req.query.anio_academico);

    const conditions = [
      Prisma.sql`anio_academico = ${anioFiltro}`,
      Prisma.sql`estado = 'activo'`
    ];
    if (nivel_educativo_id) conditions.push(Prisma.sql`nivel_educativo_id = ${parseInt(nivel_educativo_id)}`);

    const data = await prisma.$queryRaw(Prisma.sql`
      SELECT * FROM cursos_completo
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY codigo_sige ASC, grado_orden ASC, letra_orden ASC
    `);

    let cursosConProblemas = [];
    const cursosProcesados = data.map(curso => {
      const pct = Number(curso.porcentaje_ocupacion) || 0;
      const matriculados = Number(curso.alumnos_matriculados) || 0;
      let statusOcupacion = 'normal';
      const alertas = [];

      if (pct >= 100) { statusOcupacion = 'lleno'; alertas.push('Curso completo'); }
      else if (pct >= 90) { statusOcupacion = 'casi_lleno'; alertas.push('Curso casi completo (>90%)'); }
      else if (pct < 30 && matriculados > 0) { statusOcupacion = 'muy_vacio'; alertas.push('Curso con baja matrícula (<30%)'); }
      else if (matriculados === 0) { statusOcupacion = 'vacio'; alertas.push('Curso sin alumnos'); }

      const cursoConStatus = { ...curso, status_ocupacion: statusOcupacion, alertas };
      if (alertas.length > 0) cursosConProblemas.push(cursoConStatus);
      return cursoConStatus;
    });

    const dataFinal = alerta === 'true' ? cursosConProblemas : cursosProcesados;

    res.json({
      success: true,
      anio_academico: anioFiltro,
      total_cursos: dataFinal.length,
      cursos_con_alertas: cursosConProblemas.length,
      filters: { nivel_educativo_id: nivel_educativo_id ? parseInt(nivel_educativo_id) : null, solo_alertas: alerta === 'true' },
      data: dataFinal
    });
  } catch (error) {
    console.error('Error al obtener reporte de ocupación:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reporte de ocupación', details: error.message });
  }
});

// GET /api/reports/distribucion-pie
router.get('/distribucion-pie', async (req, res) => {
  try {
    const anioFiltro = await getAnioFiltro(req.query.anio_academico);

    const data = await prisma.$queryRaw`
      SELECT * FROM cursos_completo
      WHERE anio_academico = ${anioFiltro} AND estado = 'activo'
      ORDER BY codigo_sige ASC, grado_orden ASC, letra_orden ASC
    `;

    const cursosRegulares = data.filter(c => Number(c.codigo_sige) !== 299);
    const cursosPIE = data.filter(c => Number(c.codigo_sige) === 299);

    const totalAlumnosPIEEnRegulares = cursosRegulares.reduce((sum, c) => sum + Number(c.alumnos_pie), 0);
    const totalAlumnosEnCursosPIE = cursosPIE.reduce((sum, c) => sum + Number(c.alumnos_matriculados), 0);

    res.json({
      success: true,
      anio_academico: anioFiltro,
      resumen: {
        total_alumnos_pie: totalAlumnosPIEEnRegulares + totalAlumnosEnCursosPIE,
        pie_en_cursos_regulares: totalAlumnosPIEEnRegulares,
        pie_en_cursos_299: totalAlumnosEnCursosPIE,
        total_cursos_pie_299: cursosPIE.length
      },
      cursos_regulares_con_pie: cursosRegulares
        .filter(c => Number(c.alumnos_pie) > 0)
        .map(c => ({
          codigo: c.codigo,
          grado: c.grado_nombre_corto,
          letra: c.letra,
          total_alumnos: Number(c.alumnos_matriculados),
          alumnos_pie: Number(c.alumnos_pie),
          porcentaje_pie: Number(c.alumnos_matriculados) > 0
            ? Math.round((Number(c.alumnos_pie) / Number(c.alumnos_matriculados)) * 100 * 10) / 10
            : 0
        })),
      cursos_pie_opcion_4: cursosPIE.map(c => ({
        codigo: c.codigo,
        grado: c.grado_nombre_corto,
        letra: c.letra,
        total_alumnos: Number(c.alumnos_matriculados),
        capacidad: c.capacidad_maxima,
        cupos_disponibles: Number(c.cupos_disponibles),
        profesor_jefe: c.profesor_jefe_nombre
      }))
    });
  } catch (error) {
    console.error('Error al obtener reporte PIE:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reporte de distribución PIE', details: error.message });
  }
});

// GET /api/reports/profesores-cursos
router.get('/profesores-cursos', async (req, res) => {
  try {
    const anioFiltro = await getAnioFiltro(req.query.anio_academico);

    const data = await prisma.$queryRaw`
      SELECT * FROM cursos_completo
      WHERE anio_academico = ${anioFiltro} AND estado = 'activo'
      ORDER BY COALESCE(profesor_jefe_nombre, 'ZZZZ') ASC, codigo ASC
    `;

    const porProfesor = data.reduce((acc, curso) => {
      const profesorNombre = curso.profesor_jefe_nombre || 'Sin asignar';
      if (!acc[profesorNombre]) {
        acc[profesorNombre] = {
          profesor_id: curso.profesor_jefe_id,
          profesor_nombre: profesorNombre,
          profesor_username: curso.profesor_jefe_username,
          total_cursos: 0,
          total_alumnos: 0,
          cursos: []
        };
      }
      acc[profesorNombre].total_cursos++;
      acc[profesorNombre].total_alumnos += Number(curso.alumnos_matriculados);
      acc[profesorNombre].cursos.push({
        codigo: curso.codigo,
        grado: curso.grado_nombre_corto,
        letra: curso.letra,
        jornada: curso.jornada,
        alumnos: Number(curso.alumnos_matriculados),
        capacidad: curso.capacidad_maxima,
        sala: curso.sala
      });
      return acc;
    }, {});

    const profesores = Object.values(porProfesor);
    const cursosAsignados = profesores.filter(p => p.profesor_id !== null);
    const cursosSinProfesor = profesores.filter(p => p.profesor_id === null);

    res.json({
      success: true,
      anio_academico: anioFiltro,
      total_profesores: cursosAsignados.length,
      total_cursos_sin_profesor: cursosSinProfesor.reduce((sum, p) => sum + p.total_cursos, 0),
      profesores_con_cursos: cursosAsignados,
      cursos_sin_profesor: cursosSinProfesor.length > 0 ? cursosSinProfesor[0].cursos : []
    });
  } catch (error) {
    console.error('Error al obtener reporte de profesores:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reporte de profesores', details: error.message });
  }
});

module.exports = router;
