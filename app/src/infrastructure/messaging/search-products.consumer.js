const logger = require('../../shared/logger');
const AppError = require('../../shared/errors/app.error');
const casoDeUsoBuscaProdutos = require('../../application/use-cases/search-products.use-case');
const dtoMensagemBusca = require('../../application/dtos/search-products.message.dto');

const buscarProdutosUseCase =
    casoDeUsoBuscaProdutos.buscarProdutosUseCase ||
    casoDeUsoBuscaProdutos.searchProductsUseCase;

const criarDtoMensagemBuscaProdutos =
    dtoMensagemBusca.criarDtoMensagemBuscaProdutos ||
    dtoMensagemBusca.criarDtoBuscaProdutos ||
    dtoMensagemBusca.createSearchProductsRequestDto;

function lerMensagem(conteudoMensagem) {
    try {
        return JSON.parse(conteudoMensagem.toString('utf-8'));
    } catch {
        throw new AppError('Mensagem inválida na fila', {
            code: 'RABBITMQ_INVALID_MESSAGE',
            statusCode: 400,
        });
    }
}

async function processarMensagem(mensagem) {
    const payloadBruto = lerMensagem(mensagem.content);
    const payload = criarDtoMensagemBuscaProdutos(payloadBruto);

    logger.info(
        {
            correlationId: payload.correlationId,
            query: payload.query,
            maxPrice: payload.maxPrice,
            categoryPath: payload.categoryPath,
        },
        'Mensagem de busca recebida para processamento'
    );

    const resultadoBusca = await buscarProdutosUseCase(payload);

    logger.info(
        {
            correlationId: payload.correlationId,
            query: payload.query,
            totalCollected: resultadoBusca.totalCollected,
            total: resultadoBusca.total,
            sources: resultadoBusca.sources,
            items: resultadoBusca.items,
        },
        'Mensagem processada com sucesso'
    );
}

function iniciarConsumerBuscaProdutos(canal, nomeFila) {
    return canal.consume(nomeFila, async (mensagem) => {
        if (!mensagem) {
            return;
        }

        let payloadBruto = null;

        try {
            payloadBruto = lerMensagem(mensagem.content);
            const payload = criarDtoMensagemBuscaProdutos(payloadBruto);

            logger.debug(
                {
                    correlationId: payload.correlationId,
                    query: payload.query,
                },
                'Iniciando processamento da mensagem'
            );

            const resultadoBusca = await buscarProdutosUseCase(payload);

            logger.info(
                {
                    correlationId: payload.correlationId,
                    query: payload.query,
                    totalCollected: resultadoBusca.totalCollected,
                    total: resultadoBusca.total,
                    sources: resultadoBusca.sources,
                    items: resultadoBusca.items,
                },
                'Mensagem processada com sucesso'
            );

            canal.ack(mensagem);
        } catch (error_) {

            const mensagemErro = error_ instanceof Error
                ? error_.message
                : String(error_);

            logger.error(
                { mensagemErro },
                'Falha ao processar mensagem de busca'
            );

            canal.nack(mensagem, false, false);
        }
    });
}

module.exports = {
    iniciarConsumerBuscaProdutos,
};