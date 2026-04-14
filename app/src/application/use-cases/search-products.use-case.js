const env = require('../../config/env');
const { createSharedProductDto } = require('../dtos/shared-product.dto');
const { rankProducts } = require('../services/product-ranking.service');
const {
    searchAmazonProducts,
} = require('../../infrastructure/providers/scrapers/amazon/amazon.scraper');
const {
    searchMercadoLivreProducts,
} = require('../../infrastructure/providers/scrapers/mercado-livre/mercadolivre.scraper');

const DEFAULT_PROVIDER_TIMEOUT_MS = env.searchProviderTimeoutMs || 45000;

function withTimeout(promise, timeoutMs, providerName) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Provider ${providerName} excedeu ${timeoutMs}ms`));
            }, timeoutMs);
        }),
    ]);
}

async function executeProvider(providerName, request, timeoutMs) {
    const startedAt = Date.now();

    const providerPromise =
        providerName === 'amazon'
            ? searchAmazonProducts(request.query, {
                minPrice: request.minPrice,
                maxPrice: request.maxPrice,
            })
            : searchMercadoLivreProducts(request.query, {
                minPrice: request.minPrice,
                maxPrice: request.maxPrice,
                categoryPath: request.categoryPath,
            });

    const items = await withTimeout(providerPromise, timeoutMs, providerName);

    return {
        provider: providerName,
        durationMs: Date.now() - startedAt,
        items,
    };
}

async function searchProductsUseCase(request) {
    const providers = ['amazon', 'mercadolivre'];

    const results = await Promise.allSettled(
        providers.map((providerName) =>
            executeProvider(providerName, request, DEFAULT_PROVIDER_TIMEOUT_MS)
        )
    );

    const sources = {};
    const unifiedItems = [];

    for (const result of results) {
        if (result.status === 'fulfilled') {
            const { provider, durationMs, items } = result.value;

            sources[provider] = {
                success: true,
                durationMs,
                total: items.length,
            };

            const mapped = items.map((item) => createSharedProductDto(provider, item));
            unifiedItems.push(...mapped);
            continue;
        }

        const errorMessage = result.reason?.message || 'Erro desconhecido';
        const providerName =
            /amazon/i.test(errorMessage)
                ? 'amazon'
                : /mercadolivre/i.test(errorMessage)
                    ? 'mercadolivre'
                    : 'unknown';

        sources[providerName] = {
            success: false,
            durationMs: null,
            total: 0,
            error: errorMessage,
        };
    }

    const rankedItems = rankProducts(unifiedItems, request, request.limit);

    return {
        success: true,
        query: request.query,
        filters: {
            minPrice: request.minPrice,
            maxPrice: request.maxPrice,
            categoryPath: request.categoryPath,
            limit: request.limit,
        },
        sources,
        totalCollected: unifiedItems.length,
        total: rankedItems.length,
        items: rankedItems,
    };
}

module.exports = {
    searchProductsUseCase,
};