const { prisma } = require('../config/db');
const { getErrorMessage } = require('../utils/helpers');

async function getGuardians(req, res) {
  try {
    const { search, rut } = req.query;

    const where = {};

    if (rut) {
      const rutNum = parseInt(rut.replace(/[^0-9]/g, ''));
      if (!isNaN(rutNum)) where.rut = rutNum;
    }

    if (search && search.length >= 3) {
      const s = search.replace(/[´`'"]/g, '').trim();
      if (s.length >= 3) {
        where.OR = [
          { nombre: { contains: s, mode: 'insensitive' } },
          { apellido_paterno: { contains: s, mode: 'insensitive' } },
          { apellido_materno: { contains: s, mode: 'insensitive' } }
        ];
      }
    }

    const guardians = await prisma.apoderados.findMany({
      where,
      orderBy: { apellido_paterno: 'asc' }
    });

    const guardiansWithPrefix = guardians.map(g => ({
      ...g,
      region: g.region && !g.region.startsWith('Región') ? `Región de ${g.region}` : g.region
    }));

    res.json(guardiansWithPrefix);
  } catch (error) {
    console.error('[Guardians] Error en getGuardians:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getGuardianById(req, res) {
  try {
    const { id } = req.params;

    const guardian = await prisma.apoderados.findUnique({ where: { id: BigInt(id) } });

    if (!guardian) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }

    if (guardian.region && !guardian.region.startsWith('Región')) {
      guardian.region = `Región de ${guardian.region}`;
    }

    res.json(guardian);
  } catch (error) {
    console.error('[Guardians] Error en getGuardianById:', error);
    res.status(500).json({ error: error.message });
  }
}

async function createGuardian(req, res) {
  try {
    const guardianData = req.body;

    if (!guardianData.celular) {
      return res.status(400).json({ message: 'El celular es requerido' });
    }

    if (!guardianData.rut && !guardianData.dni && !guardianData.pasaporte) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un identificador (RUT, DNI o Pasaporte)' });
    }

    if (guardianData.rut) {
      const existing = await prisma.apoderados.findFirst({
        where: { rut: guardianData.rut, dv: guardianData.dv || '' },
        select: { id: true }
      });
      if (existing) {
        return res.status(409).json({ message: 'Ya existe un apoderado con ese RUT', existingId: existing.id });
      }
    }

    const newGuardian = await prisma.apoderados.create({
      data: {
        rut: guardianData.rut || null,
        dv: guardianData.dv || null,
        dni: guardianData.dni || null,
        pasaporte: guardianData.pasaporte || null,
        tipo_documento: guardianData.tipo_documento || 'RUT',
        nombre: guardianData.nombre || '',
        apellido_paterno: guardianData.apellido_paterno || '',
        apellido_materno: guardianData.apellido_materno || '',
        fecha_nacimiento: guardianData.fecha_nacimiento || null,
        genero: guardianData.genero || '',
        nacionalidad: guardianData.nacionalidad || 'Chilena',
        region: guardianData.region || null,
        celular: guardianData.celular,
        email: guardianData.email || null,
        direccion: guardianData.direccion || '',
        comuna: guardianData.comuna || null,
        parentesco: 'Sin relación'
      }
    });

    if (newGuardian.region && !newGuardian.region.startsWith('Región')) {
      newGuardian.region = `Región de ${newGuardian.region}`;
    }

    res.status(201).json(newGuardian);
  } catch (error) {
    console.error('[Guardians] Error en createGuardian:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function updateGuardian(req, res) {
  try {
    const { id } = req.params;
    const guardianData = req.body;

    const existing = await prisma.apoderados.findUnique({ where: { id: BigInt(id) }, select: { id: true } });
    if (!existing) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }

    const dataToUpdate = { actualizado_en: new Date() };

    const fields = ['rut','dv','dni','pasaporte','tipo_documento','nombre','apellido_paterno','apellido_materno',
                    'fecha_nacimiento','genero','nacionalidad','celular','email','direccion',
                    'complemento_direccion','region','comuna','parentesco'];

    fields.forEach(f => { if (guardianData[f] !== undefined) dataToUpdate[f] = guardianData[f]; });

    const updatedGuardian = await prisma.apoderados.update({
      where: { id: BigInt(id) },
      data: dataToUpdate
    });

    if (updatedGuardian.region && !updatedGuardian.region.startsWith('Región')) {
      updatedGuardian.region = `Región de ${updatedGuardian.region}`;
    }

    res.json(updatedGuardian);
  } catch (error) {
    console.error('[Guardians] Error en updateGuardian:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function deleteGuardian(req, res) {
  try {
    const { id } = req.params;

    const relations = await prisma.alumno_apoderado.findMany({
      where: { apoderado_id: BigInt(id) },
      select: { id: true }
    });

    if (relations.length > 0) {
      return res.status(409).json({
        message: `No se puede eliminar el apoderado porque tiene ${relations.length} estudiante(s) asociado(s)`,
        studentCount: relations.length
      });
    }

    await prisma.apoderados.delete({ where: { id: BigInt(id) } });
    res.json({ message: 'Apoderado eliminado exitosamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }
    console.error('[Guardians] Error en deleteGuardian:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getGuardianStudents(req, res) {
  try {
    const { id } = req.params;

    const relations = await prisma.alumno_apoderado.findMany({
      where: { apoderado_id: BigInt(id) },
      include: {
        alumnos: {
          select: { id: true, rut: true, dv: true, nombres: true, apellido_paterno: true, apellido_materno: true, curso_base: true, letra: true, anio_matricula: true, estado: true }
        }
      }
    });

    const students = relations.map(rel => ({
      ...rel.alumnos,
      tipo_relacion: rel.tipo_relacion,
      es_apoderado_principal: rel.tipo_relacion === 'titular'
    }));

    res.json(students);
  } catch (error) {
    console.error('[Guardians] Error en getGuardianStudents:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getGuardians, getGuardianById, createGuardian, updateGuardian, deleteGuardian, getGuardianStudents };
