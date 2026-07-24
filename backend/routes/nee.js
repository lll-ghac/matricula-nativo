const { prisma } = require('../config/db');

async function getTiposNee(req, res) {
  try {
    const tipos = await prisma.tipos_nee.findMany({
      select: { id: true, codigo: true, descripcion: true, categoria: true },
      orderBy: [{ categoria: 'asc' }, { descripcion: 'asc' }]
    });
    res.json(tipos);
  } catch (error) {
    console.error('❌ Error en getTiposNee:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getCategoriasNee(req, res) {
  try {
    const tipos = await prisma.tipos_nee.findMany({
      select: { id: true, codigo: true, descripcion: true, categoria: true },
      orderBy: [{ categoria: 'asc' }, { descripcion: 'asc' }]
    });
    const grouped = tipos.reduce((acc, tipo) => {
      const cat = tipo.categoria || 'Sin Categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tipo);
      return acc;
    }, {});
    res.json(grouped);
  } catch (error) {
    console.error('❌ Error en getCategoriasNee:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getTiposNee, getCategoriasNee };
