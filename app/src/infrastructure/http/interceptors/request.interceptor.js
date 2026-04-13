const env = require('../../../config/env');
const logger = require('../../../shared/logger');

function onRequest(config) {
    config.headers = config.headers || {};

    if (!config.headers['User-Agent'] && !config.headers['user-agent']) {
        config.headers['User-Agent'] = env.httpUserAgent;
    }

    logger.debug(
        {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            params: config.params,
        },
        'HTTP request started'
    );

    return config;
}

function onRequestError(error) {
    logger.error({ error }, 'HTTP request setup failed');
    return Promise.reject(error);
}

module.exports = {
    onRequest,
    onRequestError,
};