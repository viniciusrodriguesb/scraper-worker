const { Router } = require('express');
const { search } = require('../controllers/search.controller');

const router = Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Busca produtos consolidados entre os scrapers
 *     tags:
 *       - Busca
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texto da busca
 *         example: iphone 17e
 *       - in: query
 *         name: maxPrice
 *         required: false
 *         schema:
 *           type: number
 *         description: Preço máximo aceito
 *         example: 4000
 *       - in: query
 *         name: categoryPath
 *         required: false
 *         schema:
 *           type: string
 *         description: Caminho opcional de categoria para provedores que suportam
 *         example: celulares-e-telefones/smartphones
 *     responses:
 *       200:
 *         description: Busca realizada com sucesso
 *       400:
 *         description: Erro de validação
 *       500:
 *         description: Erro interno
 */
router.get('/search', search);

module.exports = router;