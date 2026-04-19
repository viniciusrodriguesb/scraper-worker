const { chromium, firefox, webkit } = require('playwright');

const logger = require('../../../shared/logger');
const AppError = require('../../../shared/errors/app.error');
const configuracao = require('./playwright.config');

let navegadorCompartilhado = null;
let promessaInicializacaoNavegador = null;

function obterTiposNavegador() {
    return {
        chromium,
        firefox,
        webkit,
    };
}

function resolverTipoNavegador(nomeNavegador) {
    const tiposNavegador = obterTiposNavegador();
    const tipoNavegador = tiposNavegador[nomeNavegador];

    if (!tipoNavegador) {
        throw new AppError(`Browser não suportado: ${nomeNavegador}`, {
            code: 'PLAYWRIGHT_BROWSER_NOT_SUPPORTED',
            statusCode: 500,
            details: { browserName: nomeNavegador },
        });
    }

    return tipoNavegador;
}

async function iniciarNavegadorCompartilhado() {
    const tipoNavegador = resolverTipoNavegador(configuracao.nomeNavegador);

    const navegador = await tipoNavegador.launch({
        headless: configuracao.modoHeadless,
        args: configuracao.argumentosInicializacao,
    });

    navegador.on('disconnected', () => {
        navegadorCompartilhado = null;
        promessaInicializacaoNavegador = null;

        logger.warn(
            {
                browserName: configuracao.nomeNavegador,
            },
            'Playwright shared browser disconnected'
        );
    });

    logger.info(
        {
            browserName: configuracao.nomeNavegador,
            headless: configuracao.modoHeadless,
        },
        'Playwright shared browser started'
    );

    return navegador;
}

async function obterNavegadorCompartilhado() {
    if (navegadorCompartilhado && navegadorCompartilhado.isConnected()) {
        return navegadorCompartilhado;
    }

    if (!promessaInicializacaoNavegador) {
        promessaInicializacaoNavegador = iniciarNavegadorCompartilhado()
            .then((navegador) => {
                navegadorCompartilhado = navegador;
                return navegador;
            })
            .finally(() => {
                promessaInicializacaoNavegador = null;
            });
    }

    return promessaInicializacaoNavegador;
}

async function aplicarMascaramentoAutomacao(contexto) {
    await contexto.addInitScript(() => {
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
}

async function criarContextoNavegador() {
    const navegador = await obterNavegadorCompartilhado();

    const contexto = await navegador.newContext({
        locale: configuracao.idioma,
        timezoneId: configuracao.fusoHorario,
        viewport: configuracao.viewport,
        userAgent: configuracao.agenteUsuario,
        ignoreHTTPSErrors: configuracao.ignorarErrosHttps,
        extraHTTPHeaders: configuracao.cabecalhosHttpExtras,
    });

    await aplicarMascaramentoAutomacao(contexto);

    return {
        navegador,
        contexto,
    };
}

function configurarPagina(pagina) {
    pagina.setDefaultTimeout(configuracao.tempoTimeoutPadraoMs);
    pagina.setDefaultNavigationTimeout(configuracao.tempoTimeoutNavegacaoMs);
}

async function criarSessaoNavegador() {
    const { navegador, contexto } = await criarContextoNavegador();
    const pagina = await contexto.newPage();

    configurarPagina(pagina);

    logger.debug(
        {
            browserName: configuracao.nomeNavegador,
            headless: configuracao.modoHeadless,
        },
        'Playwright browser session created'
    );

    return {
        browser: navegador,
        context: contexto,
        page: pagina,
    };
}

async function executarFechamentoSeguro(acao, contextoLog, mensagemLog, nivel = 'debug') {
    try {
        await acao();
    } catch (error_) {
        logger[nivel](
            {
                ...contextoLog,
                errorMessage: error_.message,
            },
            mensagemLog
        );
    }
}

async function fecharPagina(pagina) {
    if (!pagina || pagina.isClosed()) {
        return;
    }

    await executarFechamentoSeguro(
        () => pagina.close(),
        { recurso: 'page' },
        'Falha ao fechar página do Playwright'
    );
}

async function fecharContexto(contexto) {
    if (!contexto) {
        return;
    }

    await executarFechamentoSeguro(
        () => contexto.close(),
        { recurso: 'context' },
        'Falha ao fechar contexto do Playwright'
    );
}

async function fecharSessaoNavegador(sessao) {
    if (!sessao) {
        return;
    }

    const { page, context } = sessao;

    await fecharPagina(page);
    await fecharContexto(context);
}

async function encerrarNavegadorCompartilhado() {
    if (!navegadorCompartilhado) {
        return;
    }

    await executarFechamentoSeguro(
        () => navegadorCompartilhado.close(),
        {
            recurso: 'browser',
            browserName: configuracao.nomeNavegador,
        },
        'Falha ao encerrar browser compartilhado do Playwright',
        'warn'
    );

    navegadorCompartilhado = null;
    promessaInicializacaoNavegador = null;

    logger.info(
        {
            browserName: configuracao.nomeNavegador,
        },
        'Playwright shared browser stopped'
    );
}

module.exports = {
    criarSessaoNavegador,
    fecharSessaoNavegador,
    encerrarNavegadorCompartilhado,
    obterNavegadorCompartilhado,
    createBrowserSession: criarSessaoNavegador,
    closeBrowserSession: fecharSessaoNavegador,
    closeSharedBrowser: encerrarNavegadorCompartilhado,
    getSharedBrowser: obterNavegadorCompartilhado,
};