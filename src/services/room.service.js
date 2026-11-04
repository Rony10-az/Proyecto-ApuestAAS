const roomRepository = require('../repositories/room.repository');
const userRepository = require('../repositories/user.repository');
const matchRepository = require('../repositories/match.repository');
const predictionRepository = require('../repositories/prediction.repository');
const { calculateRanking } = require('./scoring.service');

function withMembers(room) {
  const members = room.memberIds
    .map((id) => userRepository.findById(id))
    .filter(Boolean)
    .map((user) => ({ id: user.id, name: user.name }));
  return {
    id: room.id,
    name: room.name,
    code: room.code,
    ownerId: room.ownerId,
    createdAt: room.createdAt,
    members,
  };
}

function requireMembership(room, userId) {
  if (!room.memberIds.includes(userId)) {
    const error = new Error('No perteneces a esta sala');
    error.statusCode = 403;
    throw error;
  }
}

function create(ownerId, { name }) {
  if (!name || !name.trim()) {
    const error = new Error('El nombre de la sala es obligatorio');
    error.statusCode = 400;
    throw error;
  }
  const room = roomRepository.create({ name: name.trim(), ownerId });
  return withMembers(room);
}

function join(userId, { code }) {
  if (!code || !code.trim()) {
    const error = new Error('El código de invitación es obligatorio');
    error.statusCode = 400;
    throw error;
  }
  const room = roomRepository.addMember(code.trim(), userId);
  return withMembers(room);
}

function listMine(userId) {
  return roomRepository.listByMember(userId).map(withMembers);
}

function getById(userId, roomId) {
  const room = roomRepository.findById(roomId);
  if (!room) {
    const error = new Error('Sala no encontrada');
    error.statusCode = 404;
    throw error;
  }
  requireMembership(room, userId);
  return withMembers(room);
}

function ranking(userId, roomId) {
  const room = roomRepository.findById(roomId);
  if (!room) {
    const error = new Error('Sala no encontrada');
    error.statusCode = 404;
    throw error;
  }
  requireMembership(room, userId);
  const members = room.memberIds
    .map((id) => userRepository.findById(id))
    .filter(Boolean);
  const predictions = members.flatMap((member) => predictionRepository.listByUser(member.id));
  return calculateRanking(members, matchRepository.list(), predictions);
}

module.exports = {
  create,
  join,
  listMine,
  getById,
  ranking,
};
