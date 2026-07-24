const { prisma } = require('../config/db');
const { getErrorMessage } = require('../utils/helpers');

async function getCourses(req, res) {
  try {
    const courses = [
      'Pre-Kinder', 'Kinder',
      '1° Básico', '2° Básico', '3° Básico', '4° Básico',
      '5° Básico', '6° Básico', '7° Básico', '8° Básico',
      '1° Medio', '2° Medio', '3° Medio', '4° Medio',
      'OP4 - 1° Básico', 'OP4 - 2° Básico', 'OP4 - 3° Básico', 'OP4 - 4° Básico'
    ];
    const letters = ['A', 'B', 'C', 'D'];
    const availableCourses = [];
    courses.forEach(course => {
      letters.forEach(letter => {
        availableCourses.push({ base: course, letra: letter, full: `${course} ${letter}` });
      });
    });
    res.json({ courses, letters, availableCourses });
  } catch (error) {
    console.error('[Courses] ❌ Error al obtener cursos:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener cursos' });
  }
}

async function getTeachers(req, res) {
  try {
    const [teachers, assignedCourses] = await Promise.all([
      prisma.usuarios.findMany({
        where: { rol: 'profesor' },
        select: { id: true, username: true, nombre: true, rol: true, estado: true }
      }),
      prisma.cursos_asignados.findMany({
        select: { usuario_id: true, curso_base: true, letra: true }
      })
    ]);

    const teachersWithCourses = teachers.map(teacher => {
      const courses = assignedCourses
        .filter(c => c.usuario_id === teacher.id)
        .map(c => ({ base: c.curso_base, letra: c.letra }));
      return { ...teacher, assignedCourses: courses };
    });

    res.json(teachersWithCourses);
  } catch (error) {
    console.error('[Courses] ❌ Error al obtener profesores:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener profesores' });
  }
}

async function getTeacherCourses(req, res) {
  try {
    const { id } = req.params;

    const teacher = await prisma.usuarios.findFirst({
      where: { id: BigInt(id), rol: 'profesor' },
      select: { id: true, username: true, nombre: true, rol: true }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Profesor no encontrado.' });
    }

    const courses = await prisma.cursos_asignados.findMany({
      where: { usuario_id: BigInt(id) },
      select: { curso_base: true, letra: true }
    });

    const assignedCourses = courses.map(c => ({ base: c.curso_base, letra: c.letra }));
    res.json({ teacher, assignedCourses });
  } catch (error) {
    console.error('[Courses] ❌ Error al obtener cursos del profesor:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener cursos del profesor' });
  }
}

async function assignCoursesToTeacher(req, res) {
  try {
    const { id } = req.params;
    const { assignedCourses } = req.body;

    const teacher = await prisma.usuarios.findFirst({
      where: { id: BigInt(id), rol: 'profesor' },
      select: { id: true, nombre: true }
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Profesor no encontrado.' });
    }

    await prisma.cursos_asignados.deleteMany({ where: { usuario_id: BigInt(id) } });

    const validCourses = (assignedCourses || []).filter(c =>
      c.base && c.base.trim() !== '' && c.letra && c.letra.trim() !== ''
    );

    let assignedCount = 0;
    if (validCourses.length > 0) {
      const result = await prisma.cursos_asignados.createMany({
        data: validCourses.map(c => ({
          usuario_id: BigInt(id),
          curso_base: c.base.trim(),
          letra: c.letra.trim()
        }))
      });
      assignedCount = result.count;
    }

    res.json({ message: 'Cursos asignados exitosamente', assignedCount });
  } catch (error) {
    console.error('[Courses] ❌ Error al asignar cursos:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al asignar cursos' });
  }
}

async function getUserAssignedCourses(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.rol !== 'profesor') {
      return res.json([]);
    }

    const assignments = await prisma.profesor_curso.findMany({
      where: { usuario_id: BigInt(userId), puede_matricular: true },
      include: {
        cursos: {
          include: {
            grados: { select: { nombre: true, nombre_corto: true } },
            letras_curso: { select: { letra: true } }
          }
        }
      }
    });

    const formattedCourses = assignments.map((assignment, index) => {
      const curso = assignment.cursos;
      const grado = curso.grados;
      const letra = curso.letras_curso;
      return {
        id: index + 1,
        curso_id: curso.id,
        nombre: `${grado.nombre_corto} ${letra.letra}`,
        base: grado.nombre_corto,
        letra: letra.letra,
        codigo: curso.codigo,
        tipo_asignacion: assignment.tipo_asignacion
      };
    });

    res.json(formattedCourses);
  } catch (error) {
    console.error('[Courses] ❌ Error al obtener cursos del usuario:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener cursos del usuario' });
  }
}

async function getUserCoursesWithEnrollPermission(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.rol !== 'profesor') {
      return res.json([]);
    }

    const assignments = await prisma.profesor_curso.findMany({
      where: { usuario_id: BigInt(userId), puede_matricular: true },
      select: { curso_id: true }
    });

    const courseIds = assignments.map(a => a.curso_id);
    res.json(courseIds);
  } catch (error) {
    console.error('[Courses] ❌ Error al obtener permisos de matrícula:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al obtener permisos de matrícula' });
  }
}

module.exports = { getCourses, getTeachers, getTeacherCourses, assignCoursesToTeacher, getUserAssignedCourses, getUserCoursesWithEnrollPermission };
