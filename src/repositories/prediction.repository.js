const { randomUUID } = require('crypto');
const { readDatabase, withLock } = require('./json.repository');

function findByUserAndMatch(userId, matchId) {
  return readDatabase().predictions.find(
    (prediction) => prediction.userId === userId && prediction.matchId === matchId,
  );
}

function listByUser(userId) {
  return readDatabase().predictions.filter((prediction) => prediction.userId === userId);
}

function listByMatch(matchId) {
  return readDatabase().predictions.filter((prediction) => prediction.matchId === matchId);
}

function save({ userId, matchId, homeScore, awayScore }) {
  return withLock((database) => {
    const current = database.predictions.find(
      (prediction) => prediction.userId === userId && prediction.matchId === matchId,
    );
    if (current) {
      current.homeScore = homeScore;
      current.awayScore = awayScore;
      current.updatedAt = new Date().toISOString();
      return current;
    }
    const prediction = {
      id: randomUUID(),
      userId,
      matchId,
      homeScore,
      awayScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    database.predictions.push(prediction);
    return prediction;
  });
}

module.exports = {
  findByUserAndMatch,
  listByUser,
  listByMatch,
  save,
};
