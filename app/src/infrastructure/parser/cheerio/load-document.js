const cheerio = require('cheerio');

function loadDocument(html) {
    return cheerio.load(html || '');
}

module.exports = loadDocument;