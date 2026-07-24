/**
 * Script para verificar integridad del esquema de la base de datos
 * Compara la estructura actual con lo que debería existir
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../matricula.db');

// Tablas esperadas del esquema base
const EXPECTED_TABLES = [
  'usuarios',
  'anio_vigente',
  'cursos_asignados',
  'alumnos_2025',
  'alumnos_2026',
  'apoderados',
  'alumno_apoderado',
  'documentos_pendientes',
  'logs_importacion',
  'backups',
  '_migraciones'
];

// Columnas críticas esperadas en tablas de alumnos (agregadas por migraciones)
const EXPECTED_STUDENT_COLUMNS = [
  'apoderados_suplentes',
  'eliminado',
  'motivo_eliminacion',
  'observaciones_matriculador',
  'pae',
  'religion',
  'tipo_religion',
  'fecha_retiro',
  'observacion_retiro',
  // Columnas NEE (v1.3.0) - solo algunas representativas
  'nee_discapacidad_visual_total',
  'nee_tea_grado1',
  'nee_tdah',
  'nee_dislexia',
  'nee_observaciones'
];

async function getAllTables(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT name FROM sqlite_master
       WHERE type='table'
       AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      }
    );
  });
}

async function getTableColumns(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.name));
    });
  });
}

async function getRowCount(db, tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

async function verifySchema() {
  console.log('🔍 VERIFICACIÓN DE ESQUEMA DE BASE DE DATOS\n');
  console.log('📁 Base de datos:', DB_PATH);
  console.log('─'.repeat(80));

  const db = new sqlite3.Database(DB_PATH);

  try {
    // 1. Obtener todas las tablas actuales
    const currentTables = await getAllTables(db);
    console.log(`\n📊 TABLAS ACTUALES: ${currentTables.length}`);

    if (currentTables.length === 0) {
      console.log('   ⚠️  BASE DE DATOS VACÍA - No hay tablas creadas');
      console.log('   ℹ️  Ejecuta el servidor para que las migraciones creen el esquema');
      db.close();
      return;
    }

    currentTables.forEach(table => console.log(`   ✓ ${table}`));

    // 2. Verificar tablas faltantes
    const missingTables = EXPECTED_TABLES.filter(t => !currentTables.includes(t));

    console.log(`\n🔍 TABLAS ESPERADAS: ${EXPECTED_TABLES.length}`);
    if (missingTables.length > 0) {
      console.log(`   ❌ FALTANTES (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`      - ${table}`));
    } else {
      console.log('   ✅ Todas las tablas base están presentes');
    }

    // 3. Verificar tablas adicionales (no esperadas)
    const extraTables = currentTables.filter(t => !EXPECTED_TABLES.includes(t));
    if (extraTables.length > 0) {
      console.log(`\n📋 TABLAS ADICIONALES (${extraTables.length}):`);
      extraTables.forEach(table => console.log(`   + ${table}`));
    }

    // 4. Verificar columnas en tablas de alumnos
    console.log('\n🎓 VERIFICACIÓN DE TABLAS DE ALUMNOS:');
    const studentTables = currentTables.filter(t => t.startsWith('alumnos_'));

    for (const table of studentTables) {
      const columns = await getTableColumns(db, table);
      const rowCount = await getRowCount(db, table);
      console.log(`\n   📝 ${table} (${rowCount} registros, ${columns.length} columnas)`);

      const missingColumns = EXPECTED_STUDENT_COLUMNS.filter(c => !columns.includes(c));
      if (missingColumns.length > 0) {
        console.log(`      ❌ Columnas faltantes (${missingColumns.length}):`);
        missingColumns.slice(0, 5).forEach(col => console.log(`         - ${col}`));
        if (missingColumns.length > 5) {
          console.log(`         ... y ${missingColumns.length - 5} más`);
        }
      } else {
        console.log(`      ✅ Todas las columnas esperadas están presentes`);
      }
    }

    // 5. Verificar migraciones aplicadas
    if (currentTables.includes('_migraciones')) {
      console.log('\n📦 MIGRACIONES APLICADAS:');
      const migrations = await new Promise((resolve, reject) => {
        db.all('SELECT nombre, version, aplicada_en FROM _migraciones ORDER BY aplicada_en', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (migrations.length === 0) {
        console.log('   ⚠️  No hay migraciones registradas');
      } else {
        migrations.forEach(m => {
          console.log(`   ✓ ${m.nombre} (${m.version}) - ${m.aplicada_en}`);
        });
      }
    }

    // 6. Resumen final
    console.log('\n' + '─'.repeat(80));
    console.log('📋 RESUMEN:');
    console.log(`   Tablas actuales: ${currentTables.length}`);
    console.log(`   Tablas faltantes: ${missingTables.length}`);
    console.log(`   Tablas adicionales: ${extraTables.length}`);

    if (missingTables.length === 0 && studentTables.length > 0) {
      console.log('\n   ✅ ESQUEMA COMPLETO - Listo para producción');
    } else if (missingTables.length > 0) {
      console.log('\n   ⚠️  ESQUEMA INCOMPLETO - Ejecuta el servidor para aplicar migraciones');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

// Ejecutar verificación
verifySchema().catch(console.error);
