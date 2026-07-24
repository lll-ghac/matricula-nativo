const { prisma } = require('../config/db');
const { getErrorMessage } = require('../utils/helpers');

async function getCurrentYear(req, res) {
  try {
    const row = await prisma.anio_vigente.findFirst({
      where: { activo: true },
      orderBy: { id: 'desc' },
      select: { anio: true }
    });
    const year = row ? row.anio : new Date().getFullYear();
    res.json({ year });
  } catch (error) {
    console.error('Error en endpoint GET /api/year/current:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getYears(req, res) {
  try {
    const years = await prisma.anio_vigente.findMany({
      orderBy: { anio: 'desc' }
    });
    res.json(years);
  } catch (error) {
    console.error('Error en endpoint GET /api/years:', error);
    res.status(500).json({ error: error.message });
  }
}

async function createYear(req, res) {
  try {
    const { anio } = req.body;
    if (!anio || typeof anio !== 'number') {
      return res.status(400).json({ message: 'El año es requerido y debe ser un número' });
    }

    const existingYear = await prisma.anio_vigente.findFirst({ where: { anio } });
    if (existingYear) {
      return res.status(409).json({ message: `El año ${anio} ya está registrado` });
    }

    await prisma.anio_vigente.updateMany({ data: { activo: false } });

    const newYear = await prisma.anio_vigente.create({
      data: { anio, activo: true, creado_por: req.user.username }
    });

    res.json({
      message: `Año académico ${anio} creado exitosamente como año vigente`,
      yearId: Number(newYear.id)
    });
  } catch (error) {
    console.error('Error en endpoint POST /api/years:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function activateYear(req, res) {
  try {
    const { id } = req.params;

    const yearToActivate = await prisma.anio_vigente.findUnique({
      where: { id: BigInt(id) },
      select: { anio: true }
    });

    if (!yearToActivate) {
      return res.status(404).json({ message: 'Año no encontrado' });
    }

    await prisma.anio_vigente.updateMany({ data: { activo: false } });
    await prisma.anio_vigente.update({
      where: { id: BigInt(id) },
      data: { activo: true }
    });

    res.json({ message: 'Año vigente actualizado exitosamente' });
  } catch (error) {
    console.error('Error en endpoint PUT /api/years/:id/activate:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

module.exports = { getCurrentYear, getYears, createYear, activateYear };
