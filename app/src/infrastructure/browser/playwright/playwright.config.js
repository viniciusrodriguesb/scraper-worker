const env = require('../../../config/env');

module.exports = {
    browserName: env.playwrightBrowser,
    launchOptions: {
        headless: env.playwrightHeadless,
    },
    defaultTimeoutMs: env.playwrightTimeoutMs,
    navigationTimeoutMs: env.playwrightNavigationTimeoutMs,
};