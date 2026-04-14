const AppError = require('../../shared/errors/app.error');
const {
    searchMercadoLivreProducts,
} = require('../../infrastructure/providers/scrapers/mercado-livre/mercadolivre.scraper');

function parseOptionalPrice(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalized = String(value).trim();

    if (!normalized) {
        return null;
    }

    let prepared = normalized.replace(/\s/g, '');

    if (prepared.includes(',') && prepared.includes('.')) {
        prepared = prepared.replace(/\./g, '').replace(',', '.');
    } else if (prepared.includes(',')) {
        prepared = prepared.replace(',', '.');
    }

    const parsed = Number(prepared);

    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new AppError('Preço inválido', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: 'price', value },
        });
    }

    return parsed;
}

async function search(req, res, next) {
    try {
        const query = String(req.query.q || '').trim();
        const minPrice = parseOptionalPrice(req.query.minPrice);
        const maxPrice = parseOptionalPrice(req.query.maxPrice);
        const categoryPath = String(req.query.categoryPath || '').trim() || null;

        if (!query) {
            throw new AppError('O parâmetro q é obrigatório', {
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                details: {
                    field: 'q',
                },
            });
        }

        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            throw new AppError('minPrice não pode ser maior que maxPrice', {
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                details: {
                    minPrice,
                    maxPrice,
                },
            });
        }

        const items = await searchMercadoLivreProducts(query, {
            minPrice,
            maxPrice,
            categoryPath,
        });

        return res.status(200).json({
            success: true,
            site: 'mercadolivre',
            query,
            filters: {
                minPrice,
                maxPrice,
                categoryPath,
            },
            total: items.length,
            items,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    search,
};