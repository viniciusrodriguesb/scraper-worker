const pino = require('pino');
const env = require('../../config/env');

const transport =
    env.nodeEnv !== 'production'
        ? pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        })
        : undefined;

const logger = pino(
    {
        name: env.appName,
        level: env.logLevel,
        base: { app: env.appName },
        redact: [
            'headers.authorization',
            'config.headers.authorization',
            'config.headers.Authorization',
        ],
    },
    transport
);

module.exports = logger;