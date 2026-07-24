const { prisma } = require('../config/db');
const { getErrorMessage, sanitizeCSVField } = require('../utils/helpers');
const secLog = require('../utils/securityLogger');
const bcrypt = require('bcryptjs');

async function getUsers(req, res) {
  try {
    const [users, assignedCourses] = await Promise.all([
      prisma.usuarios.findMany({
        select: { id: true, username: true, nombre: true, rol: true, estado: true },
        orderBy: { nombre: 'asc' }
      }),
      prisma.cursos_asignados.findMany({
        select: { usuario_id: true, curso_base: true, letra: true }
      })
    ]);

    const usersWithCourses = users.map(user => {
      const courses = assignedCourses
        .filter(c => c.usuario_id === user.id)
        .map(c => ({ base: c.curso_base, letra: c.letra }));
      return { ...user, assignedCourses: courses };
    });

    res.json(usersWithCourses);
  } catch (error) {
    console.error('[Users] Error en getUsers:', error);
    res.status(500).json({ error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { username, nombre, rol, estado } = req.body;

    if (!username || !nombre || !rol) {
      return res.status(400).json({ message: 'Username, nombre y rol son obligatorios.' });
    }
    if (!VALID_ROLES.includes(rol)) {
      return res.status(400).json({ message: `Rol inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` });
    }

    const result = await prisma.usuarios.updateMany({
      where: { id: BigInt(id) },
      data: { username, nombre, rol, estado: estado || 'activo' }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
    }
    console.error('[Users] Error en updateUser:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function updateUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'La nueva contraseña es obligatoria.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await prisma.usuarios.updateMany({
      where: { id: BigInt(id) },
      data: { password_hash: hashedPassword }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('[Users] Error en updateUserPassword:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }

    await prisma.cursos_asignados.deleteMany({ where: { usuario_id: BigInt(id) } });

    const result = await prisma.usuarios.deleteMany({ where: { id: BigInt(id) } });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    secLog.userWrite(req, 'DELETE_USER', id);
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('[Users] Error en deleteUser:', error);
    res.status(500).json({ error: error.message });
  }
}

async function exportUsers(req, res) {
  try {
    const users = await prisma.usuarios.findMany({
      select: { username: true, nombre: true, rol: true, estado: true, creado_en: true },
      orderBy: { creado_en: 'desc' }
    });

    const csvHeader = 'RUT,Nombre,Rol,Estado,Fecha de Creación\n';
    const csvRows = users.map(user => {
      const rut = sanitizeCSVField(user.username);
      const nombre = sanitizeCSVField(user.nombre);
      const rol = sanitizeCSVField(user.rol);
      const estado = sanitizeCSVField(user.estado || 'activo');
      const fecha = user.creado_en ? new Date(user.creado_en).toLocaleDateString('es-CL') : '';
      return `"${rut}","${nombre}","${rol}","${estado}","${fecha}"`;
    }).join('\n');

    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="usuarios_${fecha}.csv"`);
    res.send('﻿' + csvHeader + csvRows);
  } catch (error) {
    console.error('[Users] Error en exportUsers:', error);
    res.status(500).json({ error: error.message });
  }
}

async function importUsers(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo CSV.' });
    }

    const csvContent = req.file.buffer.toString('utf8');
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 2) {
      return res.status(400).json({ message: 'El archivo CSV debe tener al menos una línea de encabezado y una de datos.' });
    }

    const header = lines[0].toLowerCase();
    const expectedHeaders = ['usuario', 'contraseña', 'nombre_completo', 'rol'];
    const actualHeaders = header.split(',').map(h => h.trim());
    const headerValid = expectedHeaders.every((h, i) => actualHeaders[i] && actualHeaders[i].includes(h));

    if (!headerValid) {
      return res.status(400).json({ message: 'Formato de encabezado incorrecto. Se esperan las columnas: usuario,contraseña,nombre_completo,rol' });
    }

    const result = { success: false, created: 0, updated: 0, errors: [], duplicates: [] };
    const validRoles = ['profesor', 'inspector', 'administrador', 'sololectura'];

    const validateRut = rut => /^\d{7,8}$/.test(rut.toString());
    const validateDate = dateStr => {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return false;
      const [day, month, year] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && year >= 1900 && year <= 2100;
    };

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      if (columns.length < 4) { result.errors.push(`Línea ${i + 1}: Faltan columnas`); continue; }

      const [usuario, contraseña, nombreCompleto, rol] = columns;

      if (!validateRut(usuario)) { result.errors.push(`Línea ${i + 1}: RUT inválido "${usuario}"`); continue; }
      if (!validateDate(contraseña)) { result.errors.push(`Línea ${i + 1}: Fecha inválida "${contraseña}"`); continue; }
      if (!nombreCompleto || nombreCompleto.length < 3) { result.errors.push(`Línea ${i + 1}: Nombre inválido "${nombreCompleto}"`); continue; }
      if (!validRoles.includes(rol)) { result.errors.push(`Línea ${i + 1}: Rol inválido "${rol}"`); continue; }

      try {
        const existingUser = await prisma.usuarios.findFirst({ where: { username: usuario } });
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        if (existingUser) {
          await prisma.usuarios.update({
            where: { id: existingUser.id },
            data: { password_hash: hashedPassword, nombre: nombreCompleto, rol, estado: 'activo' }
          });
          result.updated++;
        } else {
          let userId;
          if (/^\d+$/.test(usuario)) {
            userId = BigInt(usuario);
          } else {
            const maxUser = await prisma.usuarios.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
            userId = maxUser ? BigInt(Number(maxUser.id) + 1) : BigInt(1);
          }
          await prisma.usuarios.create({
            data: { id: userId, username: usuario, password_hash: hashedPassword, nombre: nombreCompleto, rol, estado: 'activo' }
          });
          result.created++;
        }
      } catch (dbError) {
        result.errors.push(`Línea ${i + 1}: Error de base de datos - ${dbError.message}`);
      }
    }

    result.success = result.created > 0 || result.updated > 0 || result.errors.length === 0;
    res.json(result);
  } catch (error) {
    console.error('[Users] Error en importUsers:', error);
    res.status(500).json({ message: 'Error interno del servidor durante la importación.' });
  }
}

const VALID_ROLES = ['profesor', 'inspector', 'administrador', 'sololectura'];

async function registerUser(req, res) {
  try {
    const { username, password, nombre, rol, estado } = req.body;

    if (!username || !password || !nombre || !rol) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (!VALID_ROLES.includes(rol)) {
      return res.status(400).json({ message: `Rol inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userId;
    if (/^\d+$/.test(username)) {
      userId = BigInt(username);
    } else {
      const maxUser = await prisma.usuarios.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
      userId = maxUser ? BigInt(Number(maxUser.id) + 1) : BigInt(1);
    }

    const newUser = await prisma.usuarios.create({
      data: { id: userId, username, password_hash: hashedPassword, nombre, rol, estado: estado || 'activo' }
    });

    secLog.userWrite(req, 'CREATE_USER', Number(newUser.id));
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: Number(newUser.id) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
    }
    console.error('[Users] Error en registerUser:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function getTeachers(req, res) {
  try {
    const data = await prisma.usuarios.findMany({
      where: { rol: 'profesor' },
      select: { id: true, nombre: true, username: true },
      orderBy: { nombre: 'asc' }
    });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener profesores.', error: getErrorMessage(error) });
  }
}

module.exports = { getUsers, updateUser, updateUserPassword, deleteUser, exportUsers, importUsers, registerUser, getTeachers };
