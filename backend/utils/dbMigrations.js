/**
 * Sistema de Migraciones Automáticas
 * Ejecuta automáticamente al iniciar el servidor
 * Asegura que la estructura de la BD esté actualizada
 */

const fs = require('fs');
const path = require('path');

/**
 * Tabla para rastrear migraciones aplicadas
 */
const createMigrationsTable = (db) => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS _migraciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        aplicada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        version TEXT
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Verificar si una migración ya fue aplicada
 */
const isMigrationApplied = (db, name) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM _migraciones WHERE nombre = ?', [name], (err, row) => {
      if (err) reject(err);
      else resolve(!!row);
    });
  });
};

/**
 * Verificar si una tabla existe y tiene datos
 */
const tableExistsWithData = (db, tableName) => {
  return new Promise((resolve, reject) => {
    // Primero verificar si la tabla existe
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          // La tabla no existe
          resolve({ exists: false, hasData: false, rowCount: 0 });
          return;
        }

        // La tabla existe, verificar si tiene datos
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, countRow) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              exists: true,
              hasData: countRow.count > 0,
              rowCount: countRow.count
            });
          }
        });
      }
    );
  });
};

/**
 * Marcar una migración como aplicada
 */
const markMigrationApplied = (db, name, version) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO _migraciones (nombre, version) VALUES (?, ?)',
      [name, version],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

/**
 * Ejecutar un archivo SQL
 */
const executeSqlFile = (db, filePath) => {
  return new Promise((resolve, reject) => {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Limpiar comentarios y dividir por statement
    const lines = sql.split('\n');
    let statements = [];
    let currentStmt = '';
    let inTrigger = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Ignorar comentarios
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue;
      }

      // Detectar inicio de trigger
      if (trimmed.toUpperCase().includes('CREATE TRIGGER')) {
        inTrigger = true;
      }

      currentStmt += line + '\n';

      // Detectar fin de statement
      if (trimmed.endsWith(';')) {
        if (inTrigger && trimmed === 'END;') {
          inTrigger = false;
          statements.push(currentStmt.trim());
          currentStmt = '';
        } else if (!inTrigger) {
          statements.push(currentStmt.trim());
          currentStmt = '';
        }
      }
    }

    // Ejecutar cada statement
    const executeNext = (index) => {
      if (index >= statements.length) {
        resolve();
        return;
      }

      const stmt = statements[index];
      db.run(stmt, (err) => {
        if (err) {
          // Ignorar errores de "tabla ya existe"
          if (err.message.includes('already exists') || err.code === 'SQLITE_ERROR') {
            console.log(`   ⚠️ Ya existe o error ignorable: ${stmt.substring(0, 50)}...`);
            executeNext(index + 1);
          } else {
            reject(err);
          }
        } else {
          executeNext(index + 1);
        }
      });
    };

    executeNext(0);
  });
};

/**
 * Verificar si existe una columna en una tabla
 */
const columnExists = (db, tableName, columnName) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.some(row => row.name === columnName));
    });
  });
};

/**
 * Agregar columna si no existe
 */
const addColumnIfNotExists = async (db, tableName, columnName, columnDef) => {
  const exists = await columnExists(db, tableName, columnName);
  if (!exists) {
    return new Promise((resolve, reject) => {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err) => {
        if (err) reject(err);
        else {
          console.log(`   ✅ Columna agregada: ${tableName}.${columnName}`);
          resolve();
        }
      });
    });
  } else {
    console.log(`   ℹ️ Columna ya existe: ${tableName}.${columnName}`);
  }
};

/**
 * Lista de migraciones a ejecutar
 */
