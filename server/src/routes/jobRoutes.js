const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.post('/', jobController.create);
router.get('/company/:companyId', jobController.listByCompany);
router.get('/:id/pipeline', jobController.getPipeline);
router.patch('/:id/status', jobController.updateStatus);

module.exports = router;