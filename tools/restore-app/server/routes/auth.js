const express = require('express');
const jwt = require('jsonwebtoken');

function authRoutes(config) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Validate credentials
    if (username !== config.auth.username || password !== config.auth.password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' },
      config.auth.jwtSecret,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      expiresIn: 3600
    });
  });

  return router;
}

module.exports = authRoutes;
