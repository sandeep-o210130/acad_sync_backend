import mongoose from 'mongoose';
import Attendance from '../models/attendence.model.js';
import Student from '../models/student.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const ALLOWED_ATTENDANCE_ROLES = ['CR', 'FACULTY', 'ADMIN'];

export const recordAttendance = asyncHandler(async (req, res) => {
	if (!req.user || !ALLOWED_ATTENDANCE_ROLES.includes(req.user.role)) {
		throw new ApiError(403, 'Only CR/Faculty/Admin can record attendance');
	}

	const { subject = '', date, records = [] } = req.body;

	if (!subject.trim() || !date || !Array.isArray(records) || !records.length) {
		throw new ApiError(422, 'Subject, date and attendance records are required');
	}

	const sessionDate = new Date(date);
	if (Number.isNaN(sessionDate.getTime())) {
		throw new ApiError(422, 'Invalid date format provided');
	}

	const attendanceResults = [];

	for (const record of records) {
		const { studentId, status, remarks } = record;
		if (!mongoose.Types.ObjectId.isValid(studentId)) {
			continue;
		}

		const student = await Student.findById(studentId);
		if (!student) {
			continue;
		}

		const normalizedStatus = String(status || '').toUpperCase();
		if (!['PRESENT', 'ABSENT'].includes(normalizedStatus)) {
			continue;
		}

		const attendanceDoc = await Attendance.findOneAndUpdate(
			{ student: student._id, subject, date: sessionDate },
			{
				$set: {
					recordedBy: req.user._id,
					class: student.class,
					year: student.acadmicYear,
					subject,
					date: sessionDate,
					status: normalizedStatus,
					remarks,
				},
			},
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		)
			.populate('student', 'name idNo email class')
			.populate('recordedBy', 'name idNo email');

		attendanceResults.push(attendanceDoc);
	}

	res
		.status(200)
		.json(
			new ApiResponse(200, attendanceResults, 'Attendance recorded successfully')
		);
});

export const getClassAttendance = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const isElevated = ALLOWED_ATTENDANCE_ROLES.includes(req.user.role);
	const {
		subject,
		date,
		className,
		studentId,
		status,
	} = req.query;

	const filters = {};

	if (className) {
		filters.class = className;
	} else if (!isElevated) {
		filters.class = req.user.class;
	}

	if (subject) {
		filters.subject = subject;
	}
	if (date) {
		const sessionDate = new Date(date);
		if (!Number.isNaN(sessionDate.getTime())) {
			const start = new Date(sessionDate.setHours(0, 0, 0, 0));
			const end = new Date(sessionDate.setHours(23, 59, 59, 999));
			filters.date = { $gte: start, $lte: end };
		}
	}
	if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
		filters.student = studentId;
	}
	if (status) {
		filters.status = status.toUpperCase();
	}

	const attendance = await Attendance.find(filters)
		.populate('student', 'name idNo email class')
		.populate('recordedBy', 'name idNo email')
		.sort({ date: -1, createdAt: -1 });

	res
		.status(200)
		.json(
			new ApiResponse(200, attendance, 'Attendance records fetched successfully')
		);
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const studentId = req.params.studentId || req.user._id;
	if (!mongoose.Types.ObjectId.isValid(studentId)) {
		throw new ApiError(422, 'Invalid student id');
	}

	if (
		String(studentId) !== String(req.user._id) &&
		!ALLOWED_ATTENDANCE_ROLES.includes(req.user.role)
	) {
		throw new ApiError(403, 'You are not authorised to view this student');
	}

	const attendance = await Attendance.find({ student: studentId })
		.sort({ date: -1 })
		.populate('recordedBy', 'name idNo email');

	res
		.status(200)
		.json(
			new ApiResponse(200, attendance, 'Student attendance fetched successfully')
		);
});

export const deleteAttendanceEntry = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const { attendanceId } = req.params;
	if (!mongoose.Types.ObjectId.isValid(attendanceId)) {
		throw new ApiError(422, 'Invalid attendance id');
	}

	const attendance = await Attendance.findById(attendanceId);
	if (!attendance) {
		throw new ApiError(404, 'Attendance entry not found');
	}

	const isOwner = String(attendance.recordedBy) === String(req.user._id);
	if (!isOwner && !ALLOWED_ATTENDANCE_ROLES.includes(req.user.role)) {
		throw new ApiError(403, 'You are not authorised to delete this entry');
	}

	await attendance.deleteOne();

	res
		.status(200)
		.json(
			new ApiResponse(200, { success: true }, 'Attendance entry deleted successfully')
		);
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {


	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const studentId = req.params.studentId || req.user._id;
	if (!mongoose.Types.ObjectId.isValid(studentId)) {
		throw new ApiError(422, 'Invalid student id');
	}

	if (
		String(studentId) !== String(req.user._id) &&
		!ALLOWED_ATTENDANCE_ROLES.includes(req.user.role)
	) {
		throw new ApiError(403, 'You are not authorised to view this student');
	}

	const summary = await Attendance.aggregate([
		{ $match: { student: new mongoose.Types.ObjectId(studentId) } },
		{
			$group: {
				_id: '$subject',
				total: { $sum: 1 },
				present: {
					$sum: {
						$cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0],
					},
				},
			},
		},
		{
			$project: {
				subject: '$_id',
				total: 1,
				present: 1,
				percentage: {
					$cond: [
						{ $eq: ['$total', 0] },
						0,
						{
							$round: [
								{ $multiply: [{ $divide: ['$present', '$total'] }, 100] },
								2,
							],
						},
					],
				},
			},
		},
		{ $sort: { subject: 1 } },
	]);



	res
		.status(200)
		.json(new ApiResponse(200, summary, 'Attendance summary generated'));
});
