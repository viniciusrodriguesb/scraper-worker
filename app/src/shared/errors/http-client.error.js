const AppError = require('./app.error');

class HttpClientError extends AppError {
    constructor(message, options = {}) {
        super(message, {
            code: options.code || 'HTTP_CLIENT_ERROR',
            statusCode: options.statusCode || 502,
            details: {
                method: options.method || null,
                url: options.url || null,
                baseURL: options.baseURL || null,
                requestData: options.requestData || null,
                responseStatus: options.responseStatus || null,
                responseData: options.responseData || null,
            },
            cause: options.cause || null,
        });
    }
}

module.exports = HttpClientError;