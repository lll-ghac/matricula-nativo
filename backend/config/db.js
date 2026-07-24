const { Pool, types } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// OID 1082 = PostgreSQL date type.
// Por defecto pg convierte 'date' a JavaScript Date (medianoche hora local del servidor),
// lo que genera un desfase de un día en el navegador cuando el cliente está en UTC diferente.
// Al devolver el valor como string YYYY-MM-DD se evita toda conversión de zona horaria.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };
