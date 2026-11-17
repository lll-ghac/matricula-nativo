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
const basePrisma = new PrismaClient({ adapter });

// Escritura de columnas @db.Date: Prisma 7 rechaza un string "YYYY-MM-DD"
// ("premature end of input. Expected ISO-8601 DateTime"), que es justo lo que
// manda el frontend (<input type="date">). Se convierte a medianoche UTC, que
// Prisma guarda como esa misma fecha, sin desfase de zona horaria.
// Aplica a todas las rutas (create/update/upsert, incluso escrituras anidadas).
const DATE_ONLY_FIELDS = new Set(['fecha_nacimiento', 'fecha_retiro']);
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const WRITE_OPS = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert']);

function fixDateOnlyFields(value) {
  if (Array.isArray(value)) {
    value.forEach(fixDateOnlyFields);
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [key, v] of Object.entries(value)) {
      if (DATE_ONLY_FIELDS.has(key) && typeof v === 'string' && DATE_ONLY_RE.test(v)) {
        value[key] = new Date(`${v}T00:00:00.000Z`);
      } else if (v && typeof v === 'object') {
        fixDateOnlyFields(v);
      }
    }
  }
}

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, args, query }) {
        if (WRITE_OPS.has(operation) && args) {
          fixDateOnlyFields(args.data);
          fixDateOnlyFields(args.create);
          fixDateOnlyFields(args.update);
        }
        return query(args);
      }
    }
  }
});

module.exports = { prisma };
