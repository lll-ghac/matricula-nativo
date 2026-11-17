const { prisma } = require('../config/db');
const { Prisma } = require('@prisma/client');
const {
  normalizeAlumnoData,
  normalizeApoderadoData,
  getErrorMessage,
  getAnioVigente,
  sanitizeCSVField
} = require('../utils/helpers');
const secLog = require('../utils/securityLogger');

// Known writable fields for apoderados table (Prisma schema)
const APODERADO_PRISMA_FIELDS = [
  'tipo_documento', 'rut', 'dv', 'dni', 'pasaporte', 'nombre', 'apellido_paterno',
  'apellido_materno', 'genero', 'fecha_nacimiento', 'nacionalidad', 'direccion',
  'complemento_direccion', 'region', 'comuna', 'celular', 'email',
  'nivel_educacional', 'situacion_laboral', 'lugar_trabajo'
];

// Strip unknown fields and convert rut to Int for Prisma apoderado writes
function prepareApoderadoForPrisma(normalized) {
  const prepared = {};
  APODERADO_PRISMA_FIELDS.forEach(field => {
    if (normalized[field] !== undefined) prepared[field] = normalized[field];
  });
  if (prepared.rut !== undefined && prepared.rut !== null) {
    prepared.rut = parseInt(prepared.rut);
    if (isNaN(prepared.rut)) prepared.rut = null;
  }
  return prepared;
}

// Convert alumnos field types to match Prisma schema
function prepareAlumnoPrismaData(data) {
  const d = { ...data };
  if (d.rut !== undefined && d.rut !== null) d.rut = parseInt(d.rut);
  if (d.anio_matricula !== undefined && d.anio_matricula !== null) d.anio_matricula = parseInt(d.anio_matricula);
  if (d.prevision_salud_id !== undefined) d.prevision_salud_id = d.prevision_salud_id ? parseInt(d.prevision_salud_id) : null;
  if (d.curso_id !== undefined) d.curso_id = d.curso_id ? parseInt(d.curso_id) : null;
  if (d.creado_por !== undefined) d.creado_por = d.creado_por ? BigInt(d.creado_por) : null;
  if (d.modificado_por !== undefined) d.modificado_por = d.modificado_por ? BigInt(d.modificado_por) : null;
  return d;
}

// Get all apoderados for a student with relation data, ordered by orden
async function getApoderadosDeAlumno(alumnoId) {
  const relations = await prisma.alumno_apoderado.findMany({
    where: { alumno_id: BigInt(alumnoId) },
    include: { apoderados: true },
    orderBy: [{ orden: 'asc' }]
  });
  return relations.map(rel => ({
    ...rel.apoderados,
    tipo_relacion: rel.tipo_relacion,
    parentesco: rel.parentesco,
    orden: rel.orden || 99,
    es_principal: rel.tipo_relacion === 'titular',
    es_suplente: rel.tipo_relacion === 'suplente'
  }));
}