const migrations = [
  {
    name: 'initial_schema',
    version: '1.0.0',
    description: 'Esquema inicial de la base de datos',
    async up(db) {
      // 🛡️ PROTECCIÓN: Verificar si la BD ya fue inicializada anteriormente
      console.log('   🔍 Verificando si la base de datos ya fue inicializada...');

      // Obtener TODAS las tablas de la BD (excepto las internas de SQLite y migraciones)
      const existingTables = await new Promise((resolve, reject) => {
        db.all(
          `SELECT name FROM sqlite_master
           WHERE type='table'
           AND name NOT LIKE 'sqlite_%'
           AND name != '_migraciones'
           ORDER BY name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
          }
        );
      });

      // Si ya existen tablas, la BD fue inicializada previamente
      if (existingTables.length > 0) {
        console.log('   ⚠️  BASE DE DATOS YA INICIALIZADA DETECTADA');
        console.log(`   📊 Tablas existentes (${existingTables.length}):`);

        // Mostrar las primeras 10 tablas y contar el total
        const displayTables = existingTables.slice(0, 10);
        displayTables.forEach(table => console.log(`      - ${table}`));
        if (existingTables.length > 10) {
          console.log(`      ... y ${existingTables.length - 10} tablas más`);
        }

        console.log('   ✅ Saltando initial_schema para proteger estructura y datos existentes');
        console.log('   ℹ️  Las tablas ya fueron creadas previamente');
        console.log('   ℹ️  Las nuevas funcionalidades se agregarán mediante migraciones incrementales');
        return; // NO ejecutar el SQL, salir inmediatamente
      }

      // Solo ejecutar si es una BD completamente nueva (sin tablas de usuario)
      console.log('   📝 Base de datos nueva detectada (sin tablas), creando esquema inicial...');
      const schemaPath = path.join(__dirname, '../../crear_tablas.sql');
      if (fs.existsSync(schemaPath)) {
        await executeSqlFile(db, schemaPath);
        console.log('   ✅ Esquema inicial creado exitosamente');
      }
    }
  },
  {
    name: 'add_apoderados_suplentes',
    version: '1.1.0',
    description: 'Agregar campo apoderados_suplentes a tablas de alumnos',
    async up(db) {
      // Obtener todas las tablas de alumnos
      const tables = await new Promise((resolve, reject) => {
        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'alumnos_%'",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
          }
        );
      });

      console.log(`   📋 Tablas de alumnos encontradas: ${tables.join(', ')}`);

      for (const table of tables) {
        await addColumnIfNotExists(
          db,
          table,
          'apoderados_suplentes',
          'TEXT'
        );
      }
    }
  },
  {
    name: 'add_eliminado_fields',
    version: '1.1.0',
    description: 'Agregar campos de eliminación suave',
    async up(db) {
      const tables = await new Promise((resolve, reject) => {
        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'alumnos_%'",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
          }
        );
      });

      for (const table of tables) {
        await addColumnIfNotExists(db, table, 'eliminado', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'motivo_eliminacion', 'TEXT');
      }
    }
  },
  {
    name: 'ensure_backups_table',
    version: '1.1.0',
    description: 'Asegurar tabla de backups',
    async up(db) {
      return new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_archivo TEXT NOT NULL,
            ruta TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('manual', 'automático')),
            tamano INTEGER NOT NULL,
            registros INTEGER NOT NULL,
            anio INTEGER NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            creado_por TEXT NOT NULL
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('   ✅ Tabla backups verificada');
            resolve();
          }
        });
      });
    }
  },
  {
    name: 'fix_missing_student_columns_v1_2',
    version: '1.2.0',
    description: 'Añade columnas faltantes a todas las tablas de alumnos para alinear con el código de la aplicación.',
    async up(db) {
      const tables = await new Promise((resolve, reject) => {
        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'alumnos_%'",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
          }
        );
      });

      console.log(`   📋 Tablas de alumnos encontradas para actualizar: ${tables.join(', ')}`);

      for (const table of tables) {
        console.log(`   🔄 Verificando columnas para la tabla: ${table}`);
        await addColumnIfNotExists(db, table, 'observaciones_matriculador', 'TEXT');
        await addColumnIfNotExists(db, table, 'pae', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'religion', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'tipo_religion', 'TEXT');
        await addColumnIfNotExists(db, table, 'fecha_retiro', 'DATE');
        await addColumnIfNotExists(db, table, 'observacion_retiro', 'TEXT');
      }
    }
  },
  {
    name: 'add_nee_columns',
    version: '1.3.0',
    description: 'Agregar columnas para Necesidades Educativas Especiales (NEE)',
    async up(db) {
      const tables = await new Promise((resolve, reject) => {
        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'alumnos_%'",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
          }
        );
      });

      console.log(`   📋 Agregando columnas NEE a tablas: ${tables.join(', ')}`);

      for (const table of tables) {
        console.log(`   🔄 Actualizando tabla: ${table}`);

        // A. Sensoriales
        await addColumnIfNotExists(db, table, 'nee_discapacidad_visual_total', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_baja_vision', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_discapacidad_auditiva_total', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_hipoacusia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_implante_coclear', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_materiales_adaptados', 'BOOLEAN DEFAULT 0');

        // B. Motrices / Físicas
        await addColumnIfNotExists(db, table, 'nee_discapacidad_motora', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_paralisis_cerebral', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_dificultad_coordinacion', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_ayudas_tecnicas', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_apoyo_desplazamiento', 'BOOLEAN DEFAULT 0');

        // C. Cognitivas / Intelectuales
        await addColumnIfNotExists(db, table, 'nee_discapacidad_intelectual_leve', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_discapacidad_intelectual_moderada', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_retraso_desarrollo', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_dificultad_razonamiento', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_adaptaciones_curriculares', 'BOOLEAN DEFAULT 0');

        // D. Trastornos del Neurodesarrollo
        await addColumnIfNotExists(db, table, 'nee_tea_grado1', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_tea_grado2', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_tea_grado3', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_tel', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_dispraxia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_tdah', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_trastorno_comunicacion', 'BOOLEAN DEFAULT 0');

        // E. Dificultades Específicas del Aprendizaje
        await addColumnIfNotExists(db, table, 'nee_dislexia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_disortografia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_disgrafia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_discalculia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_dificultades_aprendizaje', 'BOOLEAN DEFAULT 0');

        // F. Trastornos Emocionales y Conductuales
        await addColumnIfNotExists(db, table, 'nee_trastorno_conducta', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_trastorno_ansiedad', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_trastorno_animo', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_dificultad_autorregulacion', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_conductas_disruptivas', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_problemas_convivencia', 'BOOLEAN DEFAULT 0');

        // G. Condiciones Médicas Relevantes
        await addColumnIfNotExists(db, table, 'nee_epilepsia', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_diabetes', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_asma', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_enfermedad_cardiaca', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_otras_condiciones_medicas', 'BOOLEAN DEFAULT 0');

        // H. Altas Capacidades / Talentos
        await addColumnIfNotExists(db, table, 'nee_altas_capacidades', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_talento_artistico', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_enriquecimiento_curricular', 'BOOLEAN DEFAULT 0');

        // I. Contexto Familiar y Socioemocional
        await addColumnIfNotExists(db, table, 'nee_vulnerabilidad_social', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_negligencia_maltrato', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_acompanamiento_duelo', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_apoyo_ansiedad_escolar', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_ausencias_prolongadas', 'BOOLEAN DEFAULT 0');

        // J. Otras Necesidades Específicas
        await addColumnIfNotExists(db, table, 'nee_dificultades_temporales', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_lengua_materna_distinta', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_comunicacion_alternativa', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_adaptaciones_acceso', 'BOOLEAN DEFAULT 0');
        await addColumnIfNotExists(db, table, 'nee_otra_necesidad', 'BOOLEAN DEFAULT 0');

        // Campo de texto para especificar otras necesidades
        await addColumnIfNotExists(db, table, 'nee_observaciones', 'TEXT');
      }
    }
  }
];

/**
 * Ejecutar todas las migraciones pendientes
 */
const runMigrations = async (db) => {
  console.log('🔄 Verificando migraciones de base de datos...');

  try {
    // Crear tabla de migraciones
    await createMigrationsTable(db);

    // Ejecutar cada migración
    for (const migration of migrations) {
      const applied = await isMigrationApplied(db, migration.name);

      if (!applied) {
        console.log(`📦 Aplicando migración: ${migration.name} (${migration.version})`);
        console.log(`   ${migration.description}`);

        await migration.up(db);
        await markMigrationApplied(db, migration.name, migration.version);

        console.log(`✅ Migración completada: ${migration.name}`);
      } else {
        console.log(`⏭️ Migración ya aplicada: ${migration.name}`);
      }
    }

    console.log('✅ Todas las migraciones completadas\n');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  }
};

/**
 * Obtener versión actual del esquema
 */
const getCurrentSchemaVersion = async (db) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT version FROM _migraciones ORDER BY aplicada_en DESC LIMIT 1',
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.version : '0.0.0');
      }
    );
  });
};

module.exports = {
  runMigrations,
  getCurrentSchemaVersion,
  addColumnIfNotExists
};
