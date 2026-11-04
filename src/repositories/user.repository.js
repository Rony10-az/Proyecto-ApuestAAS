const { randomUUID } = require('crypto');
const { readDatabase, withLock } = require('./json.repository');

function findByEmail(email) {
  return readDatabase().users.find((user) => user.email === email.toLowerCase());
}

function findById(id) {
  return readDatabase().users.find((user) => user.id === id);
}

function create({ name, email, passwordHash }) {
  return withLock((database) => {
    const normalizedEmail = email.toLowerCase();
    if (database.users.some((user) => user.email === normalizedEmail)) {
      const error = new Error('El correo ya está registrado');
      error.statusCode = 409;
      throw error;
    }
    const user = {
      id: randomUUID(),
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    database.users.push(user);
    return user;
  });
}

function list() {
  return readDatabase().users;
}

module.exports = {
  findByEmail,
  findById,
  create,
  list,
};
