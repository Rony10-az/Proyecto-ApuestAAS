const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, '../../data');
const databasePath = path.join(dataDirectory, 'db.json');

function ensureDatabase() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
  if (!fs.existsSync(databasePath)) {
    fs.writeFileSync(databasePath, JSON.stringify({
      users: [],
      matches: [],
      predictions: [],
    }, null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(databasePath, 'utf8'));
}

function writeDatabase(database) {
  ensureDatabase();
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
}

module.exports = {
  readDatabase,
  writeDatabase,
};
