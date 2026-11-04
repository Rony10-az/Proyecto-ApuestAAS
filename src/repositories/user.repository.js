const { randomUUID } = require('crypto');
const { readDatabase, writeDatabase } = require('./json.repository');

function findByEmail(email) {
  return readDatabase().users.find((user) => user.email === email.toLowerCase());
}

function findById(id) {
  return readDatabase().users.find((user) => user.id === id);
}

function create({ name, email, passwordHash }) {
  const database = readDatabase();
  const user = {
    id: randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  database.users.push(user);
  writeDatabase(database);
  return user;
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
