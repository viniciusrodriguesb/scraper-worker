const env = require('./config/env');
const logger = require('./shared/logger');
const {
    obterCanalRabbitMq,
    configurarCanalConsumo,
    encerrarRabbitMq,
} = require('./infrastructure/messaging/rabbitmq.client');
const {
    iniciarConsumerBuscaProdutos,
} = require('./infrastructure/messaging/search-products.consumer');
const {
    encerrarNavegadorCompartilhado,
    closeSharedBrowser,
} = require('./infrastructure/browser/playwright/playwright.client');

const fecharBrowserCompartilhado =
    encerrarNavegadorCompartilhado || closeSharedBrowser;

let desligandoAplicacao = false;

async function iniciarWorker() {
    const { canal } = await obterCanalRabbitMq();

    await configurarCanalConsumo(canal);
    await iniciarConsumerBuscaProdutos(canal, env.rabbitMqQueueBusca);

    logger.info(
        {
            app: env.appName,
            environment: env.nodeEnv,
            filaBusca: env.rabbitMqQueueBusca,
            filaResultado: env.rabbitMqQueueResultado,
            prefetch: env.rabbitMqPrefetch,
        },
        'Worker de busca iniciado com sucesso'
    );
}

async function desligarAplicacao(sinal) {
    if (desligandoAplicacao) {
        return;
    }

    desligandoAplicacao = true;

    logger.warn(
        {
            signal: sinal,
            app: env.appName,
        },
        'Iniciando desligamento gracioso do worker'
    );

    try {
        await encerrarRabbitMq();
        await fecharBrowserCompartilhado?.();

        logger.info(
            {
                signal: sinal,
                app: env.appName,
            },
            'Worker encerrado com sucesso'
        );

        process.exit(0);
    } catch (error_) {
        logger.error(
            {
                signal: sinal,
                app: env.appName,
                mensagemErro: error_.message,
            },
            'Falha durante desligamento do worker'
        );

        process.exit(1);
    }
}

function registrarEventosProcesso() {
    process.on('SIGINT', () => desligarAplicacao('SIGINT'));
    process.on('SIGTERM', () => desligarAplicacao('SIGTERM'));

    process.on('unhandledRejection', (erro) => {
        logger.error(
            {
                mensagemErro: erro?.message || 'Erro desconhecido',
            },
            'Unhandled promise rejection'
        );
    });

    process.on('uncaughtException', (erro) => {
        logger.error(
            {
                mensagemErro: erro.message,
            },
            'Uncaught exception'
        );

        desligarAplicacao('uncaughtException');
    });
}

async function bootstrap() {
    registrarEventosProcesso();
    await iniciarWorker();
}

bootstrap().catch((error_) => {
    logger.error(
        {
            mensagemErro: erro.message,
            app: env.appName,
        },
        'Falha ao iniciar worker'
    );

    process.exit(1);
});