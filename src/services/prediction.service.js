const matchRepository = require('../repositories/match.repository');
const predictionRepository = require('../repositories/prediction.repository');
const { calculatePredictionPoints } = require('./scoring.service');

function save(userId, { matchId, homeScore, awayScore }) {
  if (!matchId || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)
    || homeScore < 0 || awayScore < 0) {
    const error = new Error('Partido y marcadores válidos son obligatorios');
    error.statusCode = 400;
    throw error;
  }
  const match = matchRepository.findById(matchId);
  if (!match) {
    const error = new Error('Partido no encontrado');
    error.statusCode = 404;
    throw error;
  }
  if (match.status === 'finished' || new Date() >= new Date(match.startsAt)) {
    const error = new Error('Las predicciones se cierran cuando inicia el partido');
    error.statusCode = 409;
    throw error;
  }
  return predictionRepository.save({ userId, matchId, homeScore, awayScore });
}

function listByUser(userId) {
  return predictionRepository.listByUser(userId).map((prediction) => ({
    ...prediction,
    match: matchRepository.findById(prediction.matchId),
    score: calculatePredictionPoints(
      prediction,
      matchRepository.findById(prediction.matchId),
    ),
  }));
}

module.exports = {
  save,
  listByUser,
};
