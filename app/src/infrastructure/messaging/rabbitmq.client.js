const amqp = require('amqplib');

const env = require('../../config/env');
const logger = require('../../shared/logger');

let conexaoCompartilhada = null;
let canalCompartilhado = null;
let promessaConexao = null;

function criarUrlConexaoRabbitMq() {
    const usuario = encodeURIComponent(env.rabbitMqUser);
    const senha = encodeURIComponent(env.rabbitMqPassword);

    return `amqp://${usuario}:${senha}@${env.rabbitMqHost}:${env.rabbitMqPort}?heartbeat=${env.rabbitMqHeartbeat}`;
}

async function iniciarConexao() {
    const urlConexao = criarUrlConexaoRabbitMq();

    const conexao = await amqp.connect(urlConexao);
    const canal = await conexao.createChannel();

    conexao.on('error', (erro) => {
        logger.error(
            {
                mensagemErro: erro.message,
            },
            'Erro na conexão com RabbitMQ'
        );
    });

    conexao.on('close', () => {
        conexaoCompartilhada = null;
        canalCompartilhado = null;

        logger.warn('Conexão RabbitMQ encerrada');
    });

    logger.info(
        {
            host: env.rabbitMqHost,
            port: env.rabbitMqPort,
        },
        'Conexão RabbitMQ iniciada com sucesso'
    );

    return { conexao, canal };
}

async function obterCanalRabbitMq() {
    if (conexaoCompartilhada && canalCompartilhado) {
        return {
            conexao: conexaoCompartilhada,
            canal: canalCompartilhado,
        };
    }

    if (!promessaConexao) {
        promessaConexao = iniciarConexao()
            .then(({ conexao, canal }) => {
                conexaoCompartilhada = conexao;
                canalCompartilhado = canal;
                return { conexao, canal };
            })
            .finally(() => {
                promessaConexao = null;
            });
    }

    return promessaConexao;
}

async function garantirFilas(canal) {
    await canal.assertQueue(env.rabbitMqQueueBusca, {
        durable: true,
    });

    await canal.assertQueue(env.rabbitMqQueueResultado, {
        durable: true,
    });
}

async function configurarCanalConsumo(canal) {
    await garantirFilas(canal);
    await canal.prefetch(env.rabbitMqPrefetch);

    logger.info(
        {
            filaBusca: env.rabbitMqQueueBusca,
            filaResultado: env.rabbitMqQueueResultado,
            prefetch: env.rabbitMqPrefetch,
        },
        'Canal RabbitMQ configurado para consumo'
    );
}

async function encerrarRabbitMq() {
    try {
        if (canalCompartilhado) {
            await canalCompartilhado.close();
        }
    } catch (error_) {
        const mensagemErro = error_ instanceof Error
            ? error_.message
            : String(error_);

        logger.warn(
            { mensagemErro },
            'Falha ao fechar canal RabbitMQ'
        );
    }

    try {
        if (conexaoCompartilhada) {
            await conexaoCompartilhada.close();
        }
    } catch (error_) {
        const mensagemErro = error_ instanceof Error
            ? error_.message
            : String(error_);

        logger.warn(
            { mensagemErro },
            'Falha ao fechar conexão RabbitMQ'
        );
    } finally {
        canalCompartilhado = null;
        conexaoCompartilhada = null;
        promessaConexao = null;
    }
}

module.exports = {
    obterCanalRabbitMq,
    configurarCanalConsumo,
    encerrarRabbitMq,
};