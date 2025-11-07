import mongoose from 'mongoose';
import Quiz from '../models/quiz.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const QUIZ_MANAGER_ROLES = ['FACULTY', 'ADMIN'];

const ensureQuizManager = (user) => {
	if (!user || !QUIZ_MANAGER_ROLES.includes(user.role)) {
		throw new ApiError(403, 'You are not authorised to manage quizzes');
	}
};

const numberIsOutOfRange = (index, length) => {
	const numericIndex = Number(index);
	return Number.isNaN(numericIndex) || numericIndex < 0 || numericIndex >= length;
};

const maskQuizForStudent = (quiz, isManager) => {
	if (isManager || !quiz) return quiz;

	const quizObj = quiz.toObject({ getters: true });
	quizObj.questions = quizObj.questions.map((question) => ({
		question: question.question,
		options: question.options,
		points: question.points,
	}));
	delete quizObj.submissions;
	return quizObj;
};

export const createQuiz = asyncHandler(async (req, res) => {
	ensureQuizManager(req.user);

	const {
		title = '',
		description = '',
		subject = '',
		className = '',
		branch = '',
		acadmicYear = '',
		startAt,
		endAt,
		questions = [],
	} = req.body;

	if (
		[title, subject, className, branch, acadmicYear].some(
			(field) => !field.trim()
		)
	) {
		throw new ApiError(422, 'Title, subject, class, branch and academic year are required');
	}

	if (!Array.isArray(questions) || questions.length === 0) {
		throw new ApiError(422, 'At least one question is required');
	}

	const formattedQuestions = questions.map((question, index) => {
		if (!question.question || !Array.isArray(question.options) || question.options.length < 2) {
			throw new ApiError(422, `Question ${index + 1} is invalid`);
		}
		if (
			question.correctOption === undefined ||
			numberIsOutOfRange(question.correctOption, question.options.length)
		) {
			throw new ApiError(422, `Question ${index + 1} requires a valid correct option index`);
		}
		return {
			question: question.question,
			options: question.options,
			correctOption: question.correctOption,
			points: question.points ?? 1,
		};
	});

	const quiz = await Quiz.create({
		title,
		description,
		subject,
		className,
		branch,
		acadmicYear,
		startAt,
		endAt,
		questions: formattedQuestions,
		createdBy: req.user._id,
	});

	res
		.status(201)
		.json(new ApiResponse(201, quiz, 'Quiz created successfully'));
});

export const getQuizzes = asyncHandler(async (req, res) => {
	const { className, branch, subject, includeClosed } = req.query;
	const filters = {};

	if (className) filters.className = className;
	if (branch) filters.branch = branch;
	if (subject) filters.subject = subject;
	if (!includeClosed) {
		filters.$or = [{ endAt: { $gte: new Date() } }, { endAt: null }];
	}

	const quizzes = await Quiz.find(filters)
		.sort({ createdAt: -1 })
		.populate('createdBy', 'name email idNo role');

	const isManager = QUIZ_MANAGER_ROLES.includes(req.user?.role);
	const payload = quizzes.map((quiz) => maskQuizForStudent(quiz, isManager));

	res
		.status(200)
		.json(new ApiResponse(200, payload, 'Quizzes fetched successfully'));
});

export const getQuizById = asyncHandler(async (req, res) => {
	const { quizId } = req.params;
	const quiz = await Quiz.findById(quizId)
		.populate('createdBy', 'name email idNo role')
		.populate('submissions.student', 'name email idNo class');

	if (!quiz) {
		throw new ApiError(404, 'Quiz not found');
	}

	const isManager = QUIZ_MANAGER_ROLES.includes(req.user?.role);
	const payload = maskQuizForStudent(quiz, isManager);

	res
		.status(200)
		.json(new ApiResponse(200, payload, 'Quiz fetched successfully'));
});

export const submitQuiz = asyncHandler(async (req, res) => {
	if (!req.user) {
		throw new ApiError(401, 'Unauthorized');
	}

	const { quizId } = req.params;
	const { answers = [] } = req.body;

	const quiz = await Quiz.findById(quizId);
	if (!quiz) {
		throw new ApiError(404, 'Quiz not found');
	}

	if (!quiz.isOpen()) {
		throw new ApiError(400, 'Quiz is not accepting submissions at the moment');
	}

	const existingSubmission = quiz.submissions.find(
		(submission) => String(submission.student) === String(req.user._id)
	);

	if (existingSubmission) {
		throw new ApiError(400, 'You have already submitted this quiz');
	}

	let score = 0;
	quiz.questions.forEach((question, index) => {
		if (answers[index] === question.correctOption) {
			score += question.points ?? 1;
		}
	});

	quiz.submissions.push({
		student: req.user._id,
		answers,
		score,
	});

	await quiz.save();

	res
		.status(200)
		.json(new ApiResponse(200, { score }, 'Quiz submitted successfully'));
});

export const getQuizResults = asyncHandler(async (req, res) => {
	ensureQuizManager(req.user);

	const { quizId } = req.params;
	const quiz = await Quiz.findById(quizId).populate(
		'submissions.student',
		'name email idNo class'
	);

	if (!quiz) {
		throw new ApiError(404, 'Quiz not found');
	}

	res
		.status(200)
		.json(new ApiResponse(200, quiz.submissions, 'Quiz results fetched successfully'));
});

export const deleteQuiz = asyncHandler(async (req, res) => {
	ensureQuizManager(req.user);

	const { quizId } = req.params;
	const quiz = await Quiz.findById(quizId);
	if (!quiz) {
		throw new ApiError(404, 'Quiz not found');
	}

	await quiz.deleteOne();

	res
		.status(200)
		.json(new ApiResponse(200, { success: true }, 'Quiz deleted successfully'));
});

