function normalizarTexto(valor) {
    return String(valor ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizarTextoComparacao(valor) {
    return normalizarTexto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function converterPrecoParaNumero(valorBruto) {
    if (valorBruto === undefined || valorBruto === null || valorBruto === '') {
        return null;
    }

    if (typeof valorBruto === 'number') {
        return Number.isFinite(valorBruto) ? valorBruto : null;
    }

    const valorNormalizado = String(valorBruto)
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    const valorConvertido = Number(valorNormalizado);

    return Number.isFinite(valorConvertido) ? valorConvertido : null;
}

function ehUrlRastreamento(url) {
    const urlNormalizada = String(url ?? '').toLowerCase();

    return (
        urlNormalizada.includes('click1.mercadolivre.com.br') ||
        urlNormalizada.includes('/mclics/') ||
        urlNormalizada.startsWith('javascript:')
    );
}

function canonicalizarUrl(url) {
    try {
        const urlParseada = new URL(url);
        return `${urlParseada.origin}${urlParseada.pathname}`;
    } catch {
        return String(url ?? '').trim() || null;
    }
}

function normalizarCampoTexto(valor) {
    return valor ? normalizarTexto(valor) : null;
}

function criarDtoProdutoCompartilhado(origem, item) {
    const titulo = normalizarTexto(item.title);
    const url = item.url ?? null;
    const preco = item.price ?? null;
    const valorPreco = converterPrecoParaNumero(item.priceValue ?? item.price);
    const urlRastreamento = ehUrlRastreamento(url);

    return {
        source: origem,
        title: titulo,
        normalizedTitle: normalizarTextoComparacao(titulo),
        url,
        canonicalUrl: canonicalizarUrl(url),
        price: preco,
        priceValue: valorPreco,
        seller: normalizarCampoTexto(item.seller),
        rating: normalizarCampoTexto(item.rating),
        soldQuantity: normalizarCampoTexto(item.soldQuantity),
        thumbnail: item.thumbnail ?? null,
        installments: normalizarCampoTexto(item.installments),
        shipping: normalizarCampoTexto(item.shipping),
        condition: normalizarCampoTexto(item.condition),
        isSponsored: Boolean(item.isSponsored),
        isTrackingUrl: urlRastreamento,
        hasDirectProductUrl: !urlRastreamento,
        sourceIndex: item.index ?? null,
    };
}

module.exports = {
    criarDtoProdutoCompartilhado,
    normalizarTextoComparacao,
    createSharedProductDto: criarDtoProdutoCompartilhado,
    normalizeComparisonText: normalizarTextoComparacao,
};