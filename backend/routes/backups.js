const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
    createBackup,
    listBackups,
    deleteBackup,
    BACKUP_DIR
} = require('../utils/postgresBackup');
const { restoreBackupAutomatic } = require('../utils/restoreBackupAutomatic');
const secLog = require('../utils/securityLogger');

// Middleware placeholder - we'll replace this with the actual auth middleware from server.js
const isAdmin = (req, res, next) => {
    // In a real app, this would check req.user.role or similar
    // For now, we assume the check is done before this router is used.
    console.log('Executing backup route, assuming admin access is verified.');
    next();
};

// Protect all backup routes with the admin check
router.use(isAdmin);

// POST /api/admin/backup/create - Create a new PostgreSQL backup
router.post('/create', async (req, res) => {
    try {
        const backupFilePath = await createBackup();
        const backupFileName = path.basename(backupFilePath);
        secLog.backupCreated(req, backupFileName);
        res.status(201).json({
            message: 'Backup created successfully.',
            filename: backupFileName
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to create backup.',
            error: error.message
        });
    }
});

// GET /api/admin/backup/list - List all PostgreSQL backups
router.get('/list', async (req, res) => {
    try {
        const backups = await listBackups();
        res.status(200).json(backups);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to list backups.',
            error: error.message
        });
    }
});

// DELETE /api/admin/backup/delete/:filename - Delete a specific backup
router.delete('/delete/:filename', async (req, res) => {
    const { filename } = req.params;

    // Security: Validate filename to prevent path traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ message: 'Invalid filename.' });
    }

    try {
        await deleteBackup(filename);
        res.status(200).json({ message: `Backup ${filename} deleted successfully.` });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ message: 'Backup file not found.' });
        }
        res.status(500).json({
            message: `Failed to delete backup ${filename}.`,
            error: error.message
        });
    }
});

// Backup download via HTTP is disabled for security reasons.
// Use server-side tools (scp, rsync) to copy backups externally.

// POST /api/admin/backup/restore/:filename - Restore from a specific backup (AUTOMATIC)
router.post('/restore/:filename', async (req, res) => {
    const { filename } = req.params;

    // Security: Validate filename
    if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ message: 'Invalid filename.' });
    }

    try {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔄 RESTAURACIÓN AUTOMÁTICA INICIADA`);
        console.log(`${'='.repeat(70)}`);
        console.log(`Archivo: ${filename}`);
        console.log(`Solicitado por: Admin`);
        console.log(`${'='.repeat(70)}\n`);

        const result = await restoreBackupAutomatic(filename);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`✅ RESTAURACIÓN COMPLETADA`);
        console.log(`${'='.repeat(70)}`);
        console.log(`Archivo: ${filename}`);
        console.log(`Registros restaurados: ${JSON.stringify(result.stats)}`);
        console.log(`Credenciales: ${result.credentials.length} usuarios`);
        console.log(`${'='.repeat(70)}\n`);

        secLog.backupRestored(req, filename);
        res.status(200).json({
            success: true,
            message: `Backup ${filename} restored successfully with automatic password reset.`,
            filename: result.filename,
            credentials: result.credentials,
            stats: result.stats
        });
    } catch (error) {
        console.error(`\n${'='.repeat(70)}`);
        console.error(`❌ ERROR EN RESTAURACIÓN`);
        console.error(`${'='.repeat(70)}`);
        console.error(`Error: ${error.message}`);
        console.error(`${'='.repeat(70)}\n`);

        if (error.message.includes('not found')) {
            return res.status(404).json({ message: 'Backup file not found.' });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to restore backup.',
            error: error.message
        });
    }
});


module.exports = router;