// Upsert a single apoderado; returns its BigInt id or null
async function upsertApoderado(apoderado) {
  const searchValue = apoderado.rut || apoderado.dni || apoderado.pasaporte;
  if (!searchValue || String(searchValue).trim() === '') return null;

  const rutInt = parseInt(String(searchValue).replace(/[^0-9]/g, ''), 10);
  const whereRut = isNaN(rutInt) ? {} : { rut: rutInt };

  const existing = Object.keys(whereRut).length > 0
    ? await prisma.apoderados.findFirst({ where: whereRut, select: { id: true } })
    : null;

  if (existing) {
    const normalized = normalizeApoderadoData({ ...apoderado });
    const data = prepareApoderadoForPrisma(normalized);
    await prisma.apoderados.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const normalized = normalizeApoderadoData({
    tipo_documento: apoderado.tipo_documento || 'RUT',
    rut: searchValue,
    ...apoderado
  });
  const data = prepareApoderadoForPrisma(normalized);
  const created = await prisma.apoderados.create({ data });
  return created.id;
}

// Delete all alumno-apoderado relations then recreate from array
async function processApoderadosForAlumno(alumnoId, allApoderados) {
  await prisma.alumno_apoderado.deleteMany({ where: { alumno_id: BigInt(alumnoId) } });

  for (const apoderado of allApoderados) {
    const searchValue = apoderado.rut || apoderado.dni || apoderado.pasaporte;
    if (!searchValue || String(searchValue).trim() === '') {
      console.warn('[Students] Apoderado sin documento válido, saltando...');
      continue;
    }
    try {
      const apoderadoId = await upsertApoderado(apoderado);
      if (!apoderadoId) continue;

      const tipoRelacion = apoderado.es_principal ? 'titular' : 'suplente';
      const orden = apoderado.orden ?? (apoderado.es_principal ? 1 : 2);

      await prisma.alumno_apoderado.create({
        data: {
          alumno_id: BigInt(alumnoId),
          apoderado_id: apoderadoId,
          tipo_relacion: tipoRelacion,
          parentesco: apoderado.parentesco || 'No especificado',
          orden
        }
      });
    } catch (e) {
      console.error('[Students] Error procesando apoderado:', e.message);
    }
  }
}

// GET /api/students
async function getStudents(req, res) {
  try {
    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const where = {
      anio_matricula: yearVigente,
      OR: [{ eliminado: null }, { eliminado: false }]
    };

    const isProfesorConCursos = req.user.rol === 'profesor' && req.user.profesor_jefe_info;

    if (isProfesorConCursos) {
      const cursosAsignados = req.user.profesor_jefe_info.cursos || [];
      const cursoIds = cursosAsignados.map(c => Number(c.curso_id));

      if (cursoIds.length > 0) {
        console.log(`[Students] Profesor con ${cursoIds.length} curso(s). Filtrando por IDs: ${cursoIds.join(', ')}`);
        where.curso_id = { in: cursoIds };
      } else {
        const legacyCursoId = req.user.profesor_jefe_info.curso_id;
        if (legacyCursoId) {
          where.curso_id = Number(legacyCursoId);
        } else {
          return res.json([]);
        }
      }
    } else if (req.user.rol === 'profesor') {
      return res.json([]);
    }

    const students = await prisma.alumnos.findMany({
      where,
      select: {
        id: true, rut: true, dv: true, nombres: true, apellido_paterno: true, apellido_materno: true,
        curso_base: true, letra: true, estado: true, fecha_creacion: true, creado_por: true,
        modificado_por: true, fecha_nacimiento: true, fecha_retiro: true, observacion_retiro: true,
        anio_matricula: true, curso_id: true
      },
      orderBy: { fecha_creacion: 'desc' }
    });

    // Enrich with cursos_completo view
    const cursoIdsUniq = [...new Set(students.map(s => s.curso_id).filter(Boolean))];
    let cursosMap = {};

    if (cursoIdsUniq.length > 0) {
      const idParams = cursoIdsUniq.map(id => Prisma.sql`${id}`);
      const cursos = await prisma.$queryRaw(Prisma.sql`
        SELECT * FROM cursos_completo WHERE id IN (${Prisma.join(idParams, ', ')})
      `);
      cursosMap = Object.fromEntries(cursos.map(c => [Number(c.id), c]));
    }

    const formattedStudents = students.map(student => {
      const curso = student.curso_id ? cursosMap[Number(student.curso_id)] : null;
      return {
        id: student.id,
        rut: student.rut,
        dv: student.dv,
        nombres: student.nombres,
        apellido_paterno: student.apellido_paterno,
        apellido_materno: student.apellido_materno,
        curso_base: student.curso_base,
        letra: student.letra,
        curso: curso ? {
          id: curso.id,
          codigo: curso.codigo,
          nombre_completo: `${curso.grado_nombre} ${curso.letra}`,
          nivel_educativo: curso.nivel_educativo_nombre,
          grado: curso.grado_nombre,
          letra: curso.letra,
          capacidad_maxima: curso.capacidad_maxima,
          alumnos_matriculados: Number(curso.alumnos_matriculados),
          cupos_disponibles: Number(curso.cupos_disponibles)
        } : null,
        estado: student.estado || 'Inscrito',
        creado_en: student.fecha_creacion,
        creado_por: student.creado_por || 'Sistema',
        modificado_por: student.modificado_por,
        fecha_nacimiento: student.fecha_nacimiento
      };
    });

    console.log(`[Students] GET /api/students - ${formattedStudents.length} alumnos obtenidos`);
    res.json(formattedStudents);

  } catch (error) {
    console.error('[Students] Error en GET /api/students:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/students
async function createStudent(req, res) {
  const studentData = req.body;
  const { apoderados, nees, ...rest } = studentData;
  const allApoderados = apoderados || [];
  const restStudentData = { ...rest };

  if (allApoderados.length === 0) {
    return res.status(400).json({ message: 'Debe haber al menos un apoderado' });
  }

  const principalesCount = allApoderados.filter(a => a.es_principal).length;
  if (principalesCount === 0) {
    return res.status(400).json({ message: 'Debe haber exactamente un apoderado marcado como principal' });
  }
  if (principalesCount > 1) {
    return res.status(400).json({ message: 'Solo puede haber un apoderado marcado como principal' });
  }

  allApoderados.forEach(a => {
    if (!a.orden) a.orden = a.es_principal ? 1 : 2;
  });

  try {
    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ message: 'No se pudo obtener el año vigente' });
    }

    if (req.user.rol === 'profesor') {
      const isProfesorJefe = req.user.profesor_jefe_info;
      if (!isProfesorJefe) {
        return res.status(403).json({ message: 'No tiene permisos para matricular. Solo los profesores con cursos asignados pueden realizar esta acción.' });
      }
      const cursosAsignados = isProfesorJefe.cursos || [];
      const idsDeCursosPermitidos = cursosAsignados.map(c => Number(c.curso_id));
      if (!idsDeCursosPermitidos.includes(Number(restStudentData.curso_id))) {
        return res.status(403).json({ message: 'No tiene permisos para matricular en el curso seleccionado. Por favor, elija uno de sus cursos asignados.' });
      }
    }

    delete restStudentData.nombre_completo_busqueda;

    const alumnoNormalizado = normalizeAlumnoData({
      ...restStudentData,
      anio_matricula: yearVigente,
      estado: 'matriculado',
      eliminado: false,
      creado_por: req.user.id,
      modificado_por: req.user.id
    });

    const alumnoData = prepareAlumnoPrismaData(alumnoNormalizado);

    // Si el RUT ya existe en el año vigente (p. ej. un alumno eliminado que se rematricula),
    // se reutiliza la fila: se conserva quién lo creó originalmente y se limpia el motivo
    // de eliminación anterior, porque el alumno vuelve a estar activo.
    // eslint-disable-next-line no-unused-vars
    const { creado_por: _creadoPorOriginal, ...alumnoDataUpdate } = alumnoData;

    const nuevoAlumno = await prisma.alumnos.upsert({
      where: { rut_anio_matricula: { rut: alumnoData.rut, anio_matricula: alumnoData.anio_matricula } },
      create: alumnoData,
      update: { ...alumnoDataUpdate, motivo_eliminacion: null }
    });

    const studentId = nuevoAlumno.id;
    console.log(`[Students] Alumno procesado (upsert) con ID: ${studentId}`);

    await processApoderadosForAlumno(studentId, allApoderados);

    // Sync NEEs
    await prisma.alumno_nee.deleteMany({ where: { alumno_id: BigInt(studentId) } });
    if (nees && Array.isArray(nees) && nees.length > 0) {
      await prisma.alumno_nee.createMany({
        data: nees.map(nee_id => ({ alumno_id: BigInt(studentId), nee_id: parseInt(nee_id) })),
        skipDuplicates: true
      });
    }

    // Build response
    const studentComplete = await prisma.alumnos.findUnique({
      where: { id: studentId },
      include: { previsiones_salud: { select: { nombre: true } } }
    });

    const apoderadosOrdenados = await getApoderadosDeAlumno(studentId);

    const neesData = await prisma.alumno_nee.findMany({
      where: { alumno_id: BigInt(studentId) },
      include: { tipos_nee: { select: { id: true, codigo: true, descripcion: true } } }
    });
    const neesConDescripcion = neesData.map(item => ({
      id: item.nee_id,
      codigo: item.tipos_nee?.codigo || '',
      descripcion: item.tipos_nee?.descripcion || 'NEE sin descripción'
    }));

    const responseData = {
      ...studentComplete,
      prevision_salud: studentComplete?.previsiones_salud?.nombre || null,
      apoderados: apoderadosOrdenados,
      nees: neesConDescripcion
    };

    secLog.studentWrite(req, 'CREATE', studentId);
    console.log('[Students] POST /api/students completado exitosamente');
    res.status(201).json({ message: 'Matrícula guardada exitosamente.', studentId, data: responseData });

  } catch (outerError) {
    console.error('[Students] Error en POST /api/students:', outerError);
    res.status(500).json({ message: 'Error de servidor durante la matrícula.', error: outerError.message });
  }
}

// GET /api/students/:id
async function getStudentById(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }
    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const student = await prisma.alumnos.findFirst({
      where: { id: BigInt(id), anio_matricula: yearVigente },
      include: { previsiones_salud: { select: { nombre: true } } }
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado.' });
    }

    const apoderadosOrdenados = await getApoderadosDeAlumno(id);

    const neesData = await prisma.alumno_nee.findMany({
      where: { alumno_id: BigInt(id) },
      include: { tipos_nee: { select: { id: true, codigo: true, descripcion: true } } }
    });
    const nees = neesData.map(item => ({
      id: item.nee_id,
      codigo: item.tipos_nee?.codigo || '',
      descripcion: item.tipos_nee?.descripcion || 'NEE sin descripción'
    }));

    res.json({
      ...student,
      creado_en: student.fecha_creacion,
      prevision_salud: student.previsiones_salud?.nombre || null,
      apoderados: apoderadosOrdenados,
      nees
    });

  } catch (error) {
    console.error('[Students] Error en GET /api/students/:id:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/students/:id
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }
    const studentData = req.body;
    const { nees, apoderados: allApoderados, ...restStudentData } = studentData;
    const shouldUpdateGuardians = allApoderados !== undefined;

    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ message: 'No se pudo obtener el año vigente' });
    }

    if (req.user.rol === 'profesor') {
      const isProfesorJefe = req.user.profesor_jefe_info;
      if (!isProfesorJefe) {
        return res.status(403).json({ message: 'No tiene permisos para modificar matrículas.' });
      }
      const cursosAsignados = isProfesorJefe.cursos || [];
      const idsDeCursosPermitidos = cursosAsignados.map(c => Number(c.curso_id));
      if (!idsDeCursosPermitidos.includes(Number(restStudentData.curso_id))) {
        return res.status(403).json({ message: 'No tiene permisos para matricular o mover estudiantes a este curso.' });
      }
    }

    delete restStudentData.nombre_completo_busqueda;

    const alumnoActualizado = normalizeAlumnoData({
      ...restStudentData,
      anio_matricula: yearVigente,
      eliminado: false,
      modificado_por: req.user.id
    });
    const alumnoData = prepareAlumnoPrismaData(alumnoActualizado);
    // Don't update rut/anio_matricula on update (unique key)
    delete alumnoData.rut;
    delete alumnoData.anio_matricula;
    // El creador original nunca cambia al editar. Y como esta ruta deja al alumno
    // activo (eliminado: false), también es la vía de rematrícula desde el formulario:
    // se limpia el motivo de una eliminación anterior (aunque el formulario lo reenvíe).
    delete alumnoData.creado_por;
    alumnoData.motivo_eliminacion = null;

    const result = await prisma.alumnos.updateMany({
      where: { id: BigInt(id) },
      data: alumnoData
    });

    if (result.count === 0) {
      return res.status(200).json({ message: 'Datos del estudiante actualizados exitosamente (sin cambios en la base de datos).' });
    }

    // If no apoderados sent, return current state
    if (!shouldUpdateGuardians) {
      const studentComplete = await prisma.alumnos.findFirst({
        where: { id: BigInt(id) },
        include: { previsiones_salud: { select: { nombre: true } } }
      });

      const formattedGuardians = await getApoderadosDeAlumno(id);

      const neesData = await prisma.alumno_nee.findMany({
        where: { alumno_id: BigInt(id) },
        include: { tipos_nee: { select: { id: true, codigo: true, descripcion: true, categoria: true } } }
      });
      const neesFormatted = neesData.map(n => n.tipos_nee).filter(Boolean);

      return res.status(200).json({
        message: 'Datos del estudiante actualizados exitosamente.',
        data: {
          ...studentComplete,
          prevision_salud: studentComplete?.previsiones_salud?.nombre || null,
          apoderados: formattedGuardians,
          nees: neesFormatted
        }
      });
    }

    await processApoderadosForAlumno(id, allApoderados);

    // Sync NEEs
    await prisma.alumno_nee.deleteMany({ where: { alumno_id: BigInt(id) } });
    if (nees && Array.isArray(nees) && nees.length > 0) {
      await prisma.alumno_nee.createMany({
        data: nees.map(nee_id => ({ alumno_id: BigInt(id), nee_id: parseInt(nee_id) })),
        skipDuplicates: true
      });
    }

    const studentComplete = await prisma.alumnos.findFirst({
      where: { id: BigInt(id) },
      include: { previsiones_salud: { select: { nombre: true } } }
    });

    const formattedGuardians = await getApoderadosDeAlumno(id);

    const neesData = await prisma.alumno_nee.findMany({
      where: { alumno_id: BigInt(id) },
      include: { tipos_nee: { select: { id: true, codigo: true, descripcion: true, categoria: true } } }
    });
    const neesFormatted = neesData.map(n => n.tipos_nee).filter(Boolean);

    secLog.studentWrite(req, 'UPDATE', id);
    res.status(200).json({
      message: 'Matrícula actualizada exitosamente.',
      data: {
        ...studentComplete,
        prevision_salud: studentComplete?.previsiones_salud?.nombre || null,
        apoderados: formattedGuardians,
        nees: neesFormatted
      }
    });

  } catch (error) {
    console.error('[Students] Error en PUT /api/students/:id:', error);
    res.status(500).json({ message: 'Error de servidor al actualizar matrícula.', error: error.message });
  }
}

