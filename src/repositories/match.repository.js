const { randomUUID } = require('crypto');
const { readDatabase, withLock } = require('./json.repository');

function list() {
  return readDatabase().matches.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function findById(id) {
  return readDatabase().matches.find((match) => match.id === id);
}

function create({ homeTeam, awayTeam, startsAt }) {
  return withLock((database) => {
    const match = {
      id: randomUUID(),
      homeTeam,
      awayTeam,
      startsAt,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    database.matches.push(match);
    return match;
  });
}

function finish(id, homeScore, awayScore) {
  return withLock((database) => {
    const match = database.matches.find((item) => item.id === id);
    if (!match) return null;
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = 'finished';
    return match;
  });
}

module.exports = {
  list,
  findById,
  create,
  finish,
};
