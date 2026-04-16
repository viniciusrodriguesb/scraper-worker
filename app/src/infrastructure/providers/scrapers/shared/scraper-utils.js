function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function resolveLimit(value, defaultLimit = 10, maxLimit = 100) {
    if (value === undefined || value === null || value === '') {
        return defaultLimit;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return defaultLimit;
    }

    return Math.min(Math.floor(numericValue), maxLimit);
}

function normalizePriceFilter(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return null;
    }

    return numericValue;
}

module.exports = {
    normalizeText,
    resolveLimit,
    normalizePriceFilter,
};