const express = require('express');
const rankingController = require('../controllers/ranking.controller');

const router = express.Router();
router.get('/', rankingController.list);

module.exports = router;
