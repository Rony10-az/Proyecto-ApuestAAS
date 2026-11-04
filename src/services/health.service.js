const healthRepository = require('../repositories/health.repository');
const { instanceId } = require('../config/env');

function getStatus() {
  return { ...healthRepository.getStatus(), instance: instanceId };
}

module.exports = {
  getStatus,
};
