const authService = require('../services/auth.service');

function register(req, res) {
  res.status(201).json(authService.register(req.body));
}

function login(req, res) {
  res.status(200).json(authService.login(req.body));
}

module.exports = { register, login };
