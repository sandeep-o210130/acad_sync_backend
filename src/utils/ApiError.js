//  setup  standard error
class ApiError extends Error {
	constructor(
		statusCode = 400,
		message = 'Something went Wrong !',
		errors = [],
		stack = ''
	) {
		super(message);
		this.success = false;
		this.statusCode = statusCode;
		this.message = message;
		this.data = null;
		this.errors = errors;

		//catching error stack
		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

//export apiError utilty

export default ApiError;
