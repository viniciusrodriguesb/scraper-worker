const AppError = require('../../shared/errors/app.error');

function parseOptionalPrice(value, fieldName) {
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
        throw new AppError(`Valor inválido para ${fieldName}`, {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: fieldName, value },
        });
    }

    return parsed;
}

function parseOptionalInteger(value, fieldName, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new AppError(`Valor inválido para ${fieldName}`, {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: fieldName, value },
        });
    }

    return parsed;
}

function createSearchProductsRequestDto(input) {
    const query = String(input.q || input.query || '').trim();
    const minPrice = parseOptionalPrice(input.minPrice, 'minPrice');
    const maxPrice = parseOptionalPrice(input.maxPrice, 'maxPrice');
    const categoryPath = String(input.categoryPath || '').trim() || null;
    const limit = Math.min(parseOptionalInteger(input.limit, 'limit', 20), 50);

    if (!query) {
        throw new AppError('O parâmetro q é obrigatório', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: 'q' },
        });
    }

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        throw new AppError('minPrice não pode ser maior que maxPrice', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { minPrice, maxPrice },
        });
    }

    return {
        query,
        minPrice,
        maxPrice,
        categoryPath,
        limit,
    };
}

module.exports = {
    createSearchProductsRequestDto,
};