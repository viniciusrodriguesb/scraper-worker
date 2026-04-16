const AppError = require('../../../../shared/errors/app.error');
const logger = require('../../../../shared/logger');
const {
    createBrowserSession,
    closeBrowserSession,
} = require('../../../browser/playwright/playwright.client');
const selectors = require('./mercadolivre.selectors');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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

function slugifyMercadoLivreTerm(value) {
    return normalizeText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeMercadoLivrePath(value) {
    return String(value || '')
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function toMercadoLivrePriceParam(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return null;
    }

    return Math.round(numericValue);
}

function buildPriceRangeSuffix(minPrice, maxPrice) {
    if (minPrice === null && maxPrice === null) {
        return '';
    }

    const from = minPrice !== null ? `${minPrice}BRL` : '0BRL';
    const to = maxPrice !== null ? `${maxPrice}BRL` : '*BRL';

    return `_PriceRange_${from}-${to}_NoIndex_True`;
}

function buildMercadoLivreSearchUrl(query, options = {}) {
    const { categoryPath = null } = options;

    const querySlug = slugifyMercadoLivreTerm(query);
    const minPrice = toMercadoLivrePriceParam(options.minPrice);
    const maxPrice = toMercadoLivrePriceParam(options.maxPrice);
    const priceRangeSuffix = buildPriceRangeSuffix(minPrice, maxPrice);

    if (categoryPath) {
        const normalizedCategoryPath = normalizeMercadoLivrePath(categoryPath);
        return `https://lista.mercadolivre.com.br/${normalizedCategoryPath}/${querySlug}${priceRangeSuffix}`;
    }

    return `https://lista.mercadolivre.com.br/${querySlug}${priceRangeSuffix}`;
}

function parseMercadoLivrePriceToNumber(fraction, cents) {
    if (!fraction) {
        return null;
    }

    const integerPart = String(fraction).replace(/[^\d]/g, '');
    const decimalPart = String(cents || '').replace(/[^\d]/g, '');

    if (!integerPart) {
        return null;
    }

    const normalized = decimalPart
        ? `${integerPart}.${decimalPart.padEnd(2, '0').slice(0, 2)}`
        : integerPart;

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
}

function normalizePriceDisplay(fraction, cents) {
    const integerPart = String(fraction || '').replace(/[^\d]/g, '');
    const decimalPart = String(cents || '').replace(/[^\d]/g, '');

    if (!integerPart) {
        return null;
    }

    const intNumber = Number(integerPart);

    if (!Number.isFinite(intNumber)) {
        return null;
    }

    const formattedInteger = intNumber.toLocaleString('pt-BR');

    if (decimalPart) {
        return `R$ ${formattedInteger},${decimalPart.padEnd(2, '0').slice(0, 2)}`;
    }

    return `R$ ${formattedInteger}`;
}

async function waitForMercadoLivreResults(page) {
    const candidateSelectors = [
        'ol.ui-search-layout.ui-search-layout--grid > li.ui-search-layout__item',
        'ol.ui-search-layout > li.ui-search-layout__item',
        'li.ui-search-layout__item',
        '.ui-search-result__wrapper',
        '.andes-card.poly-card',
    ];

    for (const selector of candidateSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 4000 });
            return selector;
        } catch (_) { }
    }

    return null;
}

async function gentleScroll(page) {
    await page
        .evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= 1600) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 150);
            });
        })
        .catch(() => null);
}

async function getBodySample(page) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    return normalizeText(bodyText).slice(0, 700);
}

async function isMercadoLivreErrorPage(page) {
    const bodySample = await getBodySample(page);
    return /hubo un error accediendo a esta pagina/i.test(bodySample);
}

async function openMercadoLivreWithWarmup(page, url) {
    await page.goto('https://www.mercadolivre.com.br/', {
        waitUntil: 'domcontentloaded',
    });

    await page.waitForTimeout(1200);

    await page.goto(url, {
        waitUntil: 'domcontentloaded',
    });

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
}

