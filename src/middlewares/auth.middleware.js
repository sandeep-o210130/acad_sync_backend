import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Student from '../models/student.model.js';

const isLoggedIn = asyncHandler(async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token =
		req.cookies?.accessToken ||
		req.query?.token ||
		(authHeader && authHeader.startsWith('Bearer ')
			? authHeader.replace('Bearer ', '')
			: undefined);

	if (!token) {
		throw new ApiError(401, 'Unauthorized access. Please login to continue');
	}

	try {
		const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		const student = await Student.findById(decodedToken?.id).select(
			'-password'
		);

		if (!student) {
			throw new ApiError(401, 'Unauthorized access. Please login again');
		}

		req.user = student;
		return next();
	} catch (error) {
		throw new ApiError(401, 'Invalid or expired token. Please login again');
	}
});

const isAuthorised = (roles = []) =>
	asyncHandler(async (req, res, next) => {
		if (!req.user) {
			throw new ApiError(401, 'Unauthorized access');
		}

		if (roles.length === 0 || roles.includes(req.user.role)) {
			return next();
		}

		throw new ApiError(403, 'You are not authorised to perform this action');
	});

export { isLoggedIn, isAuthorised };
