const KABUM_SELECTORS = Object.freeze({
    card: 'a[href*="/produto/"][aria-label]',
    image: 'img[alt]',
    title: 'span[class*="line-clamp-2"], span.text-sm',
});

module.exports = {
    KABUM_SELECTORS,
};