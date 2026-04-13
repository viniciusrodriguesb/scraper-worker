const logger = require('../../shared/logger');
const AppError = require('../../shared/errors/app.error');

function errorHandler(error, req, res, next) {
    const isAppError = error instanceof AppError;

    const statusCode = isAppError ? error.statusCode : 500;
    const code = isAppError ? error.code : 'INTERNAL_SERVER_ERROR';
    const message = isAppError ? error.message : 'Unexpected internal error';

    logger.error(
        {
            code,
            statusCode,
            method: req.method,
            path: req.originalUrl,
            errorMessage: error.message,
            details: isAppError ? error.details : null,
        },
        'Request failed'
    );

    return res.status(statusCode).json({
        success: false,
        code,
        message,
        details: isAppError ? error.details : null,
    });
}

module.exports = errorHandler;