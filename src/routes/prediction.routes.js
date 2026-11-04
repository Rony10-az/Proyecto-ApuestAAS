const express = require('express');
const predictionController = require('../controllers/prediction.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(requireAuth);
router.get('/mine', predictionController.listMine);
router.post('/', predictionController.save);

module.exports = router;
