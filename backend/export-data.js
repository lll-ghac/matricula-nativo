const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../matricula.db');
const EXPORT_DIR = path.join(__dirname, '../export');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

const tablesToExport = [
  'usuarios',
  'apoderados',
  'alumnos_2025',
  'alumnos_2026',
  'alumnos_2028',
  'alumno_apoderado',
  'cursos_asignados',
  'anio_vigente',
];

function exportTableToCsv(tableName) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.csv`);
  const fileStream = fs.createWriteStream(filePath);

  db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
    if (err) {
      console.error(`Error exporting table ${tableName}:`, err.message);
      return;
    }

    if (rows.length === 0) {
      console.log(`Table ${tableName} is empty.`);
      fileStream.end();
      return;
    }

    const headers = Object.keys(rows[0]);
    fileStream.write(headers.join(',') + '\n');

    rows.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        if (typeof value === 'string') {
          // Escape quotes
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      fileStream.write(values.join(',') + '\n');
    });

    fileStream.end(() => {
      console.log(`Exported table ${tableName} to ${filePath}`);
    });
  });
}

tablesToExport.forEach(exportTableToCsv);

db.close((err) => {
  if (err) {
    console.error('Error closing database', err.message);
  }
  console.log('Database connection closed.');
});