// GET /api/students/:id/apoderados
async function getStudentGuardians(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }

    const relations = await prisma.alumno_apoderado.findMany({
      where: { alumno_id: BigInt(id) },
      include: { apoderados: true }
    });

    const formattedGuardians = relations.map(rel => ({
      ...rel.apoderados,
      tipo_relacion: rel.tipo_relacion,
      es_principal: rel.tipo_relacion === 'titular',
      es_suplente: rel.tipo_relacion === 'suplente',
      orden: rel.orden || 99,
      parentesco: rel.parentesco || 'No especificado'
    }));

    res.json(formattedGuardians);

  } catch (error) {
    console.error('[Students] Error en GET /api/students/:id/apoderados:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/students/:id/guardians
async function updateStudentGuardians(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }
    const { guardians: allApoderados } = req.body;

    if (!allApoderados || !Array.isArray(allApoderados)) {
      return res.status(400).json({ message: 'Datos de apoderados inválidos.' });
    }

    await processApoderadosForAlumno(id, allApoderados);

    console.log(`[Students] PUT /api/students/${id}/guardians completado`);
    res.status(200).json({ message: 'Apoderados actualizados exitosamente.' });

  } catch (error) {
    console.error('[Students] Error en PUT /api/students/:id/guardians:', error);
    res.status(500).json({ message: 'Error de servidor al actualizar apoderados.', error: error.message });
  }
}

