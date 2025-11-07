import { Router } from 'express';
import {
	createQuiz,
	getQuizzes,
	getQuizById,
	submitQuiz,
	getQuizResults,
	deleteQuiz,
} from '../controllers/quiz.controllers.js';
import { isAuthorised, isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(isLoggedIn);

router
	.route('/')
	.get(getQuizzes)
	.post(isAuthorised(['FACULTY', 'ADMIN']), createQuiz);

router
	.route('/:quizId')
	.get(getQuizById)
	.delete(isAuthorised(['FACULTY', 'ADMIN']), deleteQuiz);

router.post('/:quizId/submit', submitQuiz);
router.get(
	'/:quizId/results',
	isAuthorised(['FACULTY', 'ADMIN']),
	getQuizResults
);

export default router;

