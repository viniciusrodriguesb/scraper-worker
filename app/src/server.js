const app = require('./app');
const env = require('./config/env');
const logger = require('./shared/logger');

app.listen(env.port, () => {
    logger.info(
        {
            app: env.appName,
            environment: env.nodeEnv,
            port: env.port,
        },
        'Server started successfully'
    );
});