const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');

router.get('/niveles-educativos', async (req, res) => {
  try {
    const data = await prisma.niveles_educativos.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    });
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error al obtener niveles educativos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener niveles educativos', details: error.message });
  }
});

router.get('/grados', async (req, res) => {
  try {
    const { nivel_educativo_id } = req.query;
    const where = { activo: true };
    if (nivel_educativo_id) where.nivel_educativo_id = parseInt(nivel_educativo_id);

    const data = await prisma.grados.findMany({
      where,
      include: { niveles_educativos: { select: { id: true, codigo_sige: true, nombre: true } } },
      orderBy: { orden: 'asc' }
    });

    const mapped = data.map(({ niveles_educativos: nivel_educativo, ...g }) => ({ ...g, nivel_educativo }));

    res.json({ success: true, data: mapped, count: mapped.length, filters: { nivel_educativo_id: nivel_educativo_id || null } });
  } catch (error) {
    console.error('Error al obtener grados:', error);
    res.status(500).json({ success: false, error: 'Error al obtener grados', details: error.message });
  }
});

router.get('/letras-curso', async (req, res) => {
  try {
    const data = await prisma.letras_curso.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    });
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error al obtener letras de curso:', error);
    res.status(500).json({ success: false, error: 'Error al obtener letras de curso', details: error.message });
  }
});

router.get('/jornadas', async (req, res) => {
  try {
    const data = await prisma.jornadas.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error al obtener jornadas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener jornadas', details: error.message });
  }
});

router.get('/previsiones-salud', async (req, res) => {
  try {
    const data = await prisma.previsiones_salud.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' }
    });
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error al obtener previsiones de salud:', error);
    res.status(500).json({ success: false, error: 'Error al obtener previsiones de salud', details: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const [niveles, grados, letras, jornadas] = await Promise.all([
      prisma.niveles_educativos.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }),
      prisma.grados.findMany({
        where: { activo: true },
        include: { niveles_educativos: { select: { id: true, codigo_sige: true, nombre: true } } },
        orderBy: { orden: 'asc' }
      }),
      prisma.letras_curso.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }),
      prisma.jornadas.findMany({ where: { activo: true }, orderBy: { codigo: 'asc' } })
    ]);

    const gradosMapped = grados.map(({ niveles_educativos: nivel_educativo, ...g }) => ({ ...g, nivel_educativo }));

    res.json({
      success: true,
      data: { niveles_educativos: niveles, grados: gradosMapped, letras_curso: letras, jornadas },
      counts: { niveles_educativos: niveles.length, grados: gradosMapped.length, letras_curso: letras.length, jornadas: jornadas.length }
    });
  } catch (error) {
    console.error('Error al obtener catálogos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener catálogos', details: error.message });
  }
});

module.exports = router;
