import { Router } from 'express';
import {
	createTask,
	getTasks,
	getTaskById,
	updateTask,
	deleteTask,
} from '../controllers/task.controllers.js';
import { isAuthorised, isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(isLoggedIn);

router
	.route('/')
	.get(getTasks)
	.post(isAuthorised(['FACULTY', 'ADMIN']), createTask);

router
	.route('/:taskId')
	.get(getTaskById)
	.put(isAuthorised(['FACULTY', 'ADMIN']), updateTask)
	.delete(isAuthorised(['FACULTY', 'ADMIN']), deleteTask);

export default router;

