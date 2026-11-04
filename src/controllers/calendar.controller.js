const calendar = require('../data/world-cup-calendar');

function list(req, res) {
  const requestedDays = Number(req.query.days || 2);
  const days = Number.isInteger(requestedDays) && requestedDays > 0
    ? Math.min(requestedDays, 2)
    : 2;
  res.json({ tournament: 'Mundial Qatar 2022', days, matches: calendar.list(days) });
}

module.exports = { list };
