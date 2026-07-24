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

module.exports = { getGeneralStatistics, getCourseStatistics };
