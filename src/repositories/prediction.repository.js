const { randomUUID } = require('crypto');
const { readDatabase, writeDatabase } = require('./json.repository');

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
  const database = readDatabase();
  const current = database.predictions.find(
    (prediction) => prediction.userId === userId && prediction.matchId === matchId,
  );
  if (current) {
    current.homeScore = homeScore;
    current.awayScore = awayScore;
    current.updatedAt = new Date().toISOString();
    writeDatabase(database);
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
  writeDatabase(database);
  return prediction;
}

module.exports = {
  findByUserAndMatch,
  listByUser,
  listByMatch,
  save,
};
