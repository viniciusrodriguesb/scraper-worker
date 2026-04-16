const { normalizarTextoComparacao } = require('../dtos/shared-product.dto');

const PALAVRAS_CHAVE_ACESSORIO = new Set([
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
]);

function tokenizarTexto(texto) {
    if (!texto) {
        return [];
    }

    return Array.from(
        new Set(
            normalizarTextoComparacao(texto)
                .split(' ')
                .map((item) => item.trim())
                .filter((item) => item.length >= 2)
        )
    );
}

function criarConjuntoTokens(texto) {
    return new Set(tokenizarTexto(texto));
}

function ehProvavelAcessorio(titulo) {
    const tokensTitulo = criarConjuntoTokens(titulo);

    for (const palavraChave of PALAVRAS_CHAVE_ACESSORIO) {
        if (tokensTitulo.has(palavraChave)) {
            return true;
        }
    }

    return false;
}

function calcularCoberturaTokens(tokensConsulta, titulo) {
    if (!tokensConsulta.length) {
        return 0;
    }

    const tokensTitulo = criarConjuntoTokens(titulo);
    let totalCorrespondencias = 0;

    for (const token of tokensConsulta) {
        if (tokensTitulo.has(token)) {
            totalCorrespondencias += 1;
        }
    }

    return totalCorrespondencias / tokensConsulta.length;
}

function adicionarPontuacao(resultado, deveAplicar, pontos, motivo) {
    if (!deveAplicar) {
        return;
    }

    resultado.score += pontos;
    resultado.scoreReasons.push(motivo);
}

function calcularPontuacaoCobertura(produto, contextoRequisicao, resultado) {
    const coberturaTokens = calcularCoberturaTokens(
        contextoRequisicao.tokensConsulta,
        produto.title
    );

    const pontosCobertura = Math.round(coberturaTokens * 100);

    resultado.score += pontosCobertura;
    resultado.scoreReasons.push(`match:${pontosCobertura}`);
}

function calcularPontuacaoPatrocinio(produto, resultado) {
    if (produto.isSponsored) {
        adicionarPontuacao(resultado, true, -20, 'sponsored-penalty');
        return;
    }

    adicionarPontuacao(resultado, true, 15, 'non-sponsored');
}

function calcularPontuacaoUrl(produto, resultado) {
    if (produto.hasDirectProductUrl) {
        adicionarPontuacao(resultado, true, 15, 'direct-url');
        return;
    }

    adicionarPontuacao(resultado, true, -25, 'tracking-url-penalty');
}

function calcularPontuacaoAtributos(produto, resultado) {
    adicionarPontuacao(resultado, produto.priceValue !== null, 10, 'has-price');
    adicionarPontuacao(resultado, Boolean(produto.seller), 5, 'has-seller');
    adicionarPontuacao(resultado, Boolean(produto.rating), 5, 'has-rating');
    adicionarPontuacao(resultado, Boolean(produto.soldQuantity), 5, 'has-sold-quantity');
    adicionarPontuacao(resultado, Boolean(produto.shipping), 3, 'has-shipping-info');
    adicionarPontuacao(resultado, Boolean(produto.installments), 2, 'has-installments');
    adicionarPontuacao(resultado, Boolean(produto.condition), 2, 'has-condition');
}

function calcularPenalidadeAcessorio(produto, resultado) {
    adicionarPontuacao(
        resultado,
        ehProvavelAcessorio(produto.title),
        -80,
        'accessory-penalty'
    );
}

function pontuarProduto(produto, contextoRequisicao) {
    const resultadoPontuacao = {
        score: 0,
        scoreReasons: [],
    };

    calcularPontuacaoCobertura(produto, contextoRequisicao, resultadoPontuacao);
    calcularPontuacaoPatrocinio(produto, resultadoPontuacao);
    calcularPontuacaoUrl(produto, resultadoPontuacao);
    calcularPontuacaoAtributos(produto, resultadoPontuacao);
    calcularPenalidadeAcessorio(produto, resultadoPontuacao);

    return {
        ...produto,
        score: resultadoPontuacao.score,
        scoreReasons: resultadoPontuacao.scoreReasons,
    };
}

function criarChaveFallback(produto) {
    return `${produto.normalizedTitle}|${Math.round(produto.priceValue || 0)}`;
}

function criarChaveDeduplicacao(produto) {
    if (produto.hasDirectProductUrl) {
        return produto.canonicalUrl;
    }

    return `${produto.source}|${criarChaveFallback(produto)}`;
}

function deduplicarProdutos(produtos) {
    const mapaProdutos = new Map();

    for (const produto of produtos) {
        const chave = criarChaveDeduplicacao(produto);
        const produtoAtual = mapaProdutos.get(chave);

        if (!produtoAtual || produto.score > produtoAtual.score) {
            mapaProdutos.set(chave, produto);
        }
    }

    return Array.from(mapaProdutos.values());
}

function compararProdutos(produtoA, produtoB) {
    if (produtoB.score !== produtoA.score) {
        return produtoB.score - produtoA.score;
    }

    if (
        produtoA.priceValue !== null &&
        produtoB.priceValue !== null &&
        produtoA.priceValue !== produtoB.priceValue
    ) {
        return produtoA.priceValue - produtoB.priceValue;
    }

    return produtoA.title.localeCompare(produtoB.title);
}

function criarItemRankeado(item, indice) {
    return {
        rank: indice + 1,
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
    };
}

function ranquearProdutos(produtos, requisicao, limite) {
    const contextoRequisicao = {
        tokensConsulta: tokenizarTexto(requisicao.query),
    };

    const produtosPontuados = produtos.map((produto) =>
        pontuarProduto(produto, contextoRequisicao)
    );

    const produtosDeduplicados = deduplicarProdutos(produtosPontuados);

    return produtosDeduplicados
        .sort(compararProdutos)
        .slice(0, limite)
        .map(criarItemRankeado);
}

module.exports = {
    ranquearProdutos,
    rankProducts: ranquearProdutos,
};