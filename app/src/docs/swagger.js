const swaggerJSDoc = require('swagger-jsdoc');

const opcoesSwagger = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Busca de Produtos',
            version: '1.0.0',
            description: 'Documentação da API de busca consolidada por scrapers',
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Ambiente local',
            },
        ],
        components: {
            schemas: {
                BuscaProdutosResposta: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        query: { type: 'string', example: 'notebook' },
                        filters: {
                            type: 'object',
                            properties: {
                                minPrice: { type: 'number', nullable: true, example: 1000 },
                                maxPrice: { type: 'number', nullable: true, example: 3500 },
                                categoryPath: { type: 'string', nullable: true, example: null },
                                limit: { type: 'integer', example: 20 },
                                collectLimit: { type: 'integer', example: 100 },
                            },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                finalLimit: { type: 'integer', example: 20 },
                                collectLimit: { type: 'integer', example: 100 },
                                totalProviders: { type: 'integer', example: 3 },
                            },
                        },
                        sources: {
                            type: 'object',
                            additionalProperties: true,
                        },
                        totalCollected: { type: 'integer', example: 58 },
                        total: { type: 'integer', example: 20 },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    rank: { type: 'integer', example: 1 },
                                    source: { type: 'string', example: 'amazon' },
                                    title: { type: 'string', example: 'Notebook ASUS Vivobook 15' },
                                    url: { type: 'string', example: 'https://example.com/produto' },
                                    price: { type: 'string', example: 'R$ 2.999,00' },
                                    priceValue: { type: 'number', example: 2999 },
                                    seller: { type: 'string', nullable: true, example: 'Loja Oficial' },
                                    rating: { type: 'string', nullable: true, example: '4,6 de 5 estrelas' },
                                    soldQuantity: { type: 'string', nullable: true, example: '+100 vendidos' },
                                    thumbnail: { type: 'string', nullable: true, example: 'https://example.com/img.jpg' },
                                    installments: { type: 'string', nullable: true, example: 'em 10x' },
                                    shipping: { type: 'string', nullable: true, example: 'Frete grátis' },
                                    condition: { type: 'string', nullable: true, example: 'Novo' },
                                    isSponsored: { type: 'boolean', example: false },
                                    score: { type: 'integer', example: 145 },
                                    scoreReasons: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        example: ['match:100', 'non-sponsored', 'direct-url'],
                                    },
                                },
                            },
                        },
                    },
                },
                ErroPadrao: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Valor inválido para minPrice' },
                    },
                },
            },
        },
    },
    apis: ['./src/presentation/routes/*.js'],
};

const especificacaoSwagger = swaggerJSDoc(opcoesSwagger);

module.exports = {
    especificacaoSwagger,
};