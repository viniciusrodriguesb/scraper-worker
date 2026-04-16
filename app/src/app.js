const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const logger = require('./shared/logger');
const errorHandler = require('./presentation/middlewares/error-handler.middleware');
const searchRoutes = require('./presentation/routes/search.routes');

const app = express();

function configurarSeguranca(appExpress) {
    appExpress.disable('x-powered-by');
    appExpress.use(cors());
}

function configurarMiddlewares(appExpress) {
    appExpress.use(express.json({ limit: '1mb' }));
}

function configurarRotas(appExpress) {
    appExpress.get('/health', (_, res) => {
        return res.status(200).json({
            success: true,
            app: env.appName,
            environment: env.nodeEnv,
            uptime: process.uptime(),
        });
    });

    appExpress.use('/api/v1', searchRoutes);
}

function configurarRotaNaoEncontrada(appExpress) {
    appExpress.use((req, res) => {
        return res.status(404).json({
            success: false,
            message: 'Rota não encontrada',
            path: req.originalUrl,
            method: req.method,
        });
    });
}

function configurarTratamentoErros(appExpress) {
    appExpress.use(errorHandler);
}

function criarAplicacao() {
    const appExpress = express();

    configurarSeguranca(appExpress);
    configurarMiddlewares(appExpress);
    configurarRotas(appExpress);
    configurarRotaNaoEncontrada(appExpress);
    configurarTratamentoErros(appExpress);

    logger.debug(
        { app: env.appName },
        'Aplicação Express configurada com sucesso'
    );

    return appExpress;
}

module.exports = criarAplicacao();