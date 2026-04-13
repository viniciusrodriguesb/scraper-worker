class AppError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = this.constructor.name;
        this.code = options.code || 'APP_ERROR';
        this.statusCode = options.statusCode || 500;
        this.details = options.details || null;
        this.cause = options.cause || null;

        Error.captureStackTrace?.(this, this.constructor);
    }
}

module.exports = AppError;