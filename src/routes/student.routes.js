import { Router } from 'express';

import {
	registerStudent,
	loginStudent,
	logoutStudent,
	getStudentProfile,
	updateStudentProfile,
	listStudents,
	refreshAccessToken,
} from '../controllers/student.controllers.js';
import { isLoggedIn, isAuthorised } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.post('/register', registerStudent);
router.post('/login', loginStudent);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', isLoggedIn, logoutStudent);
router.get('/profile', isLoggedIn, getStudentProfile);
router.put(
	'/profile',
	isLoggedIn,
	upload.single('avatar'),
	updateStudentProfile
);
router.get('/', isLoggedIn, isAuthorised(['ADMIN', 'FACULTY', 'CR']), listStudents);

export default router;
