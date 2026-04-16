const {
    searchAmazonProducts,
} = require('./amazon/amazon.scraper');
const {
    searchMercadoLivreProducts,
} = require('./mercado-livre/mercadolivre.scraper');
const {
    searchKabumProducts,
} = require('./kabum/kabum.scraper');

const SCRAPER_PROVIDERS = {
    amazon: (request, limit) =>
        searchAmazonProducts(request.query, {
            minPrice: request.minPrice,
            maxPrice: request.maxPrice,
            limit,
        }),

    mercadolivre: (request, limit) =>
        searchMercadoLivreProducts(request.query, {
            minPrice: request.minPrice,
            maxPrice: request.maxPrice,
            categoryPath: request.categoryPath,
            limit,
        }),

    kabum: (request, limit) =>
        searchKabumProducts(request.query, {
            minPrice: request.minPrice,
            maxPrice: request.maxPrice,
            limit,
        }),
};

module.exports = {
    SCRAPER_PROVIDERS,
};