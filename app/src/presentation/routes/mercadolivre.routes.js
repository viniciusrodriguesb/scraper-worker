const { Router } = require('express');
const { search } = require('../controllers/mercadolivre.controller');

const router = Router();

router.get('/mercadolivre/search', search);

module.exports = router;