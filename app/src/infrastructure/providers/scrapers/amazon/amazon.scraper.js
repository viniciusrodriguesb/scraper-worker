const AppError = require('../../../../shared/errors/app.error');
const logger = require('../../../../shared/logger');
const {
    createBrowserSession,
    closeBrowserSession,
} = require('../../../browser/playwright/playwright.client');
const selectors = require('./amazon.selectors');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function toAmazonPriceParam(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return null;
    }

    return Math.round(numericValue * 100);
}

function resolveLimit(value) {
    if (value === undefined || value === null || value === '') {
        return DEFAULT_LIMIT;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(numericValue), MAX_LIMIT);
}

function parseBrazilianPriceToNumber(priceText) {
    if (!priceText) {
        return null;
    }

    const normalized = String(priceText)
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
}

function buildAmazonSearchUrl(query, options = {}) {
    const url = new URL('https://www.amazon.com.br/s');
    url.searchParams.set('k', query);

    const minPrice = toAmazonPriceParam(options.minPrice);
    const maxPrice = toAmazonPriceParam(options.maxPrice);

    if (minPrice !== null) {
        url.searchParams.set('low-price', String(minPrice));
    }

    if (maxPrice !== null) {
        url.searchParams.set('high-price', String(maxPrice));
    }

    return url.toString();
}

function isInvalidHref(href) {
    if (!href) {
        return true;
    }

    const normalized = href.trim().toLowerCase();

    return (
        normalized === '' ||
        normalized === '#' ||
        normalized.startsWith('javascript:')
    );
}

function isAmazonProductHref(href) {
    if (!href) {
        return false;
    }

    return (
        href.includes('/dp/') ||
        href.includes('/gp/product/') ||
        href.includes('/-/pt/dp/')
    );
}

function toAbsoluteAmazonUrl(href) {
    if (!href || isInvalidHref(href)) {
        return null;
    }

    try {
        return new URL(href, 'https://www.amazon.com.br').toString();
    } catch {
        return null;
    }
}

function normalizeTitle(rawTitle) {
    return String(rawTitle || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^Anúncio patrocinado\s*[–-]\s*/i, '');
}

async function searchAmazonProducts(query, options = {}) {
    if (!query || !String(query).trim()) {
        throw new AppError('O parâmetro de busca é obrigatório', {
            code: 'AMAZON_SEARCH_QUERY_REQUIRED',
            statusCode: 400,
            details: { query },
        });
    }

    const {
        minPrice = null,
        maxPrice = null,
        limit = DEFAULT_LIMIT,
    } = options;

    const normalizedLimit = resolveLimit(limit);
    const rawInspectionLimit = Math.max(normalizedLimit * 3, 20);

    let session;

    try {
        session = await createBrowserSession();
        const { page } = session;

        const url = buildAmazonSearchUrl(query, { minPrice, maxPrice });

        logger.info(
            {
                query,
                minPrice,
                maxPrice,
                limit: normalizedLimit,
                rawInspectionLimit,
                url,
            },
            'Starting Amazon scraping'
        );

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
        await page.waitForSelector(selectors.productCards, { timeout: 15000 });

        const products = await page.$$eval(
            selectors.productCards,
            (cards, params) => {
                const { sel, rawInspectionLimit: maxCards } = params;

                function cleanText(value) {
                    return value?.replace(/\s+/g, ' ').trim() || '';
                }

                function isInvalidHrefInternal(href) {
                    if (!href) {
                        return true;
                    }

                    const normalized = href.trim().toLowerCase();

                    return (
                        normalized === '' ||
                        normalized === '#' ||
                        normalized.startsWith('javascript:')
                    );
                }

                function isAmazonProductHrefInternal(href) {
                    if (!href) {
                        return false;
                    }

                    return (
                        href.includes('/dp/') ||
                        href.includes('/gp/product/') ||
                        href.includes('/-/pt/dp/')
                    );
                }

                function toAbsoluteAmazonUrlInternal(href) {
                    if (!href || isInvalidHrefInternal(href)) {
                        return null;
                    }

                    try {
                        return new URL(href, 'https://www.amazon.com.br').toString();
                    } catch {
                        return null;
                    }
                }

                function resolveProductUrl(card, primaryLinkElement) {
                    const primaryHref =
                        primaryLinkElement?.href ||
                        primaryLinkElement?.getAttribute('href') ||
                        '';

                    if (
                        !isInvalidHrefInternal(primaryHref) &&
                        isAmazonProductHrefInternal(primaryHref)
                    ) {
                        return toAbsoluteAmazonUrlInternal(primaryHref);
                    }

                    const allLinks = Array.from(card.querySelectorAll('a[href]'));

                    for (const link of allLinks) {
                        const href = link.href || link.getAttribute('href') || '';

                        if (isInvalidHrefInternal(href)) {
                            continue;
                        }

                        if (isAmazonProductHrefInternal(href)) {
                            return toAbsoluteAmazonUrlInternal(href);
                        }
                    }

                    return null;
                }

                return cards
                    .slice(0, maxCards)
                    .map((card, index) => {
                        const titleElement = card.querySelector(sel.title);
                        const linkElement = card.querySelector(sel.link);
                        const priceElement = card.querySelector(sel.price);
                        const ratingElement = card.querySelector(sel.rating);

                        const rawTitle =
                            titleElement?.getAttribute('aria-label') ||
                            titleElement?.textContent ||
                            '';

                        const title = cleanText(rawTitle);
                        const productUrl = resolveProductUrl(card, linkElement);
                        const price = cleanText(priceElement?.textContent) || null;
                        const rating = cleanText(ratingElement?.textContent) || null;
                        const isSponsored = /^Anúncio patrocinado\s*[–-]\s*/i.test(title);

                        return {
                            index,
                            title,
                            url: productUrl,
                            price,
                            rating,
                            isSponsored,
                        };
                    });
            },
            {
                sel: selectors,
                rawInspectionLimit,
            }
        );

        const normalizedProducts = products
            .map((item) => {
                const normalizedTitle = normalizeTitle(item.title);
                const numericPrice = parseBrazilianPriceToNumber(item.price);

                return {
                    ...item,
                    title: normalizedTitle,
                    priceValue: numericPrice,
                };
            })
            .filter((item) => item.title && item.url)
            .filter((item) => {
                if (minPrice === null) {
                    return true;
                }

                if (item.priceValue === null) {
                    return false;
                }

                return item.priceValue >= minPrice;
            })
            .filter((item) => {
                if (maxPrice === null) {
                    return true;
                }

                if (item.priceValue === null) {
                    return false;
                }

                return item.priceValue <= maxPrice;
            })
            .filter((item, index, array) => {
                return array.findIndex((x) => x.url === item.url) === index;
            })
            .slice(0, normalizedLimit);

        logger.info(
            {
                query,
                minPrice,
                maxPrice,
                limit: normalizedLimit,
                rawInspectionLimit,
                totalRaw: products.length,
                totalNormalized: normalizedProducts.length,
            },
            'Amazon scraping finished'
        );

        logger.debug(
            {
                query,
                sample: normalizedProducts.slice(0, 3),
            },
            'Amazon normalized extraction sample'
        );

        return normalizedProducts;
    } catch (error) {
        logger.error(
            {
                query,
                minPrice,
                maxPrice,
                limit: normalizedLimit,
                message: error.message,
            },
            'Amazon scraping failed'
        );

        throw error;
    } finally {
        await closeBrowserSession(session);
    }
}

module.exports = {
    searchAmazonProducts,
};