async function searchMercadoLivreProducts(query, options = {}) {
    if (!query || !String(query).trim()) {
        throw new AppError('O parâmetro de busca é obrigatório', {
            code: 'MERCADOLIVRE_SEARCH_QUERY_REQUIRED',
            statusCode: 400,
            details: { query },
        });
    }

    const {
        minPrice = null,
        maxPrice = null,
        categoryPath = null,
        limit = DEFAULT_LIMIT,
    } = options;

    const normalizedLimit = resolveLimit(limit);
    const rawInspectionLimit = Math.max(normalizedLimit * 3, 24);

    let session;

    try {
        session = await createBrowserSession();
        const { page } = session;

        const url = buildMercadoLivreSearchUrl(query, {
            minPrice,
            maxPrice,
            categoryPath,
        });

        logger.info(
            {
                query,
                minPrice,
                maxPrice,
                categoryPath,
                limit: normalizedLimit,
                rawInspectionLimit,
                url,
            },
            'Starting Mercado Livre scraping'
        );

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);

        if (await isMercadoLivreErrorPage(page)) {
            logger.warn({ query, url }, 'Mercado Livre returned error page on first attempt');
            await openMercadoLivreWithWarmup(page, url);
        }

        if (await isMercadoLivreErrorPage(page)) {
            const pageTitle = await page.title().catch(() => null);
            const pageUrl = page.url();
            const bodySample = await getBodySample(page);

            throw new AppError('Mercado Livre bloqueou ou não entregou a página de resultados', {
                code: 'MERCADOLIVRE_ACCESS_BLOCKED',
                statusCode: 502,
                details: {
                    query,
                    url,
                    pageUrl,
                    pageTitle,
                    bodySample,
                },
            });
        }

        await gentleScroll(page);

        const matchedSelector = await waitForMercadoLivreResults(page);

        if (!matchedSelector) {
            const pageTitle = await page.title().catch(() => null);
            const pageUrl = page.url();
            const bodySample = await getBodySample(page);

            throw new AppError('Não foi possível localizar os cards do Mercado Livre', {
                code: 'MERCADOLIVRE_RESULT_SELECTOR_NOT_FOUND',
                statusCode: 502,
                details: {
                    query,
                    url,
                    pageUrl,
                    pageTitle,
                    bodySample,
                },
            });
        }

        logger.info(
            {
                query,
                matchedSelector,
            },
            'Mercado Livre selector matched'
        );

        const products = await page.$$eval(
            selectors.productCards,
            (cards, params) => {
                const { sel, rawInspectionLimit: maxCards } = params;

                function cleanText(value) {
                    return String(value || '').replace(/\s+/g, ' ').trim();
                }

                function isTrackingUrl(href) {
                    if (!href) {
                        return false;
                    }

                    const normalized = href.toLowerCase();

                    return (
                        normalized.includes('click1.mercadolivre.com.br') ||
                        normalized.includes('/mclics/') ||
                        normalized.includes('publicidade.mercadolivre.com.br')
                    );
                }

                function isRealProductUrl(href) {
                    if (!href) {
                        return false;
                    }

                    const normalized = href.trim().toLowerCase();

                    return (
                        normalized.startsWith('http') &&
                        normalized.includes('mercadolivre.com.br') &&
                        !normalized.includes('click1.mercadolivre.com.br') &&
                        !normalized.includes('/mclics/') &&
                        !normalized.includes('/gz/') &&
                        !normalized.includes('publicidade.mercadolivre.com.br') &&
                        !normalized.startsWith('javascript:')
                    );
                }

                function resolveLink(card) {
                    const allLinks = Array.from(card.querySelectorAll('a[href]'))
                        .map((link) => link.href || link.getAttribute('href') || '')
                        .filter(Boolean);

                    const realProductLink = allLinks.find((href) => isRealProductUrl(href));

                    if (realProductLink) {
                        return realProductLink;
                    }

                    const trackingLink = allLinks.find((href) => isTrackingUrl(href));

                    return trackingLink || null;
                }

                function resolveTitle(card) {
                    const titleElement = card.querySelector(sel.title);

                    const directTitle = cleanText(
                        titleElement?.getAttribute('title') ||
                        titleElement?.getAttribute('aria-label') ||
                        titleElement?.textContent
                    );

                    if (directTitle) {
                        return directTitle;
                    }

                    const sectionElement = card.querySelector(sel.titleFallbackSection);
                    const sectionTitle = cleanText(sectionElement?.getAttribute('aria-label'));

                    if (sectionTitle) {
                        return sectionTitle;
                    }

                    const imageElement = card.querySelector(sel.titleFallbackImage);
                    const imageTitle = cleanText(imageElement?.getAttribute('alt'));

                    if (imageTitle) {
                        return imageTitle;
                    }

                    return '';
                }

                function extractSoldQuantity(cardText) {
                    const match =
                        cardText.match(/\+\s?\d+(?:\s?mil)?\s+vendidos/i) ||
                        cardText.match(/\d+(?:\s?mil)?\s+vendidos/i);

                    return match ? match[0] : null;
                }

                function extractInstallments(cardText) {
                    const match =
                        cardText.match(/\d+x\s+de\s+R\$\s?[\d\.\,]+/i) ||
                        cardText.match(/em\s+\d+x/i);

                    return match ? match[0] : null;
                }

                function extractShipping(cardText) {
                    const match =
                        cardText.match(/frete grátis/i) ||
                        cardText.match(/full/i) ||
                        cardText.match(/chega (hoje|amanhã|amanh[aã])/i) ||
                        cardText.match(/retira/i);

                    return match ? match[0] : null;
                }

                function extractCondition(cardText) {
                    const match =
                        cardText.match(/\bnovo\b/i) ||
                        cardText.match(/\busado\b/i) ||
                        cardText.match(/\brecondicionado\b/i);

                    return match ? match[0] : null;
                }

                function extractRating(card, cardText, sel) {
                    const ratingElement = card.querySelector(sel.rating);

                    const direct =
                        cleanText(
                            ratingElement?.getAttribute('aria-label') ||
                            ratingElement?.textContent
                        ) || null;

                    if (direct) {
                        return direct;
                    }

                    const match = cardText.match(/\d(?:[\.,]\d)?\s+de\s+5/i);
                    return match ? match[0] : null;
                }

                function resolveThumbnail(card, sel) {
                    const image = card.querySelector(sel.thumbnail);

                    const src =
                        image?.getAttribute('src') ||
                        image?.getAttribute('data-src') ||
                        '';

                    if (src) {
                        return cleanText(src);
                    }

                    const srcset =
                        image?.getAttribute('srcset') ||
                        image?.getAttribute('data-srcset') ||
                        '';

                    if (srcset) {
                        const firstItem = srcset.split(',')[0]?.trim() || '';
                        const firstUrl = firstItem.split(' ')[0]?.trim() || '';
                        return firstUrl || null;
                    }

                    return null;
                }

                function resolveSeller(card, sel) {
                    const sellerElement = card.querySelector(sel.seller);
                    return cleanText(sellerElement?.textContent) || null;
                }

                function resolvePriceParts(card, sel) {
                    const priceFractionElement = card.querySelector(sel.priceFraction);
                    const priceCentsElement = card.querySelector(sel.priceCents);

                    return {
                        priceFraction: cleanText(priceFractionElement?.textContent),
                        priceCents: cleanText(priceCentsElement?.textContent),
                    };
                }

                return cards
                    .slice(0, maxCards)
                    .map((card, index) => {
                        const cardText = cleanText(card.innerText || card.textContent || '');
                        const link = resolveLink(card);

                        return {
                            index,
                            title: resolveTitle(card),
                            url: link,
                            ...resolvePriceParts(card, sel),
                            seller: resolveSeller(card, sel),
                            rating: extractRating(card, cardText, sel),
                            soldQuantity: extractSoldQuantity(cardText),
                            isSponsored:
                                /patrocinado/i.test(cardText) ||
                                (link ? isTrackingUrl(link) : false),
                            thumbnail: resolveThumbnail(card, sel),
                            installments: extractInstallments(cardText),
                            shipping: extractShipping(cardText),
                            condition: extractCondition(cardText),
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
                const priceValue = parseMercadoLivrePriceToNumber(
                    item.priceFraction,
                    item.priceCents
                );

                const price = normalizePriceDisplay(item.priceFraction, item.priceCents);

                return {
                    index: item.index,
                    title: normalizeText(item.title),
                    url: item.url,
                    price,
                    priceValue,
                    rating: item.rating ? normalizeText(item.rating) : null,
                    seller: item.seller ? normalizeText(item.seller) : null,
                    soldQuantity: item.soldQuantity ? normalizeText(item.soldQuantity) : null,
                    isSponsored: Boolean(item.isSponsored),
                    thumbnail: item.thumbnail,
                    installments: item.installments
                        ? normalizeText(item.installments)
                        : null,
                    shipping: item.shipping ? normalizeText(item.shipping) : null,
                    condition: item.condition ? normalizeText(item.condition) : null,
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
                categoryPath,
                limit: normalizedLimit,
                rawInspectionLimit,
                totalRaw: products.length,
                totalNormalized: normalizedProducts.length,
            },
            'Mercado Livre scraping finished'
        );

        logger.debug(
            {
                query,
                sample: normalizedProducts.slice(0, 3),
            },
            'Mercado Livre normalized extraction sample'
        );

        return normalizedProducts;
    } catch (error) {
        logger.error(
            {
                query,
                minPrice,
                maxPrice,
                categoryPath,
                limit: normalizedLimit,
                message: error.message,
            },
            'Mercado Livre scraping failed'
        );

        throw error;
    } finally {
        await closeBrowserSession(session);
    }
}

module.exports = {
    searchMercadoLivreProducts,
};