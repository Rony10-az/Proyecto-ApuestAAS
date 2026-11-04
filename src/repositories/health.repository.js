function getStatus() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getStatus,
};
