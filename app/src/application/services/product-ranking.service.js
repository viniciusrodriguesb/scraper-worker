const { normalizeComparisonText } = require('../dtos/shared-product.dto');

const ACCESSORY_KEYWORDS = [
    'mochila',
    'capa',
    'case',
    'funda',
    'bolsa',
    'pano',
    'mouse',
    'teclado',
    'suporte',
    'carregador',
    'fonte',
    'pelicula',
    'adesivo',
    'maleta',
    'base',
    'cooler',
    'protetor',
];

function tokenize(text) {
    return normalizeComparisonText(text)
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item.length >= 2);
}

function isLikelyAccessory(title) {
    const normalizedTitle = normalizeComparisonText(title);
    return ACCESSORY_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
}

function computeTokenCoverage(query, title) {
    const queryTokens = tokenize(query);
    const titleTokens = tokenize(title);

    if (!queryTokens.length) {
        return 0;
    }

    const matchedTokens = queryTokens.filter((token) => titleTokens.includes(token));

    return matchedTokens.length / queryTokens.length;
}

function scoreProduct(product, request) {
    let score = 0;
    const reasons = [];

    const tokenCoverage = computeTokenCoverage(request.query, product.title);

    score += Math.round(tokenCoverage * 100);
    reasons.push(`match:${Math.round(tokenCoverage * 100)}`);

    if (!product.isSponsored) {
        score += 15;
        reasons.push('non-sponsored');
    } else {
        score -= 20;
        reasons.push('sponsored-penalty');
    }

    if (product.hasDirectProductUrl) {
        score += 15;
        reasons.push('direct-url');
    } else {
        score -= 25;
        reasons.push('tracking-url-penalty');
    }

    if (product.priceValue !== null) {
        score += 10;
        reasons.push('has-price');
    }

    if (product.seller) {
        score += 5;
        reasons.push('has-seller');
    }

    if (product.rating) {
        score += 5;
        reasons.push('has-rating');
    }

    if (product.soldQuantity) {
        score += 5;
        reasons.push('has-sold-quantity');
    }

    if (product.shipping) {
        score += 3;
        reasons.push('has-shipping-info');
    }

    if (product.installments) {
        score += 2;
        reasons.push('has-installments');
    }

    if (product.condition) {
        score += 2;
        reasons.push('has-condition');
    }

    if (isLikelyAccessory(product.title)) {
        score -= 80;
        reasons.push('accessory-penalty');
    }

    return {
        ...product,
        score,
        scoreReasons: reasons,
    };
}

function deduplicateProducts(products) {
    const map = new Map();

    for (const product of products) {
        const fallbackKey = `${product.normalizedTitle}|${Math.round(product.priceValue || 0)}`;
        const key = product.hasDirectProductUrl
            ? product.canonicalUrl
            : `${product.source}|${fallbackKey}`;

        if (!map.has(key)) {
            map.set(key, product);
            continue;
        }

        const current = map.get(key);

        if (product.score > current.score) {
            map.set(key, product);
        }
    }

    return Array.from(map.values());
}

function rankProducts(products, request, limit) {
    const scored = products.map((product) => scoreProduct(product, request));
    const deduplicated = deduplicateProducts(scored);

    const ranked = deduplicated.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        if (a.priceValue !== null && b.priceValue !== null && a.priceValue !== b.priceValue) {
            return a.priceValue - b.priceValue;
        }

        return a.title.localeCompare(b.title);
    });

    return ranked.slice(0, limit).map((item, index) => ({
        rank: index + 1,
        source: item.source,
        title: item.title,
        url: item.url,
        price: item.price,
        priceValue: item.priceValue,
        seller: item.seller,
        rating: item.rating,
        soldQuantity: item.soldQuantity,
        thumbnail: item.thumbnail,
        installments: item.installments,
        shipping: item.shipping,
        condition: item.condition,
        isSponsored: item.isSponsored,
        score: item.score,
        scoreReasons: item.scoreReasons,
    }));
}

module.exports = {
    rankProducts,
};