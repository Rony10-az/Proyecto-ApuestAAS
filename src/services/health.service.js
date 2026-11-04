const healthRepository = require('../repositories/health.repository');

function getStatus() {
  return healthRepository.getStatus();
}

module.exports = {
  getStatus,
};
