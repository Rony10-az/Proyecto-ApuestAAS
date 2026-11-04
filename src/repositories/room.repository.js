const { randomUUID, randomInt } = require('crypto');
const { readDatabase, withLock } = require('./json.repository');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function list() {
  return readDatabase().rooms || [];
}

function findById(id) {
  return list().find((room) => room.id === id);
}

function findByCode(code) {
  return list().find((room) => room.code === code.toUpperCase());
}

function listByMember(userId) {
  return list().filter((room) => room.memberIds.includes(userId));
}

function create({ name, ownerId }) {
  return withLock((database) => {
    database.rooms = database.rooms || [];
    let code = generateCode();
    while (database.rooms.some((room) => room.code === code)) {
      code = generateCode();
    }
    const room = {
      id: randomUUID(),
      name,
      code,
      ownerId,
      memberIds: [ownerId],
      createdAt: new Date().toISOString(),
    };
    database.rooms.push(room);
    return room;
  });
}

function addMember(code, userId) {
  return withLock((database) => {
    database.rooms = database.rooms || [];
    const room = database.rooms.find((item) => item.code === code.toUpperCase());
    if (!room) {
      const error = new Error('Código de invitación inválido');
      error.statusCode = 404;
      throw error;
    }
    if (!room.memberIds.includes(userId)) {
      room.memberIds.push(userId);
    }
    return room;
  });
}

module.exports = {
  list,
  findById,
  findByCode,
  listByMember,
  create,
  addMember,
};
