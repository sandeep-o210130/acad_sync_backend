import { Router } from 'express';
import {
	createGroup,
	getGroups,
	getGroupById,
	updateGroup,
	deleteGroup,
	addGroupMembers,
	removeGroupMember,
} from '../controllers/group.controllers.js';
import { isAuthorised, isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(isLoggedIn);

router
	.route('/')
	.get(getGroups)
	.post(isAuthorised(['CR', 'FACULTY', 'ADMIN']), createGroup);

router
	.route('/:groupId')
	.get(getGroupById)
	.put(isAuthorised(['CR', 'FACULTY', 'ADMIN']), updateGroup)
	.delete(isAuthorised(['CR', 'FACULTY', 'ADMIN']), deleteGroup);

router.post(
	'/:groupId/members',
	isAuthorised(['CR', 'FACULTY', 'ADMIN']),
	addGroupMembers
);

router.delete(
	'/:groupId/members/:memberId',
	isAuthorised(['CR', 'FACULTY', 'ADMIN']),
	removeGroupMember
);

export default router;

