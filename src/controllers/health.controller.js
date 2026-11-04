const healthService = require('../services/health.service');

function getHealth(_req, res) {
  res.status(200).json(healthService.getStatus());
}

module.exports = {
  getHealth,
};
