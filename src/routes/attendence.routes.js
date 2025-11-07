import { Router } from 'express';

import { isAuthorised, isLoggedIn } from '../middlewares/auth.middleware.js';

import {
	recordAttendance,
	getClassAttendance,
	getStudentAttendance,
	deleteAttendanceEntry,
	getAttendanceSummary,
} from '../controllers/attendence.controllers.js';

const router = Router();

router.use(isLoggedIn);

router.post(
	'/record',
	isAuthorised(['CR', 'FACULTY', 'ADMIN']),
	recordAttendance
);
router.get('/class', getClassAttendance);
router.get('/me', getStudentAttendance);
router.get('/student/:studentId', getStudentAttendance);
router.get('/summary/:studentId', getAttendanceSummary);
router.delete(
	'/:attendanceId',
	isAuthorised(['CR', 'FACULTY', 'ADMIN']),
	deleteAttendanceEntry
);

export default router;
