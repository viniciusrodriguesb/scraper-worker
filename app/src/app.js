const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const logger = require('./shared/logger');
const errorHandler = require('./presentation/middlewares/error-handler.middleware');
const amazonRoutes = require('./presentation/routes/amazon.routes');
const mercadoLivreRoutes = require('./presentation/routes/mercadolivre.routes');
const searchRoutes = require('./presentation/routes/search.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1', amazonRoutes);
app.use('/api/v1', mercadoLivreRoutes);
app.use('/api/v1', searchRoutes);

app.use(errorHandler);

logger.debug({ app: env.appName }, 'Express app configured');

module.exports = app;