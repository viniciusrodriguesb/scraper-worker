const env = require('../../../config/env');

const ARGUMENTOS_INICIALIZACAO_PADRAO = [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--window-size=1366,768',
];

module.exports = Object.freeze({
    nomeNavegador: env.playwrightBrowser,
    modoHeadless: env.playwrightHeadless,
    tempoTimeoutPadraoMs: env.playwrightTimeoutMs,
    tempoTimeoutNavegacaoMs: env.playwrightNavigationTimeoutMs,

    idioma: 'pt-BR',
    fusoHorario: 'America/Sao_Paulo',
    viewport: {
        width: 1366,
        height: 768,
    },

    ignorarErrosHttps: true,
    agenteUsuario: env.httpUserAgent,

    cabecalhosHttpExtras: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Upgrade-Insecure-Requests': '1',
        Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },

    argumentosInicializacao: ARGUMENTOS_INICIALIZACAO_PADRAO,
});