function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);
  res.status(error.statusCode || 500).json({
    error: 'Error interno del servidor',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
