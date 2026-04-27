const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const caminhoEnvRaiz = path.resolve(process.cwd(), '../.env');
const caminhoEnvLocal = path.resolve(process.cwd(), '.env');
const caminhoEnvSelecionado = fs.existsSync(caminhoEnvRaiz)
    ? caminhoEnvRaiz
    : caminhoEnvLocal;

dotenv.config({ path: caminhoEnvSelecionado });

function converterParaNumero(valor, valorPadrao) {
    const valorConvertido = Number(valor);
    return Number.isFinite(valorConvertido) ? valorConvertido : valorPadrao;
}

function converterParaBooleano(valor, valorPadrao) {
    if (valor === undefined || valor === null || valor === '') {
        return valorPadrao;
    }

    return ['true', '1', 'yes', 'on'].includes(String(valor).toLowerCase());
}

function converterParaTexto(valor, valorPadrao) {
    const valorNormalizado = String(valor ?? '').trim();
    return valorNormalizado || valorPadrao;
}

const ambienteNode = process.env.NODE_ENV || 'development';
const nomeAplicacao = process.env.APP_NAME || 'scraper-worker';

const env = Object.freeze({
    appName: nomeAplicacao,
    nodeEnv: ambienteNode,

    logLevel:
        process.env.LOG_LEVEL ||
        (ambienteNode === 'production' ? 'info' : 'debug'),

    searchProviderTimeoutMs: converterParaNumero(
        process.env.SEARCH_PROVIDER_TIMEOUT_MS,
        45000
    ),
    searchDefaultFinalLimit: converterParaNumero(
        process.env.SEARCH_DEFAULT_FINAL_LIMIT,
        20
    ),
    searchDefaultCollectLimit: converterParaNumero(
        process.env.SEARCH_DEFAULT_COLLECT_LIMIT,
        100
    ),
    searchMaxCollectLimit: converterParaNumero(
        process.env.SEARCH_MAX_COLLECT_LIMIT,
        200
    ),

    httpUserAgent:
        process.env.HTTP_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

    playwrightBrowser: process.env.PLAYWRIGHT_BROWSER || 'chromium',
    playwrightHeadless: converterParaBooleano(
        process.env.PLAYWRIGHT_HEADLESS,
        true
    ),
    playwrightTimeoutMs: converterParaNumero(
        process.env.PLAYWRIGHT_TIMEOUT_MS,
        30000
    ),
    playwrightNavigationTimeoutMs: converterParaNumero(
        process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
        30000
    ),

    rabbitMqHost: converterParaTexto(process.env.RABBITMQ_HOST, 'localhost'),
    rabbitMqPort: converterParaNumero(process.env.RABBITMQ_PORT, 5672),
    rabbitMqUser: converterParaTexto(process.env.RABBITMQ_USER, 'admin'),
    rabbitMqPassword: converterParaTexto(process.env.RABBITMQ_PASSWORD, 'admin123'),
    rabbitMqQueueBusca: converterParaTexto(
        process.env.RABBITMQ_QUEUE_BUSCA,
        'fila.busca.produtos'
    ),
    rabbitMqPrefetch: converterParaNumero(process.env.RABBITMQ_PREFETCH, 1),
    rabbitMqHeartbeat: converterParaNumero(process.env.RABBITMQ_HEARTBEAT, 30),

    isProduction: ambienteNode === 'production',
    isDevelopment: ambienteNode === 'development',
});

module.exports = env;