const matchService = require('../services/match.service');

function list(_req, res) {
  res.json(matchService.list());
}

function create(req, res) {
  res.status(201).json(matchService.create(req.body));
}

function finish(req, res) {
  res.json(matchService.finish(
    req.params.id,
    req.body.homeScore,
    req.body.awayScore,
  ));
}

module.exports = { list, create, finish };
