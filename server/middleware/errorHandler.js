const errorHandler = (error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    const statusCode = Number.isInteger(error.statusCode)
        ? error.statusCode
        : Number.isInteger(error.status) && error.status >= 400 && error.status < 500
            ? error.status
            : 500;

    res.status(statusCode).json({
        message: statusCode === 400 ? "Invalid request body" : "Internal server error"
    });
};

module.exports = errorHandler;