const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const matchRoutes = require('./routes/match.routes');
const predictionRoutes = require('./routes/prediction.routes');
const rankingRoutes = require('./routes/ranking.routes');
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
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/ranking', rankingRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
