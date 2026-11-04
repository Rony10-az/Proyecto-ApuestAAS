const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const healthRoutes = require('./routes/health.routes');
const {
  notFoundHandler,
  errorHandler,
} = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => {
  res.json({ message: 'API MVC funcionando' });
});

app.use('/api/health', healthRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
