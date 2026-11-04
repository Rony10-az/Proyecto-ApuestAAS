function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);
  const statusCode = error.statusCode || 500;
  // Solo se expone error.message cuando el propio codigo seteo un
  // statusCode (errores de validacion/negocio con mensaje curado y seguro).
  // Un error inesperado (500 sin statusCode) nunca filtra su mensaje interno.
  const message = error.statusCode ? error.message : 'Error interno del servidor';
  res.status(statusCode).json({ error: message });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
