const { Router } = require('express');
const { search } = require('../controllers/amazon.controller');

const router = Router();

router.get('/amazon/search', search);

module.exports = router;