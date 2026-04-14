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

function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || 'development';
const appName = process.env.APP_NAME || 'scraper-worker';

const env = Object.freeze({
    appName,
    nodeEnv,
    port: toNumber(process.env.PORT, 3000),
    searchProviderTimeoutMs: toNumber(process.env.SEARCH_PROVIDER_TIMEOUT_MS, 45000),
    logLevel:
        process.env.LOG_LEVEL ||
        (nodeEnv === 'production' ? 'info' : 'debug'),

    httpTimeoutMs: toNumber(process.env.HTTP_TIMEOUT_MS, 15000),
    httpMaxRedirects: toNumber(process.env.HTTP_MAX_REDIRECTS, 5),

    httpUserAgent:
        process.env.HTTP_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',

    playwrightBrowser: process.env.PLAYWRIGHT_BROWSER || 'chromium',
    playwrightHeadless: toBoolean(process.env.PLAYWRIGHT_HEADLESS, true),
    playwrightTimeoutMs: toNumber(process.env.PLAYWRIGHT_TIMEOUT_MS, 30000),
    playwrightNavigationTimeoutMs: toNumber(
        process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
        30000
    ),

    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
});

module.exports = env;