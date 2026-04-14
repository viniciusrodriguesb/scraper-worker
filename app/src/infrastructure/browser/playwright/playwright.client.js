const { chromium, firefox, webkit } = require('playwright');

const env = require('../../../config/env');
const logger = require('../../../shared/logger');
const AppError = require('../../../shared/errors/app.error');
const config = require('./playwright.config');

function resolveBrowserType(browserName) {
    const browsers = {
        chromium,
        firefox,
        webkit,
    };

    const browserType = browsers[browserName];

    if (!browserType) {
        throw new AppError(`Browser não suportado: ${browserName}`, {
            code: 'PLAYWRIGHT_BROWSER_NOT_SUPPORTED',
            statusCode: 500,
            details: { browserName },
        });
    }

    return browserType;
}

async function createBrowserSession() {
    const browserType = resolveBrowserType(config.browserName);

    const browser = await browserType.launch({
        ...config.launchOptions,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--window-size=1366,768',
        ],
    });

    const context = await browser.newContext({
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        viewport: { width: 1366, height: 768 },
        userAgent: env.httpUserAgent,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Upgrade-Insecure-Requests': '1',
            Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        });

        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        window.chrome = {
            runtime: {},
        };
    });

    const page = await context.newPage();

    page.setDefaultTimeout(config.defaultTimeoutMs);
    page.setDefaultNavigationTimeout(config.navigationTimeoutMs);

    logger.debug(
        {
            browserName: config.browserName,
            headless: config.launchOptions.headless,
        },
        'Playwright browser session created'
    );

    return { browser, context, page };
}

async function closeBrowserSession(session) {
    if (!session) {
        return;
    }

    const { page, context, browser } = session;

    try {
        if (page && !page.isClosed()) {
            await page.close();
        }
    } catch (_) { }

    try {
        if (context) {
            await context.close();
        }
    } catch (_) { }

    try {
        if (browser) {
            await browser.close();
        }
    } catch (_) { }
}

module.exports = {
    createBrowserSession,
    closeBrowserSession,
};