const dotenv = require('dotenv');

dotenv.config();

const port = Number(process.env.PORT) || 3000;

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  instanceId: process.env.INSTANCE_ID || 'local',
};
