const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('../config/env');
const userRepository = require('../repositories/user.repository');

const jwtSecret = process.env.JWT_SECRET || 'educational-secret-change-me';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, name: user.name }, jwtSecret, { expiresIn: '7d' });
}

function register({ name, email, password }) {
  if (!name || !email || !password || password.length < 6) {
    const error = new Error('Nombre, correo y contraseña de al menos 6 caracteres son obligatorios');
    error.statusCode = 400;
    throw error;
  }
  if (userRepository.findByEmail(email)) {
    const error = new Error('El correo ya está registrado');
    error.statusCode = 409;
    throw error;
  }
  const user = userRepository.create({ name, email, passwordHash: hashPassword(password) });
  return { user: publicUser(user), token: createToken(user) };
}

function login({ email, password }) {
  const user = email && userRepository.findByEmail(email);
  if (!user || !password || !verifyPassword(password, user.passwordHash)) {
    const error = new Error('Credenciales inválidas');
    error.statusCode = 401;
    throw error;
  }
  return { user: publicUser(user), token: createToken(user) };
}

module.exports = {
  register,
  login,
  publicUser,
  jwtSecret,
};
