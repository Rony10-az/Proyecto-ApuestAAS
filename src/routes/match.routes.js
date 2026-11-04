const express = require('express');
const matchController = require('../controllers/match.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();
router.get('/', matchController.list);
router.post('/', requireAuth, matchController.create);
router.patch('/:id/result', requireAuth, matchController.finish);

module.exports = router;
