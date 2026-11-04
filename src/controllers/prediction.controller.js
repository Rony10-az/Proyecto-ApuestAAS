const predictionService = require('../services/prediction.service');

function save(req, res) {
  res.status(201).json(predictionService.save(req.user.id, req.body));
}

function listMine(req, res) {
  res.json(predictionService.listByUser(req.user.id));
}

module.exports = { save, listMine };
