const env = require('../../config/env');
const dtoProdutoCompartilhado = require('../dtos/shared-product.dto');
const servicoRankingProdutos = require('../services/product-ranking.service');
const { SCRAPER_PROVIDERS } = require('../../infrastructure/providers/scrapers/registry');

const criarDtoProdutoCompartilhado =
    dtoProdutoCompartilhado.criarDtoProdutoCompartilhado ||
    dtoProdutoCompartilhado.createSharedProductDto;

const ranquearProdutos =
    servicoRankingProdutos.ranquearProdutos ||
    servicoRankingProdutos.rankProducts;

const TEMPO_PADRAO_TIMEOUT_PROVEDOR_MS = env.searchProviderTimeoutMs || 45000;
const LIMITE_PADRAO_RETORNO = env.searchDefaultFinalLimit || 20;
const LIMITE_PADRAO_COLETA = env.searchDefaultCollectLimit || 100;
const LIMITE_MAXIMO_COLETA = env.searchMaxCollectLimit || 200;

function limitarValor(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

function obterLimiteRetorno(requisicao) {
    return limitarValor(requisicao.limit || LIMITE_PADRAO_RETORNO, 1, 100);
}

function obterLimiteColeta(requisicao, limiteRetorno) {
    const limiteSolicitado = requisicao.collectLimit || LIMITE_PADRAO_COLETA;
    return limitarValor(limiteSolicitado, limiteRetorno, LIMITE_MAXIMO_COLETA);
}

function distribuirLimiteEntreProvedores(nomesProvedores, limiteColeta) {
    if (!nomesProvedores.length) {
        return {};
    }

    const limiteBase = Math.floor(limiteColeta / nomesProvedores.length);
    let restante = limiteColeta % nomesProvedores.length;

    return nomesProvedores.reduce((alocacoes, nomeProvedor) => {
        alocacoes[nomeProvedor] = limiteBase + (restante > 0 ? 1 : 0);

        if (restante > 0) {
            restante -= 1;
        }

        return alocacoes;
    }, {});
}

function executarComTimeout(fabricaPromise, tempoTimeoutMs, nomeProvedor) {
    let identificadorTimeout;

    const promiseTimeout = new Promise((_, rejeitar) => {
        identificadorTimeout = setTimeout(() => {
            rejeitar(new Error(`Provider ${nomeProvedor} excedeu ${tempoTimeoutMs}ms`));
        }, tempoTimeoutMs);
    });

    return Promise.race([
        Promise.resolve()
            .then(() => fabricaPromise())
            .finally(() => clearTimeout(identificadorTimeout)),
        promiseTimeout,
    ]);
}

async function executarProvedor(nomeProvedor, buscarProdutos, requisicao, limiteProvedor) {
    const iniciadoEm = Date.now();

    const itens = await executarComTimeout(
        () => buscarProdutos(requisicao, limiteProvedor),
        TEMPO_PADRAO_TIMEOUT_PROVEDOR_MS,
        nomeProvedor
    );

    return {
        provider: nomeProvedor,
        durationMs: Date.now() - iniciadoEm,
        requestedLimit: limiteProvedor,
        items: itens,
    };
}

function criarResumoFonteSucesso(duracaoMs, limiteSolicitado, itens) {
    return {
        success: true,
        durationMs: duracaoMs,
        requestedLimit: limiteSolicitado,
        total: itens.length,
    };
}

function criarResumoFonteErro(limiteSolicitado, mensagemErro) {
    return {
        success: false,
        durationMs: null,
        requestedLimit: limiteSolicitado,
        total: 0,
        error: mensagemErro,
    };
}

function mapearItensPadronizados(nomeProvedor, itens) {
    return itens.map((item) => criarDtoProdutoCompartilhado(nomeProvedor, item));
}

function criarRespostaBusca(requisicao, limiteRetorno, limiteColeta, alocacoesProvedores, fontes, itensColetados, itensRanqueados) {
    return {
        success: true,
        query: requisicao.query,
        filters: {
            minPrice: requisicao.minPrice,
            maxPrice: requisicao.maxPrice,
            categoryPath: requisicao.categoryPath,
            limit: limiteRetorno,
            collectLimit: limiteColeta,
        },
        pagination: {
            finalLimit: limiteRetorno,
            collectLimit: limiteColeta,
            providerAllocations: alocacoesProvedores,
            totalProviders: Object.keys(alocacoesProvedores).length,
        },
        sources: fontes,
        totalCollected: itensColetados.length,
        total: itensRanqueados.length,
        items: itensRanqueados,
    };
}

async function buscarProdutosUseCase(requisicao) {
    const entradasProvedores = Object.entries(SCRAPER_PROVIDERS);
    const nomesProvedores = entradasProvedores.map(([nomeProvedor]) => nomeProvedor);

    const limiteRetorno = obterLimiteRetorno(requisicao);
    const limiteColeta = obterLimiteColeta(requisicao, limiteRetorno);
    const alocacoesProvedores = distribuirLimiteEntreProvedores(nomesProvedores, limiteColeta);

    const resultados = await Promise.allSettled(
        entradasProvedores.map(([nomeProvedor, buscarProdutos]) =>
            executarProvedor(
                nomeProvedor,
                buscarProdutos,
                requisicao,
                alocacoesProvedores[nomeProvedor]
            )
        )
    );

    const fontes = {};
    const itensColetados = [];

    for (let indice = 0; indice < resultados.length; indice += 1) {
        const resultado = resultados[indice];
        const [nomeProvedor] = entradasProvedores[indice];
        const limiteSolicitado = alocacoesProvedores[nomeProvedor];

        if (resultado.status === 'fulfilled') {
            const { durationMs, items } = resultado.value;

            fontes[nomeProvedor] = criarResumoFonteSucesso(
                durationMs,
                limiteSolicitado,
                items
            );

            itensColetados.push(...mapearItensPadronizados(nomeProvedor, items));
            continue;
        }

        const mensagemErro = resultado.reason?.message || 'Erro desconhecido';

        fontes[nomeProvedor] = criarResumoFonteErro(
            limiteSolicitado,
            mensagemErro
        );
    }

    const itensRanqueados = ranquearProdutos(
        itensColetados,
        requisicao,
        limiteRetorno
    );

    return criarRespostaBusca(
        requisicao,
        limiteRetorno,
        limiteColeta,
        alocacoesProvedores,
        fontes,
        itensColetados,
        itensRanqueados
    );
}

module.exports = {
    buscarProdutosUseCase,
    searchProductsUseCase: buscarProdutosUseCase,
};