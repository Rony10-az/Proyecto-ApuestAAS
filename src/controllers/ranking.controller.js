const { readDatabase } = require('../repositories/json.repository');
const { calculateRanking } = require('../services/scoring.service');

function list(_req, res) {
  const database = readDatabase();
  res.json(calculateRanking(database.users, database.matches, database.predictions));
}

module.exports = { list };
