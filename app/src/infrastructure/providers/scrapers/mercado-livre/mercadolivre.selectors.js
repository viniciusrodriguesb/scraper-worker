module.exports = {
    productCards: [
        'ol.ui-search-layout.ui-search-layout--grid > li.ui-search-layout__item',
        'ol.ui-search-layout > li.ui-search-layout__item',
        'li.ui-search-layout__item',
    ].join(', '),

    cardWrapper: [
        '.ui-search-result__wrapper',
        '.andes-card.poly-card',
    ].join(', '),

    title: [
        '.poly-component__title',
        'a.poly-component__title',
        'h2.ui-search-item__title',
        'h3.poly-component__title',
    ].join(', '),

    titleFallbackSection: 'section[aria-label]',
    titleFallbackImage: 'img[alt]',

    link: [
        'a.poly-component__title[href]',
        'a.poly-component__link[href]',
        'a.poly-component__link--carousel[href]',
        'a[href*="mercadolivre.com.br"]',
    ].join(', '),

    priceFraction: [
        '.andes-money-amount__fraction',
        '.price-tag-fraction',
    ].join(', '),

    priceCents: [
        '.andes-money-amount__cents',
        '.price-tag-cents',
    ].join(', '),

    seller: [
        '.poly-component__seller',
        '.poly-component__store',
        '.ui-search-official-store-label',
    ].join(', '),

    rating: [
        '.poly-reviews__rating',
        '.ui-search-reviews__rating-number',
        '[aria-label*="de 5"]',
    ].join(', '),
};