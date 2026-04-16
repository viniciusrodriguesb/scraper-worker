const { chromium } = require('playwright');
const { KABUM_SELECTORS } = require('./kabum.selectors');

const DEFAULT_NAVIGATION_TIMEOUT_MS = 30000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 60;

function buildKabumSearchUrl(query, options = {}) {
    const pageNumber = options.pageNumber || 1;
    const requestedPageSize = options.limit || options.pageSize || DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    return `https://www.kabum.com.br/busca/${encodeURIComponent(query.trim())}?page_number=${pageNumber}&page_size=${pageSize}&variant=retail`;
}

function normalizeKabumUrl(url) {
    if (!url) {
        return null;
    }

    const absoluteUrl = url.startsWith('http')
        ? url
        : `https://www.kabum.com.br${url}`;

    return absoluteUrl.split('?')[0];
}

function resolveTitle(imageAlt, titleText, ariaLabel) {
    if (imageAlt && imageAlt.trim()) {
        return imageAlt.trim();
    }

    if (titleText && titleText.trim()) {
        return titleText.trim();
    }

    if (!ariaLabel || !ariaLabel.trim()) {
        return null;
    }

    const beforeRating = ariaLabel.split(/,\s*avaliação/i)[0]?.trim();
    if (beforeRating) {
        return beforeRating;
    }

    const beforePrice = ariaLabel.split(/,\s*R\$/i)[0]?.trim();
    return beforePrice || null;
}

function parseBrazilianPriceToNumber(value) {
    if (!value) {
        return null;
    }

    const normalized = value
        .replace('R$', '')
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function extractPriceFromAriaLabel(ariaLabel) {
    if (!ariaLabel) {
        return {
            price: null,
            priceValue: null,
        };
    }

    const match = ariaLabel.match(/R\$\s*[\d\.,]+/i);

    if (!match) {
        return {
            price: null,
            priceValue: null,
        };
    }

    const price = match[0].replace(/\s+/g, ' ').trim();
    const priceValue = parseBrazilianPriceToNumber(price);

    return {
        price,
        priceValue,
    };
}

function extractRatingFromAriaLabel(ariaLabel) {
    if (!ariaLabel) {
        return null;
    }

    const match = ariaLabel.match(/avaliação\s+([\d\.,]+)\s+estrelas?\s+de\s+5/i);

    if (!match) {
        return null;
    }

    return match[1].trim();
}

function isWithinPriceRange(priceValue, options) {
    if (priceValue === null) {
        return false;
    }

    if (options.minPrice != null && priceValue < options.minPrice) {
        return false;
    }

    if (options.maxPrice != null && priceValue > options.maxPrice) {
        return false;
    }

    return true;
}

async function extractKabumProducts(page, options = {}) {
    const cards = page.locator(KABUM_SELECTORS.card);

    try {
        await cards.first().waitFor({
            state: 'visible',
            timeout: 10000,
        });
    } catch {
        return [];
    }

    const totalCards = await cards.count();
    const limit = Math.min(totalCards, options.limit || DEFAULT_PAGE_SIZE);

    const products = [];

    for (let index = 0; index < limit; index += 1) {
        const card = cards.nth(index);

        const href = await card.getAttribute('href').catch(() => null);
        const ariaLabel = await card.getAttribute('aria-label').catch(() => null);
        const imageAlt = await card.locator(KABUM_SELECTORS.image).first().getAttribute('alt').catch(() => null);
        const thumbnail = await card.locator(KABUM_SELECTORS.image).first().getAttribute('src').catch(() => null);
        const titleText = await card.locator(KABUM_SELECTORS.title).first().textContent().catch(() => null);

        const title = resolveTitle(imageAlt, titleText, ariaLabel);
        const url = normalizeKabumUrl(href);
        const { price, priceValue } = extractPriceFromAriaLabel(ariaLabel);
        const rating = extractRatingFromAriaLabel(ariaLabel);

        if (!title || !url || priceValue === null) {
            continue;
        }

        if (!isWithinPriceRange(priceValue, options)) {
            continue;
        }

        products.push({
            index,
            title,
            url,
            price,
            priceValue,
            seller: 'KaBuM!',
            rating,
            soldQuantity: null,
            thumbnail,
            installments: null,
            shipping: null,
            condition: 'Novo',
            isSponsored: false,
        });
    }

    return products;
}

async function searchKabumProducts(query, options = {}) {
    const browser = await chromium.launch({
        headless: true,
    });

    const context = await browser.newContext({
        locale: 'pt-BR',
    });

    try {
        const page = await context.newPage();
        page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);

        const url = buildKabumSearchUrl(query, options);

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
        });

        return await extractKabumProducts(page, options);
    } finally {
        await context.close();
        await browser.close();
    }
}

module.exports = {
    searchKabumProducts,
};