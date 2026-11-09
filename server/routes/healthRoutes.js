const express = require('express');
const router = express.Router();
const { getHealthStatus, getDiagnostics } = require('../controllers/healthController');

router.get('/', getHealthStatus);
router.get('/diagnostics', getDiagnostics);
router.get('/counts', getDiagnostics);

module.exports = router;
