const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootEnvPath = path.resolve(process.cwd(), '../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

const selectedEnvPath = fs.existsSync(rootEnvPath) ? rootEnvPath : localEnvPath;

dotenv.config({ path: selectedEnvPath });

function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const appName = process.env.APP_NAME || 'scraper-worker';

const env = Object.freeze({
    appName,
    nodeEnv,
    port: toNumber(process.env.PORT, 3000),

    logLevel:
        process.env.LOG_LEVEL ||
        (nodeEnv === 'production' ? 'info' : 'debug'),

    httpTimeoutMs: toNumber(process.env.HTTP_TIMEOUT_MS, 15000),
    httpMaxRedirects: toNumber(process.env.HTTP_MAX_REDIRECTS, 5),

    httpUserAgent:
        process.env.HTTP_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
});

module.exports = env;