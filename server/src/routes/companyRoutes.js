const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.post('/', companyController.create);
router.get('/', companyController.list);
router.get('/:id', companyController.getById);

module.exports = router;