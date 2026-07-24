const jwt = require('jsonwebtoken');

function authMiddleware(config) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

module.exports = authMiddleware;
