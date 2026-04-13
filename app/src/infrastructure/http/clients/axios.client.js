const axios = require('axios');
const env = require('../../../config/env');
const {
    onRequest,
    onRequestError,
} = require('../interceptors/request.interceptor');
const {
    onResponse,
    onResponseError,
} = require('../interceptors/response.interceptor');

const axiosClient = axios.create({
    timeout: env.httpTimeoutMs,
    maxRedirects: env.httpMaxRedirects,
    headers: {
        Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
});

axiosClient.interceptors.request.use(onRequest, onRequestError);
axiosClient.interceptors.response.use(onResponse, onResponseError);

module.exports = axiosClient;