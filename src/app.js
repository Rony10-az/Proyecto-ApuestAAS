const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { instanceId } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const matchRoutes = require('./routes/match.routes');
const predictionRoutes = require('./routes/prediction.routes');
const rankingRoutes = require('./routes/ranking.routes');
const calendarRoutes = require('./routes/calendar.routes');
const {
  notFoundHandler,
  errorHandler,
} = require('./middlewares/error.middleware');

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use((_req, res, next) => {
  res.setHeader('X-Instance-Id', instanceId);
  next();
});

app.get('/', (_req, res) => {
  res.redirect('/apuestas');
});

app.get('/apuestas', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/matches', matchRoutes);
app.use('/predictions', predictionRoutes);
app.use('/ranking', rankingRoutes);
app.use('/calendar', calendarRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
