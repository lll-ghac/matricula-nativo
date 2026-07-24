const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { Prisma } = require('@prisma/client');
const { getAnioVigente } = require('../utils/helpers');

// Helper: query cursos_completo view with dynamic filters
async function queryCursosCompleto(filters = {}) {
  const conditions = [];
  if (filters.anio_academico !== undefined) conditions.push(Prisma.sql`anio_academico = ${parseInt(filters.anio_academico)}`);
  if (filters.id !== undefined) conditions.push(Prisma.sql`id = ${parseInt(filters.id)}`);
  if (filters.nivel_educativo_id) conditions.push(Prisma.sql`nivel_educativo_id = ${parseInt(filters.nivel_educativo_id)}`);
  if (filters.estado) conditions.push(Prisma.sql`estado = ${filters.estado}`);
  if (filters.search) {
    conditions.push(Prisma.sql`(codigo ILIKE ${`%${filters.search}%`} OR COALESCE(profesor_jefe_nombre, '') ILIKE ${`%${filters.search}%`})`);
  }

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.sql``;

  return prisma.$queryRaw(Prisma.sql`
    SELECT * FROM cursos_completo ${whereClause}
    ORDER BY codigo_sige ASC, grado_orden ASC, letra_orden ASC
  `);
}

// GET /api/courses/v2
router.get('/', async (req, res) => {
  try {
    const { anio_academico, nivel_educativo_id, estado, search } = req.query;

    let anioFiltro = anio_academico;
    if (!anioFiltro) {
      const row = await prisma.anio_vigente.findFirst({ where: { activo: true }, select: { anio: true } });
      anioFiltro = row?.anio || new Date().getFullYear();
    }

    const data = await queryCursosCompleto({ anio_academico: anioFiltro, nivel_educativo_id, estado, search });

    res.json({
      success: true,
      data,
      count: data.length,
      filters: {
        anio_academico: parseInt(anioFiltro),
        nivel_educativo_id: nivel_educativo_id ? parseInt(nivel_educativo_id) : null,
        estado: estado || null,
        search: search || null
      }
    });
  } catch (error) {
    console.error('Error al listar cursos:', error);
    res.status(500).json({ success: false, error: 'Error al listar cursos', details: error.message });
  }
});

// GET /api/courses/v2/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await queryCursosCompleto({ id });
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener curso', details: error.message });
  }
});

// POST /api/courses/v2
router.post('/', async (req, res) => {
  try {
    const {
      nivel_educativo_id, grado_id, letra_id, jornada_id, anio_academico,
      capacidad_maxima = 40, sala, profesor_jefe_id, creado_por, estado = 'activo'
    } = req.body;

    if (!nivel_educativo_id || !grado_id || !letra_id || !jornada_id || !anio_academico || !creado_por) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        required: ['nivel_educativo_id', 'grado_id', 'letra_id', 'jornada_id', 'anio_academico', 'creado_por']
      });
    }

    // Validate grado belongs to nivel
    const gradoData = await prisma.grados.findUnique({
      where: { id: parseInt(grado_id) },
      select: { nivel_educativo_id: true }
    });

    if (!gradoData) {
      return res.status(400).json({ success: false, error: 'El grado especificado no existe' });
    }

    if (gradoData.nivel_educativo_id !== parseInt(nivel_educativo_id)) {
      return res.status(400).json({ success: false, error: 'El grado seleccionado no pertenece al nivel educativo especificado' });
    }

    // Check for duplicate
    const existente = await prisma.cursos.findFirst({
      where: { grado_id: parseInt(grado_id), letra_id: parseInt(letra_id), anio_academico: parseInt(anio_academico) },
      select: { id: true, codigo: true, estado: true }
    });

    let curso;

    if (existente && existente.estado === 'cancelado') {
      curso = await prisma.cursos.update({
        where: { id: existente.id },
        data: {
          nivel_educativo_id: parseInt(nivel_educativo_id),
          jornada_id: parseInt(jornada_id),
          capacidad_maxima: parseInt(capacidad_maxima),
          sala: sala || null,
          profesor_jefe_id: profesor_jefe_id ? BigInt(profesor_jefe_id) : null,
          estado: 'activo',
          actualizado_en: new Date()
        }
      });
    } else if (existente && existente.estado === 'activo') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe un curso activo con el mismo grado, letra y año académico',
        existing_course: existente
      });
    } else {
      curso = await prisma.cursos.create({
        data: {
          nivel_educativo_id: parseInt(nivel_educativo_id),
          grado_id: parseInt(grado_id),
          letra_id: parseInt(letra_id),
          jornada_id: parseInt(jornada_id),
          anio_academico: parseInt(anio_academico),
          capacidad_maxima: parseInt(capacidad_maxima),
          sala: sala || null,
          profesor_jefe_id: profesor_jefe_id ? BigInt(profesor_jefe_id) : null,
          creado_por,
          estado
        }
      });
    }

    // Sync profesor_jefe with profesor_curso table
    if (profesor_jefe_id) {
      try {
        await prisma.profesor_curso.create({
          data: {
            curso_id: curso.id,
            usuario_id: BigInt(profesor_jefe_id),
            tipo_asignacion: 'profesor_jefe',
            puede_matricular: true,
            puede_editar: false,
            asignado_por: creado_por
          }
        });
      } catch (e) {
        console.error('[Courses V2] ⚠️ Error creando asignación profesor_jefe:', e.message);
      }
    }

    const cursoCompleto = await queryCursosCompleto({ id: curso.id });
    res.status(201).json({ success: true, message: 'Curso creado exitosamente', data: cursoCompleto[0] || curso });
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ success: false, error: 'Error al crear curso', details: error.message });
  }
});

