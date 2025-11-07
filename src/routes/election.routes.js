import { Router } from 'express';
import {
	createElection,
	getElections,
	getElectionById,
	voteInElection,
	closeElection,
	deleteElection,
} from '../controllers/election.controllers.js';
import { isAuthorised, isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(isLoggedIn);

router
	.route('/')
	.get(getElections)
	.post(isAuthorised(['FACULTY', 'CR']), createElection);

router
	.route('/:electionId')
	.get(getElectionById)
	.delete(isAuthorised(['FACULTY', 'ADMIN']), deleteElection);

router.post('/:electionId/vote', voteInElection);
router.post(
	'/:electionId/close',
	isAuthorised(['FACULTY', 'ADMIN']),
	closeElection
);

export default router;

