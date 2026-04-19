const express = require('express');
const router = express.Router();
const appController = require('../controllers/applicationController');

router.post('/', appController.apply);
router.get('/lookup', appController.lookupByEmail);
router.get('/:id', appController.getStatus);
router.get('/:id/history', appController.getHistory);
router.post('/:id/exit', appController.exit);
router.post('/:id/acknowledge', appController.acknowledge);

module.exports = router;