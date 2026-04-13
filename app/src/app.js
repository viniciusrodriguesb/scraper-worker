const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const logger = require('./shared/logger');
const AppError = require('./shared/errors/app.error');
const axiosClient = require('./infrastructure/http/clients/axios.client');
const errorHandler = require('./presentation/middlewares/error-handler.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'API is healthy',
        app: env.appName,
        environment: env.nodeEnv,
    });
});

app.get('/test/app-error', (req, res, next) => {
    try {
        throw new AppError('Erro controlado para teste', {
            code: 'TEST_APP_ERROR',
            statusCode: 400,
            details: {
                reason: 'manual-test',
            },
        });
    } catch (error) {
        next(error);
    }
});

app.get('/test/http-error', async (req, res, next) => {
    try {
        await axiosClient.get(`http://127.0.0.1:${env.port}/__internal__/upstream-error`);

        return res.status(200).json({
            success: true,
            message: 'This should not happen',
        });
    } catch (error) {
        next(error);
    }
});

app.use((req, res, next) => {
    next(
        new AppError('Rota não encontrada', {
            code: 'ROUTE_NOT_FOUND',
            statusCode: 404,
            details: {
                method: req.method,
                path: req.originalUrl,
            },
        })
    );
});

app.use(errorHandler);

logger.debug({ app: env.appName }, 'Express app configured');

module.exports = app;