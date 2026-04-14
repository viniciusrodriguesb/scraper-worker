function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeComparisonText(value) {
    return normalizeText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parsePriceValue(rawPrice) {
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
        return null;
    }

    if (typeof rawPrice === 'number') {
        return Number.isFinite(rawPrice) ? rawPrice : null;
    }

    const normalized = String(rawPrice)
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
}

function isTrackingUrl(url) {
    const normalized = String(url || '').toLowerCase();

    return (
        normalized.includes('click1.mercadolivre.com.br') ||
        normalized.includes('/mclics/') ||
        normalized.startsWith('javascript:')
    );
}

function canonicalizeUrl(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return String(url || '').trim() || null;
    }
}

function createSharedProductDto(source, item) {
    const title = normalizeText(item.title);
    const price = item.price || null;
    const priceValue = parsePriceValue(item.priceValue ?? item.price);
    const url = item.url || null;

    return {
        source,
        title,
        normalizedTitle: normalizeComparisonText(title),
        url,
        canonicalUrl: canonicalizeUrl(url),
        price,
        priceValue,
        seller: item.seller ? normalizeText(item.seller) : null,
        rating: item.rating ? normalizeText(item.rating) : null,
        soldQuantity: item.soldQuantity ? normalizeText(item.soldQuantity) : null,
        thumbnail: item.thumbnail || null,
        installments: item.installments ? normalizeText(item.installments) : null,
        shipping: item.shipping ? normalizeText(item.shipping) : null,
        condition: item.condition ? normalizeText(item.condition) : null,
        isSponsored: Boolean(item.isSponsored),
        isTrackingUrl: isTrackingUrl(url),
        hasDirectProductUrl: !isTrackingUrl(url),
        sourceIndex: item.index ?? null,
    };
}

module.exports = {
    createSharedProductDto,
    normalizeComparisonText,
};