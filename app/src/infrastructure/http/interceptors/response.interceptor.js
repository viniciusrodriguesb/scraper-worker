const logger = require('../../../shared/logger');
const HttpClientError = require('../../../shared/errors/http-client.error');

function onResponse(response) {
    logger.debug(
        {
            method: response.config?.method?.toUpperCase(),
            url: response.config?.url,
            status: response.status,
        },
        'HTTP request finished'
    );

    return response;
}

function onResponseError(error) {
    const normalizedError = new HttpClientError('HTTP request failed', {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        requestData: error.config?.data || null,
        responseStatus: error.response?.status || null,
        responseData: error.response?.data || null,
        cause: error,
    });

    logger.error(
        {
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
        },
        'HTTP request failed'
    );

    return Promise.reject(normalizedError);
}

module.exports = {
    onResponse,
    onResponseError,
};