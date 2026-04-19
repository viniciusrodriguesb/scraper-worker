const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');
const {
    encerrarNavegadorCompartilhado,
    closeSharedBrowser,
} = require('./infrastructure/browser/playwright/playwright.client');

const fecharBrowserCompartilhado =
    encerrarNavegadorCompartilhado || closeSharedBrowser;

let servidorHttp = null;
let desligandoAplicacao = false;

function iniciarServidor() {
    servidorHttp = app.listen(env.port, () => {
        logger.info(
            {
                app: env.appName,
                environment: env.nodeEnv,
                port: env.port,
            },
            'Servidor iniciado com sucesso'
        );
    });

    servidorHttp.on('error', (erro) => {
        logger.error(
            {
                app: env.appName,
                port: env.port,
                mensagemErro: erro.message,
            },
            'Falha ao iniciar servidor HTTP'
        );

        process.exit(1);
    });

    servidorHttp.keepAliveTimeout = 65000;
    servidorHttp.headersTimeout = 66000;
}

async function encerrarServidorHttp() {
    if (!servidorHttp) {
        return;
    }

    await new Promise((resolve) => {
        servidorHttp.close(() => resolve());
    });
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
        'Iniciando desligamento gracioso da aplicação'
    );

    try {
        await encerrarServidorHttp();
        await fecharBrowserCompartilhado?.();

        logger.info(
            {
                signal: sinal,
                app: env.appName,
            },
            'Aplicação encerrada com sucesso'
        );

        process.exit(0);
    } catch (error_) {
        logger.error(
            {
                signal: sinal,
                app: env.appName,
                mensagemErro: error_.message,
            },
            'Falha durante desligamento da aplicação'
        );

        process.exit(1);
    }
}

function registrarSinaisDesligamento() {
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

iniciarServidor();
registrarSinaisDesligamento();