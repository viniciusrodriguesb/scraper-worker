const AppError = require('../../shared/errors/app.error');

const LIMITE_PADRAO_RETORNO = 20;
const LIMITE_MAXIMO_RETORNO = 100;
const LIMITE_MAXIMO_COLETA = 200;

function criarErroValidacao(campo, valor, mensagem) {
    return new AppError(mensagem, {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { field: campo, value: valor },
    });
}

function valorNaoInformado(valor) {
    return valor === undefined || valor === null || valor === '';
}

function converterPrecoOpcional(valor, nomeCampo) {
    if (valorNaoInformado(valor)) {
        return null;
    }

    const valorNormalizado = String(valor).trim();

    if (!valorNormalizado) {
        return null;
    }

    let valorPreparado = valorNormalizado.replace(/\s/g, '');

    if (valorPreparado.includes(',') && valorPreparado.includes('.')) {
        valorPreparado = valorPreparado.replace(/\./g, '').replace(',', '.');
    } else if (valorPreparado.includes(',')) {
        valorPreparado = valorPreparado.replace(',', '.');
    }

    const valorConvertido = Number(valorPreparado);

    if (!Number.isFinite(valorConvertido) || valorConvertido < 0) {
        throw criarErroValidacao(
            nomeCampo,
            valor,
            `Valor inválido para ${nomeCampo}`
        );
    }

    return valorConvertido;
}

function converterInteiroPositivoOpcional(valor, nomeCampo, valorPadrao, valorMaximo = null) {
    if (valorNaoInformado(valor)) {
        return valorPadrao;
    }

    const valorConvertido = Number(valor);

    if (!Number.isInteger(valorConvertido) || valorConvertido <= 0) {
        throw criarErroValidacao(
            nomeCampo,
            valor,
            `Valor inválido para ${nomeCampo}`
        );
    }

    if (valorMaximo !== null && valorConvertido > valorMaximo) {
        return valorMaximo;
    }

    return valorConvertido;
}

function obterConsulta(entrada) {
    return String(entrada.q ?? entrada.query ?? '').trim();
}

function obterCaminhoCategoria(entrada) {
    return String(entrada.categoryPath ?? '').trim() || null;
}

function validarFaixaPreco(precoMinimo, precoMaximo) {
    if (
        precoMinimo !== null &&
        precoMaximo !== null &&
        precoMinimo > precoMaximo
    ) {
        throw new AppError('minPrice não pode ser maior que maxPrice', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { minPrice: precoMinimo, maxPrice: precoMaximo },
        });
    }
}

function criarDtoBuscaProdutos(entrada) {
    const query = obterConsulta(entrada);
    const minPrice = converterPrecoOpcional(entrada.minPrice, 'minPrice');
    const maxPrice = converterPrecoOpcional(entrada.maxPrice, 'maxPrice');
    const categoryPath = obterCaminhoCategoria(entrada);

    const limit = converterInteiroPositivoOpcional(
        entrada.limit,
        'limit',
        LIMITE_PADRAO_RETORNO,
        LIMITE_MAXIMO_RETORNO
    );

    const collectLimit = valorNaoInformado(entrada.collectLimit)
        ? undefined
        : converterInteiroPositivoOpcional(
            entrada.collectLimit,
            'collectLimit',
            undefined,
            LIMITE_MAXIMO_COLETA
        );

    if (!query) {
        throw new AppError('O parâmetro q é obrigatório', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: 'q' },
        });
    }

    validarFaixaPreco(minPrice, maxPrice);

    return {
        query,
        minPrice,
        maxPrice,
        categoryPath,
        limit,
        collectLimit,
    };
}

module.exports = {
    criarDtoBuscaProdutos,
    createSearchProductsRequestDto: criarDtoBuscaProdutos,
};