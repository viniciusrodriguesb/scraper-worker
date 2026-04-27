const AppError = require('../../shared/errors/app.error');

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

function obterConsulta(entrada) {
    return String(entrada.q ?? entrada.query ?? '').trim();
}

function obterCaminhoCategoria(entrada) {
    return String(entrada.categoryPath ?? '').trim() || null;
}

function criarDtoMensagemBuscaProdutos(entrada) {
    const query = obterConsulta(entrada);
    const maxPrice = converterPrecoOpcional(entrada.maxPrice, 'maxPrice');
    const categoryPath = obterCaminhoCategoria(entrada);
    const correlationId = String(entrada.correlationId ?? '').trim() || null;

    if (!query) {
        throw new AppError('O campo query é obrigatório', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: { field: 'query' },
        });
    }

    return {
        correlationId,
        query,
        maxPrice,
        categoryPath,
    };
}

module.exports = {
    criarDtoMensagemBuscaProdutos,
    criarDtoBuscaProdutos: criarDtoMensagemBuscaProdutos,
    createSearchProductsRequestDto: criarDtoMensagemBuscaProdutos,
};