// PUT /api/courses/v2/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { capacidad_maxima, sala, jornada_id, profesor_jefe_id, estado, actualizado_por } = req.body;

    if (!actualizado_por) {
      return res.status(400).json({ success: false, error: 'El campo actualizado_por es requerido' });
    }

    const cursoExiste = await prisma.cursos.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, codigo: true, estado: true }
    });

    if (!cursoExiste) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    if ((cursoExiste.estado === 'cerrado' || cursoExiste.estado === 'cancelado') && estado === undefined) {
      return res.status(400).json({ success: false, error: `No se puede editar un curso en estado: ${cursoExiste.estado}` });
    }

    if (estado !== undefined) {
      const estadosValidos = ['planificado', 'activo', 'cerrado', 'cancelado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ success: false, error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` });
      }
    }

    const updateData = { actualizado_por };
    if (capacidad_maxima !== undefined) updateData.capacidad_maxima = parseInt(capacidad_maxima);
    if (sala !== undefined) updateData.sala = sala;
    if (jornada_id !== undefined) updateData.jornada_id = parseInt(jornada_id);
    if (profesor_jefe_id !== undefined) updateData.profesor_jefe_id = profesor_jefe_id !== null ? BigInt(profesor_jefe_id) : null;
    if (estado !== undefined) updateData.estado = estado;

    await prisma.cursos.update({ where: { id: parseInt(id) }, data: updateData });

    // Sync profesor_jefe with profesor_curso
    if (profesor_jefe_id !== undefined) {
      try {
        await prisma.profesor_curso.deleteMany({
          where: { curso_id: parseInt(id), tipo_asignacion: 'profesor_jefe' }
        });
        if (profesor_jefe_id !== null) {
          await prisma.profesor_curso.create({
            data: {
              curso_id: parseInt(id),
              usuario_id: BigInt(profesor_jefe_id),
              tipo_asignacion: 'profesor_jefe',
              puede_matricular: true,
              puede_editar: false,
              asignado_por: actualizado_por
            }
          });
        }
      } catch (e) {
        console.error('[Courses V2] ⚠️ Error sincronizando profesor_jefe:', e.message);
      }
    }

    const cursoCompleto = await queryCursosCompleto({ id });
    res.json({ success: true, message: 'Curso actualizado exitosamente', data: cursoCompleto[0] });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar curso', details: error.message });
  }
});

// PATCH /api/courses/v2/:id/estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, actualizado_por } = req.body;
    const estadosValidos = ['planificado', 'activo', 'cerrado', 'cancelado'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido', valid_states: estadosValidos });
    }
    if (!actualizado_por) {
      return res.status(400).json({ success: false, error: 'El campo actualizado_por es requerido' });
    }

    const cursoExiste = await prisma.cursos.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, codigo: true, estado: true }
    });

    if (!cursoExiste) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }

    await prisma.cursos.update({ where: { id: parseInt(id) }, data: { estado, actualizado_por } });

    const cursoCompleto = await queryCursosCompleto({ id });
    res.json({
      success: true,
      message: `Estado del curso cambiado de ${cursoExiste.estado} a ${estado}`,
      data: cursoCompleto[0]
    });
  } catch (error) {
    console.error('Error al cambiar estado del curso:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar estado del curso', details: error.message });
  }
});

// DELETE /api/courses/v2/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const { actualizado_por } = req.body;

    if (!actualizado_por) {
      return res.status(400).json({ success: false, error: 'El campo actualizado_por es requerido en el body' });
    }

    const cursoData = await queryCursosCompleto({ id });
    if (!cursoData || cursoData.length === 0) {
      return res.status(404).json({ success: false, error: 'Curso no encontrado' });
    }
    const curso = cursoData[0];

    if (Number(curso.alumnos_matriculados) > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar el curso ${curso.codigo} porque tiene ${curso.alumnos_matriculados} alumno(s) asignado(s)`,
        details: 'Use el parámetro ?force=true para eliminar de todas formas'
      });
    }

    if (Number(curso.alumnos_matriculados) > 0 && force === 'true') {
      await prisma.alumnos.updateMany({ where: { curso_id: parseInt(id) }, data: { curso_id: null } });
    }

    await prisma.cursos.update({ where: { id: parseInt(id) }, data: { estado: 'cancelado', actualizado_por } });

    res.json({
      success: true,
      message: `Curso ${curso.codigo} eliminado (marcado como cancelado)`,
      students_unassigned: Number(curso.alumnos_matriculados) > 0 ? Number(curso.alumnos_matriculados) : 0
    });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar curso', details: error.message });
  }
});

module.exports = router;
