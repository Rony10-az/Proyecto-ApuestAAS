const express = require('express');
const roomController = require('../controllers/room.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.post('/', roomController.create);
router.post('/join', roomController.join);
router.get('/mine', roomController.listMine);
router.get('/:id', roomController.getById);
router.get('/:id/ranking', roomController.ranking);

module.exports = router;
