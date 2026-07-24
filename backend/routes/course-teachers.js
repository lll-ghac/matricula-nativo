const { prisma } = require('../config/db');

async function getCourseTeachers(req, res) {
  try {
    const { id } = req.params;

    const teachers = await prisma.$queryRaw`
      SELECT * FROM profesores_por_curso
      WHERE curso_id = ${parseInt(id)}
      ORDER BY tipo_asignacion ASC, profesor_nombre ASC
    `;

    res.json({ data: teachers });
  } catch (error) {
    console.error('[Course Teachers] Error obteniendo profesores:', error);
    res.status(500).json({ error: 'Error al obtener profesores del curso' });
  }
}

async function addCourseTeacher(req, res) {
  try {
    const { id } = req.params;
    const {
      usuario_id,
      tipo_asignacion = 'asignatura',
      puede_matricular = true,
      puede_editar = false,
      asignatura = null,
      observaciones = null
    } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'El campo usuario_id es requerido' });
    }

    const tiposValidos = ['profesor_jefe', 'asignatura', 'apoyo', 'reemplazo'];
    if (!tiposValidos.includes(tipo_asignacion)) {
      return res.status(400).json({ error: `Tipo de asignación inválido. Debe ser uno de: ${tiposValidos.join(', ')}` });
    }

    const existente = await prisma.profesor_curso.findFirst({
      where: {
        curso_id: parseInt(id),
        usuario_id: BigInt(usuario_id),
        tipo_asignacion
      }
    });

    if (existente) {
      return res.status(409).json({ error: 'Este profesor ya está asignado al curso con el mismo rol' });
    }

    const assignment = await prisma.profesor_curso.create({
      data: {
        curso_id: parseInt(id),
        usuario_id: BigInt(usuario_id),
        tipo_asignacion,
        puede_matricular,
        puede_editar,
        asignatura,
        observaciones,
        asignado_por: req.user?.username || 'sistema'
      }
    });

    if (tipo_asignacion === 'profesor_jefe') {
      try {
        await prisma.cursos.update({
          where: { id: parseInt(id) },
          data: { profesor_jefe_id: BigInt(usuario_id), actualizado_por: req.user?.username || 'sistema' }
        });
      } catch (updateError) {
        console.error('[Course Teachers] ⚠️ Error actualizando cursos.profesor_jefe_id:', updateError);
      }
    }

    const teacherInfo = await prisma.$queryRaw`
      SELECT * FROM profesores_por_curso WHERE asignacion_id = ${assignment.id}
    `;

    res.json({ message: 'Profesor asignado exitosamente', data: teacherInfo[0] || assignment });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Curso o profesor no encontrado' });
    }
    console.error('[Course Teachers] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function updateCourseTeacher(req, res) {
  try {
    const { courseId, teacherId } = req.params;
    const { tipo_asignacion, puede_matricular, puede_editar, asignatura, observaciones } = req.body;

    const updateData = { actualizado_en: new Date() };

    if (tipo_asignacion !== undefined) {
      const tiposValidos = ['profesor_jefe', 'asignatura', 'apoyo', 'reemplazo'];
      if (!tiposValidos.includes(tipo_asignacion)) {
        return res.status(400).json({ error: `Tipo de asignación inválido. Debe ser uno de: ${tiposValidos.join(', ')}` });
      }
      updateData.tipo_asignacion = tipo_asignacion;
    }
    if (puede_matricular !== undefined) updateData.puede_matricular = puede_matricular;
    if (puede_editar !== undefined) updateData.puede_editar = puede_editar;
    if (asignatura !== undefined) updateData.asignatura = asignatura;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const result = await prisma.profesor_curso.updateMany({
      where: { curso_id: parseInt(courseId), usuario_id: BigInt(teacherId) },
      data: updateData
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ message: 'Asignación actualizada exitosamente', data: { curso_id: parseInt(courseId), usuario_id: Number(teacherId), ...updateData } });
  } catch (error) {
    console.error('[Course Teachers] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function removeCourseTeacher(req, res) {
  try {
    const { courseId, teacherId } = req.params;
    const { tipo_asignacion } = req.query;

    const where = { curso_id: parseInt(courseId), usuario_id: BigInt(teacherId) };
    if (tipo_asignacion) where.tipo_asignacion = tipo_asignacion;

    const toDelete = await prisma.profesor_curso.findMany({
      where,
      select: { id: true, tipo_asignacion: true }
    });

    if (toDelete.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    await prisma.profesor_curso.deleteMany({ where });

    const eliminoProfesorJefe = toDelete.some(item => item.tipo_asignacion === 'profesor_jefe');
    if (eliminoProfesorJefe) {
      try {
        await prisma.cursos.update({
          where: { id: parseInt(courseId) },
          data: { profesor_jefe_id: null, actualizado_por: req.user?.username || 'sistema' }
        });
      } catch (updateError) {
        console.error('[Course Teachers] ⚠️ Error actualizando cursos.profesor_jefe_id:', updateError);
      }
    }

    res.json({ message: 'Profesor quitado del curso exitosamente', deleted_count: toDelete.length });
  } catch (error) {
    console.error('[Course Teachers] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getCourseTeachers, addCourseTeacher, updateCourseTeacher, removeCourseTeacher };
