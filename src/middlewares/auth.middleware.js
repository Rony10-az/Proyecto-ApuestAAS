const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');

function requireAuth(req, _res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    const error = new Error('Se requiere un token Bearer');
    error.statusCode = 401;
    return next(error);
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = userRepository.findById(payload.sub);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 401;
      return next(error);
    }
    req.user = user;
    return next();
  } catch (error) {
    error.statusCode = 401;
    return next(new Error('Token inválido o expirado'));
  }
}

module.exports = {
  requireAuth,
};
