import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Student from '../models/student.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const sanitizeStudent = (studentDoc) => {
	if (!studentDoc) return null;
	const student = studentDoc.toObject({ getters: true });
	delete student.password;
	delete student.refreshToken;
	delete student.resetPasswordToken;
	delete student.resetPasswordTokenExpiry;
	delete student.emailVerificationToken;
	delete student.emailVerificationTokenExpiry;
	return student;
};

const generateAccessToken = (student) =>
	jwt.sign(
		{ id: student._id, role: student.role },
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d' }
	);

const generateRefreshToken = (student) =>
	jwt.sign({ id: student._id }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
	});

export const registerStudent = asyncHandler(async (req, res) => {
	const {
		idNo = '',
		email = '',
		password = '',
		name = '',
		role = 'STUDENT',
		className,
		acadmicYear,
		branch,
		section,
		phone,
	} = req.body;

	if ([idNo, email, password, name].some((field) => !field?.toString().trim())) {
		throw new ApiError(422, 'idNo, email, password and name are required');
	}

	const existingStudent = await Student.findOne({
		$or: [{ idNo }, { email }],
	});

	if (existingStudent) {
		throw new ApiError(409, 'Student already registered');
	}

	const student = await Student.create({
		idNo,
		name,
		email,
		password,
		role,
		class: className,
		acadmicYear,
		branch,
		section,
		phone,
	});

	res
		.status(201)
		.json(
			new ApiResponse(
				201,
				sanitizeStudent(student),
				'Student registered successfully'
			)
		);
});

export const loginStudent = asyncHandler(async (req, res) => {
	const { identifier = '', password = '' } = req.body;

	if (!identifier.trim() || !password.trim()) {
		throw new ApiError(422, 'Identifier and password are required');
	}

	const student = await Student.findOne({
		$or: [{ email: identifier }, { idNo: identifier }],
	});

	if (!student) {
		throw new ApiError(401, 'Invalid credentials');
	}

	const isMatch = await student.isPasswordCorrect(password);
	if (!isMatch) {
		throw new ApiError(401, 'Invalid credentials');
	}

	const accessToken = generateAccessToken(student);
	const refreshToken = generateRefreshToken(student);

	student.refreshToken = refreshToken;
	await student.save({ validateBeforeSave: false });

	const payload = {
		...sanitizeStudent(student),
		accessToken,
		refreshToken,
	};

	res
		.status(200)
		.json(new ApiResponse(200, payload, 'Student logged in successfully'));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		throw new ApiError(401, 'Refresh token is required');
	}

	const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
	const student = await Student.findById(decoded.id);

	if (!student || student.refreshToken !== refreshToken) {
		throw new ApiError(401, 'Invalid refresh token');
	}

	const accessToken = generateAccessToken(student);

	res
		.status(200)
		.json(
			new ApiResponse(200, { accessToken }, 'Access token refreshed')
		);
});

export const logoutStudent = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	await Student.findByIdAndUpdate(req.user._id, {
		$unset: { refreshToken: 1 },
	});

	res
		.status(200)
		.json(new ApiResponse(200, { success: true }, 'Logged out successfully'));
});

export const getStudentProfile = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	res
		.status(200)
		.json(
			new ApiResponse(
				200,
				sanitizeStudent(req.user),
				'Student profile fetched successfully'
			)
		);
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const updates = {
		name: req.body.name ?? req.user.name,
		email: req.body.email ?? req.user.email,
		class: req.body.className ?? req.user.class,
		acadmicYear: req.body.acadmicYear ?? req.user.acadmicYear,
		branch: req.body.branch ?? req.user.branch,
		section: req.body.section ?? req.user.section,
		phone: req.body.phone ?? req.user.phone,
	};

	if (req.file) {
		const uploadResult = await uploadOnCloudinary(req.file.path);
		if (!uploadResult) {
			throw new ApiError(500, 'Failed to upload avatar');
		}
		updates.avatar = uploadResult.secure_url || uploadResult.url;
	}

	const updatedStudent = await Student.findByIdAndUpdate(
		req.user._id,
		{ $set: updates },
		{ new: true }
	);

	res
		.status(200)
		.json(
			new ApiResponse(
				200,
				sanitizeStudent(updatedStudent),
				'Profile updated successfully'
			)
		);
});

export const listStudents = asyncHandler(async (req, res) => {
	const { className, search } = req.query;

	const filters = {};
	if (className) {
		filters.class = className;
	}
	if (search) {
		filters.$or = [
			{ name: { $regex: search, $options: 'i' } },
			{ idNo: { $regex: search, $options: 'i' } },
		];
	}

	const students = await Student.find(filters)
		.sort({ name: 1 })
		.select('-password -refreshToken -resetPasswordToken -resetPasswordTokenExpiry');

	res
		.status(200)
		.json(
			new ApiResponse(200, students, 'Students fetched successfully')
		);
});
