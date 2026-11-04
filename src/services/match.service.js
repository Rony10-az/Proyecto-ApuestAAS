const matchRepository = require('../repositories/match.repository');

function validateTeams(homeTeam, awayTeam, startsAt) {
  if (!homeTeam || !awayTeam || !startsAt || homeTeam === awayTeam
    || Number.isNaN(new Date(startsAt).getTime())) {
    const error = new Error('Equipos distintos y una fecha de inicio válida son obligatorios');
    error.statusCode = 400;
    throw error;
  }
}

function create(data) {
  validateTeams(data.homeTeam, data.awayTeam, data.startsAt);
  if (new Date(data.startsAt) <= new Date()) {
    const error = new Error('El partido debe programarse en el futuro');
    error.statusCode = 400;
    throw error;
  }
  return matchRepository.create(data);
}

function finish(id, homeScore, awayScore) {
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)
    || homeScore < 0 || awayScore < 0) {
    const error = new Error('Los marcadores deben ser enteros no negativos');
    error.statusCode = 400;
    throw error;
  }
  const match = matchRepository.finish(id, homeScore, awayScore);
  if (!match) {
    const error = new Error('Partido no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return match;
}

module.exports = {
  list: matchRepository.list,
  findById: matchRepository.findById,
  create,
  finish,
};