// GET /api/guardians/check/:rut
async function checkGuardianByRut(req, res) {
  try {
    const { rut } = req.params;
    const sanitizedRut = parseInt(rut.replace(/[^0-9]/g, ''), 10);

    if (isNaN(sanitizedRut)) {
      return res.status(400).json({ message: 'Formato de RUT inválido.' });
    }

    const apoderado = await prisma.apoderados.findFirst({ where: { rut: sanitizedRut } });

    if (!apoderado) {
      return res.status(404).json({ message: 'Apoderado no encontrado.' });
    }

    const result = { ...apoderado };
    if (result.region && !result.region.startsWith('Región')) {
      result.region = `Región de ${result.region}`;
    }

    res.json(result);

  } catch (error) {
    console.error('[Students] Error en GET /api/guardians/check/:rut:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/guardians/:id
async function updateGuardian(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de apoderado inválido. Debe ser un número.' });
    }
    const { nombre, apellido_paterno, apellido_materno, parentesco, fecha_nacimiento, genero,
            nacionalidad, direccion, complemento_direccion, region, comuna, celular, email } = req.body;

    if (!nombre || !apellido_paterno || !parentesco) {
      return res.status(400).json({ message: 'Nombre, apellido paterno y parentesco son obligatorios.' });
    }

    const normalized = normalizeApoderadoData({
      nombre, apellido_paterno, apellido_materno, parentesco, fecha_nacimiento, genero,
      nacionalidad, direccion, complemento_direccion, region, comuna, celular, email
    });
    const data = prepareApoderadoForPrisma(normalized);

    const result = await prisma.apoderados.updateMany({
      where: { id: BigInt(id) },
      data
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Apoderado no encontrado.' });
    }

    res.json({ message: 'Apoderado actualizado exitosamente.', changes: result.count });

  } catch (error) {
    console.error('[Students] Error en PUT /api/guardians/:id:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/apoderados/search?rut=...
async function searchGuardians(req, res) {
  try {
    const { rut } = req.query;

    if (!rut) {
      return res.status(400).json({ message: 'El parámetro RUT es requerido.' });
    }

    const sanitizedRut = parseInt(rut.replace(/[^0-9]/g, ''), 10);
    if (isNaN(sanitizedRut)) {
      return res.status(400).json({ message: 'Formato de RUT inválido.' });
    }

    const apoderados = await prisma.apoderados.findMany({ where: { rut: sanitizedRut } });
    res.json(apoderados);

  } catch (error) {
    console.error('[Students] Error en GET /api/apoderados/search:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/students/:id (soft delete)
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }
    const { motivo } = req.body;
    const yearVigente = await getAnioVigente();

    if (!yearVigente) {
      return res.status(500).json({ message: 'No se pudo obtener el año vigente' });
    }

    const result = await prisma.alumnos.updateMany({
      where: { id: BigInt(id), anio_matricula: yearVigente },
      data: {
        eliminado: true,
        motivo_eliminacion: motivo || 'Eliminado desde panel administrativo',
        modificado_por: BigInt(req.user.id)
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado.' });
    }

    secLog.studentWrite(req, 'DELETE', id);
    res.json({ message: 'Estudiante movido a la papelera correctamente.' });

  } catch (error) {
    console.error('[Students] Error en DELETE /api/students/:id:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/students/export
async function exportStudents(req, res) {
  const { format = 'csv', courses } = req.query;

  try {
    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ message: 'No se pudo obtener el año vigente' });
    }

    const where = {
      anio_matricula: yearVigente,
      OR: [{ eliminado: null }, { eliminado: false }]
    };

    // Restrict by assigned courses for professor
    if (req.user.rol === 'profesor') {
      const cursosAsignados = req.user.profesor_jefe_info?.cursos || [];
      const cursoIds = cursosAsignados.map(c => Number(c.curso_id));

      if (cursoIds.length === 0) {
        const legacyCursoId = req.user.profesor_jefe_info?.curso_id;
        if (legacyCursoId) cursoIds.push(Number(legacyCursoId));
      }

      if (cursoIds.length === 0) {
        return res.status(403).json({ message: 'No tienes cursos asignados para exportar.' });
      }

      where.curso_id = { in: cursoIds };

    } else if (courses) {
      // Filter by specific course strings "1° Básico A,2° Básico B"
      const orConditions = [];
      courses.split(',').forEach(courseStr => {
        const parts = courseStr.trim().split(' ');
        if (parts.length >= 2) {
          const letra = parts[parts.length - 1];
          const cursoBase = parts.slice(0, -1).join(' ');
          orConditions.push({ curso_base: cursoBase, letra });
        }
      });
      if (orConditions.length > 0) {
        // Merge with existing OR conditions
        where.AND = [{ OR: orConditions }];
      }
    }

    const estudiantes = await prisma.alumnos.findMany({
      where,
      orderBy: [
        { curso_base: 'asc' },
        { letra: 'asc' },
        { apellido_paterno: 'asc' },
        { apellido_materno: 'asc' },
        { nombres: 'asc' }
      ]
    });

    console.log(`[Students] ${estudiantes.length} estudiantes obtenidos para exportación`);

    if (format === 'csv') {
      const csvHeader = 'RUT,DV,Nombres,Apellido Paterno,Apellido Materno,Curso,Letra,Estado,Fecha Matrícula\n';
      const csvRows = estudiantes.map(student =>
        `${student.rut || ''},${student.dv || ''},"${sanitizeCSVField(student.nombres)}","${sanitizeCSVField(student.apellido_paterno)}","${sanitizeCSVField(student.apellido_materno)}","${sanitizeCSVField(student.curso_base)}","${sanitizeCSVField(student.letra)}","${sanitizeCSVField(student.estado || 'matriculado')}","${student.fecha_creacion || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="nomina_estudiantes.csv"');
      res.send('﻿' + csvHeader + csvRows);
    } else if (format === 'pdf') {
      res.status(501).json({ message: 'Exportación PDF en desarrollo' });
    } else {
      res.status(400).json({ message: 'Formato no soportado. Use csv o pdf.' });
    }

  } catch (error) {
    console.error('[Students] Error en GET /api/students/export:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// PUT /api/students/:id/retire
async function retireStudent(req, res) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID de estudiante inválido. Debe ser un número.' });
    }
    const { fecha_retiro, observacion_retiro } = req.body;

    if (!fecha_retiro || !observacion_retiro?.trim()) {
      return res.status(400).json({ error: 'La fecha de retiro y observación son obligatorias' });
    }

    const anioVigente = await getAnioVigente();
    if (!anioVigente) {
      return res.status(400).json({ message: 'No hay un año vigente configurado' });
    }

    const result = await prisma.alumnos.updateMany({
      where: { id: BigInt(id), anio_matricula: anioVigente },
      data: {
        estado: 'Retirado',
        fecha_retiro: new Date(fecha_retiro),
        observacion_retiro: observacion_retiro.trim(),
        modificado_por: BigInt(req.user.id),
        fecha_modificacion: new Date()
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado.' });
    }

    res.json({ message: 'Estudiante cambiado a estado Retirado correctamente' });

  } catch (error) {
    console.error('[Students] Error en PUT /api/students/:id/retire:', error);
    res.status(500).json({ message: getErrorMessage(error) || 'Error al cambiar estudiante a retirado' });
  }
}

// GET /api/students/search
async function searchStudents(req, res) {
  try {
    const { query: searchQuery, limit = 15 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 3) {
      return res.status(400).json({ message: 'La búsqueda debe tener al menos 3 caracteres.' });
    }

    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const searchTerm = searchQuery.trim();
    const isNumeric = /^\d+$/.test(searchTerm);

    const baseWhere = {
      anio_matricula: yearVigente,
      OR: [{ eliminado: null }, { eliminado: false }]
    };

    let searchWhere;
    if (isNumeric) {
      searchWhere = { ...baseWhere, rut: parseInt(searchTerm, 10) };
    } else {
      const words = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
      const wordFilters = words.flatMap(word => [
        { nombres: { contains: word, mode: 'insensitive' } },
        { apellido_paterno: { contains: word, mode: 'insensitive' } },
        { apellido_materno: { contains: word, mode: 'insensitive' } }
      ]);
      searchWhere = { AND: [baseWhere, { OR: wordFilters }] };
    }

    const students = await prisma.alumnos.findMany({
      where: searchWhere,
      orderBy: [{ apellido_paterno: 'asc' }, { nombres: 'asc' }],
      take: parseInt(limit)
    });

    const formattedResults = await Promise.all(students.map(async (student) => {
      const relations = await prisma.alumno_apoderado.findMany({
        where: { alumno_id: BigInt(student.id) },
        include: {
          apoderados: {
            select: { id: true, rut: true, dv: true, nombre: true, apellido_paterno: true, apellido_materno: true, celular: true, email: true, direccion: true }
          }
        }
      });

      const principal = relations.find(r => r.tipo_relacion === 'titular');
      const suplente = relations.find(r => r.tipo_relacion === 'suplente');
      const ap = principal?.apoderados;
      const as_ = suplente?.apoderados;

      return {
        id: student.id,
        rut: student.rut,
        dv: student.dv,
        nombres: student.nombres,
        apellido_paterno: student.apellido_paterno,
        apellido_materno: student.apellido_materno || '',
        curso: student.curso_base,
        letra: student.letra,
        estado: student.estado || 'Inscrito',
        apoderado_principal: {
          nombre: ap?.nombre || '',
          apellido_paterno: ap?.apellido_paterno || '',
          apellido_materno: ap?.apellido_materno || '',
          celular: ap?.celular || '',
          email: ap?.email || '',
          direccion: ap?.direccion || ''
        },
        apoderado_secundario: {
          nombre: as_?.nombre || '',
          apellido_paterno: as_?.apellido_paterno || '',
          apellido_materno: as_?.apellido_materno || '',
          celular: as_?.celular || '',
          email: as_?.email || '',
          direccion: as_?.direccion || ''
        }
      };
    }));

    res.json(formattedResults);

  } catch (error) {
    console.error('[Students] Error en GET /api/students/search:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/students/agenda
async function getStudentsAgenda(req, res) {
  try {
    const { search, curso, letra } = req.query;

    if (!search && !curso && !letra) {
      return res.json([]);
    }

    if (search && search.length < 3 && !curso && !letra) {
      return res.json([]);
    }

    const yearVigente = await getAnioVigente();
    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const where = {
      anio_matricula: yearVigente,
      OR: [{ eliminado: null }, { eliminado: false }]
    };

    if (curso) where.curso_base = curso;
    if (letra) where.letra = letra;

    if (search && search.length >= 3) {
      const sanitizedSearch = search
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['"`]/g, '')
        .toLowerCase()
        .replace(/[%_\\]/g, '')
        .trim();

      if (sanitizedSearch.length >= 3) {
        const isNumeric = /^\d+$/.test(sanitizedSearch);
        if (isNumeric) {
          where.AND = [{ OR: [
            { rut: parseInt(sanitizedSearch) },
            { nombre_completo_busqueda: { contains: sanitizedSearch, mode: 'insensitive' } }
          ]}];
        } else {
          where.nombre_completo_busqueda = { contains: sanitizedSearch, mode: 'insensitive' };
        }
      }
    }

    let students = [];
    try {
      students = await prisma.alumnos.findMany({
        where,
        orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }, { nombres: 'asc' }],
        take: 100
      });
    } catch (e) {
      console.error('[Students] Error ejecutando query en agenda:', e);
      return res.json([]);
    }

    const formattedResults = await Promise.all(students.map(async (student) => {
      const relations = await prisma.alumno_apoderado.findMany({
        where: { alumno_id: BigInt(student.id) },
        include: {
          apoderados: {
            select: { nombre: true, apellido_paterno: true, apellido_materno: true, celular: true, email: true }
          }
        }
      });

      const apoderados = relations.map(rel => ({
        nombre: rel.apoderados?.nombre || '',
        apellido_paterno: rel.apoderados?.apellido_paterno || '',
        apellido_materno: rel.apoderados?.apellido_materno || '',
        celular: rel.apoderados?.celular || '',
        email: rel.apoderados?.email || '',
        parentesco: rel.parentesco || '',
        es_principal: rel.tipo_relacion === 'titular'
      }));

      return {
        id: student.id,
        rut: student.rut,
        dv: student.dv,
        nombres: student.nombres,
        apellido_paterno: student.apellido_paterno,
        apellido_materno: student.apellido_materno || '',
        curso_base: student.curso_base,
        letra: student.letra,
        apoderados
      };
    }));

    res.json(formattedResults);

  } catch (error) {
    console.error('[Students] Error en GET /api/students/agenda:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/student/check/:rut
async function checkStudentByRut(req, res) {
  try {
    const rut = req.params.rut;
    const yearVigente = await getAnioVigente();

    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const attachGuardians = async (student) => {
      const apoderados = await getApoderadosDeAlumno(student.id);
      return { ...student, apoderados };
    };

    // 1. Check in current year (including deleted)
    const studentVigente = await prisma.alumnos.findFirst({
      where: { rut: parseInt(rut), anio_matricula: yearVigente }
    });

    if (studentVigente) {
      const studentWithGuardians = await attachGuardians(studentVigente);

      if (studentWithGuardians.eliminado === true) {
        return res.json({
          status: 'precarga',
          message: 'El estudiante fue eliminado previamente. Puede volver a matricularlo.',
          data: studentWithGuardians
        });
      }

      return res.json({
        status: 'exists',
        message: `✅ El alumno ${studentWithGuardians.nombres} ${studentWithGuardians.apellido_paterno} ${studentWithGuardians.apellido_materno} ya se encuentra ${studentWithGuardians.estado} en el curso ${studentWithGuardians.curso_base} ${studentWithGuardians.letra}.`,
        data: studentWithGuardians
      });
    }

    // 2. Check in any previous year (most recent)
    const studentAnterior = await prisma.alumnos.findFirst({
      where: { rut: parseInt(rut), anio_matricula: { lt: yearVigente } },
      orderBy: { anio_matricula: 'desc' }
    });

    if (studentAnterior) {
      const studentWithGuardians = await attachGuardians(studentAnterior);
      return res.json({
        status: 'precarga',
        message: `Estudiante encontrado en registros del año ${studentAnterior.anio_matricula}. Se precargarán sus datos.`,
        data: studentWithGuardians
      });
    }

    // 3. New student
    return res.json({
      status: 'nuevo',
      message: 'Estudiante no encontrado. Se debe crear una nueva matrícula.'
    });

  } catch (error) {
    console.error('[Students] Error en GET /api/student/check/:rut:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/students/export-complete
async function exportStudentsComplete(req, res) {
  try {
    const { format = 'csv' } = req.query;
    const yearVigente = await getAnioVigente();

    if (!yearVigente) {
      return res.status(500).json({ error: 'No se pudo obtener el año vigente' });
    }

    const isProfesor = req.user?.rol === 'profesor';

    const where = {
      anio_matricula: yearVigente,
      OR: [{ eliminado: null }, { eliminado: false }]
    };

    if (isProfesor) {
      const cursosAsignados = req.user?.profesor_jefe_info?.cursos || [];
      const cursoIds = cursosAsignados.map(c => Number(c.curso_id));

      if (cursoIds.length === 0) {
        const legacyCursoId = req.user?.profesor_jefe_info?.curso_id;
        if (legacyCursoId) cursoIds.push(Number(legacyCursoId));
      }

      if (cursoIds.length === 0) {
        return res.status(403).json({ error: 'No tienes cursos asignados para exportar.' });
      }

      where.curso_id = { in: cursoIds };
    }

    const students = await prisma.alumnos.findMany({
      where,
      include: { previsiones_salud: { select: { nombre: true } } },
      orderBy: [
        { curso_base: 'asc' },
        { letra: 'asc' },
        { apellido_paterno: 'asc' },
        { apellido_materno: 'asc' },
        { nombres: 'asc' }
      ]
    });

    if (!students || students.length === 0) {
      return res.status(404).json({ message: 'No se encontraron estudiantes para exportar.' });
    }

    console.log(`[Students] ${students.length} estudiantes obtenidos para exportación completa`);

    const BATCH_SIZE = 30;
    const estudiantesCompletos = [];

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(async (student) => {
        try {
          const relations = await prisma.alumno_apoderado.findMany({
            where: { alumno_id: BigInt(student.id) },
            include: { apoderados: true }
          });

          const relPrincipal = relations.find(r => r.tipo_relacion === 'titular');
          const relSuplente = relations.find(r => r.tipo_relacion === 'suplente');
          const ap = relPrincipal?.apoderados || {};
          const as_ = relSuplente?.apoderados || {};

          return {
            ...student,
            apoderado_principal: {
              id: ap.id || null, rut: ap.rut || '', dv: ap.dv || '',
              tipo_documento: ap.tipo_documento || '', nombre: ap.nombre || '',
              apellido_paterno: ap.apellido_paterno || '', apellido_materno: ap.apellido_materno || '',
              parentesco: relPrincipal?.parentesco || '', fecha_nacimiento: ap.fecha_nacimiento || '',
              genero: ap.genero || '', nacionalidad: ap.nacionalidad || '', direccion: ap.direccion || '',
              complemento_direccion: ap.complemento_direccion || '', region: ap.region || '',
              comuna: ap.comuna || '', celular: ap.celular || '', email: ap.email || '',
              telefono: '', otro_parentesco: '',
              nivel_educacional: ap.nivel_educacional || '', situacion_laboral: ap.situacion_laboral || '',
              lugar_trabajo: ap.lugar_trabajo || ''
            },
            apoderado_suplente: {
              id: as_.id || null, rut: as_.rut || '', dv: as_.dv || '',
              tipo_documento: as_.tipo_documento || '', nombre: as_.nombre || '',
              apellido_paterno: as_.apellido_paterno || '', apellido_materno: as_.apellido_materno || '',
              parentesco: relSuplente?.parentesco || '', fecha_nacimiento: as_.fecha_nacimiento || '',
              genero: as_.genero || '', nacionalidad: as_.nacionalidad || '', direccion: as_.direccion || '',
              complemento_direccion: as_.complemento_direccion || '', region: as_.region || '',
              comuna: as_.comuna || '', celular: as_.celular || '', email: as_.email || '',
              telefono: '', otro_parentesco: '',
              nivel_educacional: as_.nivel_educacional || '', situacion_laboral: as_.situacion_laboral || '',
              lugar_trabajo: as_.lugar_trabajo || ''
            }
          };
        } catch (e) {
          console.error(`[Students] Error procesando estudiante ${student.id}:`, e);
          return { ...student, apoderado_principal: {}, apoderado_suplente: {} };
        }
      }));
      estudiantesCompletos.push(...batchResults);
    }

    if (format === 'csv') {
      const headers = [
        'ID', 'RUT', 'DV', 'Nombres', 'Nombre Social', 'Apellido Paterno', 'Apellido Materno',
        'Fecha Nacimiento', 'Genero', 'Nacionalidad', 'Etnia', 'Direccion', 'Complemento Direccion',
        'Region', 'Comuna', 'Telefono', 'Telefono Fijo', 'Con Quien Vive', 'Prevision Salud', 'Tipo Religion',
        'Curso Base', 'Letra', 'Estado', 'PIE', 'PAE', 'Beca', 'Tipo Beca',
        'Observaciones', 'Observaciones Matriculador', 'Creado Por', 'Creado En',
        'AP_RUT', 'AP_DV', 'AP_Tipo_Documento', 'AP_Nombres', 'AP_Apellido_Paterno', 'AP_Apellido_Materno',
        'AP_Parentesco', 'AP_Fecha_Nacimiento', 'AP_Genero', 'AP_Nacionalidad', 'AP_Direccion',
        'AP_Complemento_Direccion', 'AP_Region', 'AP_Comuna', 'AP_Celular', 'AP_Email',
        'AP_Telefono', 'AP_Otro_Parentesco', 'AP_Nivel_Educacional', 'AP_Situacion_Laboral', 'AP_Lugar_Trabajo',
        'AS_RUT', 'AS_DV', 'AS_Tipo_Documento', 'AS_Nombres', 'AS_Apellido_Paterno', 'AS_Apellido_Materno',
        'AS_Parentesco', 'AS_Fecha_Nacimiento', 'AS_Genero', 'AS_Nacionalidad', 'AS_Direccion',
        'AS_Complemento_Direccion', 'AS_Region', 'AS_Comuna', 'AS_Celular', 'AS_Email',
        'AS_Telefono', 'AS_Otro_Parentesco', 'AS_Nivel_Educacional', 'AS_Situacion_Laboral', 'AS_Lugar_Trabajo'
      ];

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `estudiantes_completo_${yearVigente}_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.write('﻿');
      res.write(headers.join(',') + '\n');

      const escapeCSVField = (field) => {
        const s = sanitizeCSVField(field);
        if (s.includes(',') || s.includes('\n') || s.includes('"')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      for (const est of estudiantesCompletos) {
        const row = [
          est.id || '', est.rut || '', est.dv || '', est.nombres || '', est.nombre_social || '',
          est.apellido_paterno || '', est.apellido_materno || '', est.fecha_nacimiento || '',
          est.genero || '', est.nacionalidad || '', est.etnia || '', est.direccion || '',
          est.complemento_direccion || '', est.region || '', est.comuna || '', est.telefono || '',
          est.telefono_fijo || '', est.con_quien_vive || '',
          est.previsiones_salud?.nombre || '', est.tipo_religion || '',
          est.curso_base || '', est.letra || '', est.estado || '',
          est.pie ? 'Sí' : 'No', est.pae ? 'Sí' : 'No', est.beca ? 'Sí' : 'No', est.tipo_beca || '',
          est.observaciones || '', est.observaciones_matriculador || '', est.creado_por || '', est.fecha_creacion || '',
          est.apoderado_principal.rut || '', est.apoderado_principal.dv || '',
          est.apoderado_principal.tipo_documento || '', est.apoderado_principal.nombre || '',
          est.apoderado_principal.apellido_paterno || '', est.apoderado_principal.apellido_materno || '',
          est.apoderado_principal.parentesco || '', est.apoderado_principal.fecha_nacimiento || '',
          est.apoderado_principal.genero || '', est.apoderado_principal.nacionalidad || '',
          est.apoderado_principal.direccion || '', est.apoderado_principal.complemento_direccion || '',
          est.apoderado_principal.region || '', est.apoderado_principal.comuna || '',
          est.apoderado_principal.celular || '', est.apoderado_principal.email || '',
          '', '', est.apoderado_principal.nivel_educacional || '',
          est.apoderado_principal.situacion_laboral || '', est.apoderado_principal.lugar_trabajo || '',
          est.apoderado_suplente.rut || '', est.apoderado_suplente.dv || '',
          est.apoderado_suplente.tipo_documento || '', est.apoderado_suplente.nombre || '',
          est.apoderado_suplente.apellido_paterno || '', est.apoderado_suplente.apellido_materno || '',
          est.apoderado_suplente.parentesco || '', est.apoderado_suplente.fecha_nacimiento || '',
          est.apoderado_suplente.genero || '', est.apoderado_suplente.nacionalidad || '',
          est.apoderado_suplente.direccion || '', est.apoderado_suplente.complemento_direccion || '',
          est.apoderado_suplente.region || '', est.apoderado_suplente.comuna || '',
          est.apoderado_suplente.celular || '', est.apoderado_suplente.email || '',
          '', '', est.apoderado_suplente.nivel_educacional || '',
          est.apoderado_suplente.situacion_laboral || '', est.apoderado_suplente.lugar_trabajo || ''
        ];
        res.write(row.map(escapeCSVField).join(',') + '\n');
      }

      res.end();
      console.log(`[Students] Exportación completa CSV generada: ${filename}`);
    } else {
      res.status(400).json({ message: 'Formato no soportado. Use format=csv' });
    }

  } catch (error) {
    console.error('[Students] Error en exportación completa:', error);
    res.status(500).json({ message: 'Error interno del servidor en exportación completa.' });
  }
}

// POST /api/students/force-update (broken in original - keep as stub)
async function forceUpdateStudent(req, res) {
  return res.status(501).json({ message: 'Endpoint no implementado.' });
}

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  getStudentGuardians,
  updateStudentGuardians,
  checkGuardianByRut,
  updateGuardian,
  searchGuardians,
  deleteStudent,
  exportStudents,
  exportStudentsComplete,
  retireStudent,
  searchStudents,
  getStudentsAgenda,
  checkStudentByRut,
  forceUpdateStudent
};
