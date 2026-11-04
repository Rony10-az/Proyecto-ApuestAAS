const roomService = require('../services/room.service');

function create(req, res) {
  res.status(201).json(roomService.create(req.user.id, req.body));
}

function join(req, res) {
  res.json(roomService.join(req.user.id, req.body));
}

function listMine(req, res) {
  res.json(roomService.listMine(req.user.id));
}

function getById(req, res) {
  res.json(roomService.getById(req.user.id, req.params.id));
}

function ranking(req, res) {
  res.json(roomService.ranking(req.user.id, req.params.id));
}

module.exports = {
  create,
  join,
  listMine,
  getById,
  ranking,
};
