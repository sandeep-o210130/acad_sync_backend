import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
	next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
	const statusCode = err.statusCode || 500;
	const response = {
		success: false,
		statusCode,
		message: err.message || 'Internal server error',
		errors: err.errors || [],
	};

	if (process.env.NODE_ENV === 'development') {
		response.stack = err.stack;
	}

	res.status(statusCode).json(response);
};

