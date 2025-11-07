import mongoose from 'mongoose';
import { Election } from '../models/election.model.js';
import Student from '../models/student.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const MANAGE_ELECTION_ROLES = ['FACULTY', 'ADMIN', 'CR'];

const ensureManager = (user) => {
  if (!user || !MANAGE_ELECTION_ROLES.includes(user.role)) {
    throw new ApiError(403, 'You are not authorised to manage elections');
  }
};

const normaliseCandidates = (candidates = []) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new ApiError(422, 'At least one candidate is required');
  }

  const uniqueCandidates = new Map();
  candidates.forEach((candidate) => {
    if (!mongoose.Types.ObjectId.isValid(candidate.studentId)) return;
    const position = candidate.position === 'GR' ? 'GR' : 'CR';
    uniqueCandidates.set(`${candidate.studentId}-${position}`, {
      studentId: candidate.studentId,
      position,
    });
  });

  if (uniqueCandidates.size === 0) {
    throw new ApiError(422, 'Valid candidates are required');
  }

  return Array.from(uniqueCandidates.values());
};

/**
 * Helper function to update CR role atomically
 * Demotes existing CR in the same class and promotes the winner
 */
const updateCRRole = async (winnerId, className) => {
  if (!winnerId || !className) return;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find existing CR in the same class
    const oldCR = await Student.findOne({ class: className, role: 'CR' }).session(session);
    
    if (oldCR && oldCR._id.toString() !== winnerId.toString()) {
      oldCR.role = 'STUDENT';
      await oldCR.save({ session });
    }

    // Promote winner to CR
    const newCR = await Student.findById(winnerId).session(session);
    if (newCR) {
      newCR.role = 'CR';
      await newCR.save({ session });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const createElection = asyncHandler(async (req, res) => {
  ensureManager(req.user);

  const { title = '', className = '', branch = '', acadmicYear = '', closesAt, candidates = [] } = req.body;

  if ([title, className, branch, acadmicYear].some((field) => !field.trim())) {
    throw new ApiError(422, 'Title, class, branch and academic year are required');
  }

  if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 8) {
    throw new ApiError(422, 'Elections require between 2 and 8 candidates');
  }

  const candidatePayload = normaliseCandidates(candidates);
  const studentIds = candidatePayload.map((candidate) => candidate.studentId);

  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== candidatePayload.length) {
    throw new ApiError(404, 'One or more candidates not found');
  }

  const election = await Election.create({
    title,
    className,
    branch,
    acadmicYear,
    closesAt,
    createdBy: req.user._id,
    candidates: candidatePayload.map((candidate) => ({
      student: candidate.studentId,
      position: candidate.position,
    })),
  });

  const populatedElection = await Election.findById(election._id)
    .populate('candidates.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(201)
    .json(new ApiResponse(201, populatedElection, 'Election created successfully'));
});

export const getElections = asyncHandler(async (req, res) => {
  const { status, className, branch, includeClosed } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (className) filters.className = className;
  if (branch) filters.branch = branch;

  // By default, only show active (OPEN) elections unless explicitly requested
  if (!includeClosed && !status) {
    filters.status = 'OPEN';
  }

  const elections = await Election.find(filters)
    .sort({ createdAt: -1 })
    .populate('candidates.student', 'name email idNo class')
    .populate('winners.student', 'name email idNo class')
    .populate('winner', 'name email idNo class');

  res
    .status(200)
    .json(new ApiResponse(200, elections, 'Elections fetched successfully'));
});

export const getElectionById = asyncHandler(async (req, res) => {
  const { electionId } = req.params;
  const election = await Election.findById(electionId)
    .populate('candidates.student', 'name email idNo class')
    .populate('winners.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  res
    .status(200)
    .json(new ApiResponse(200, election, 'Election fetched successfully'));
});

export const voteInElection = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { electionId } = req.params;
  const { candidateId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(candidateId)) {
    throw new ApiError(422, 'Invalid candidate id');
  }

  const election = await Election.findById(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  if (!election.isOpen()) {
    throw new ApiError(400, 'Election has already been closed');
  }

  if (String(req.user.class) !== String(election.className)) {
    throw new ApiError(403, 'You are not allowed to vote in this election');
  }

  if (election.voters.some((voterId) => String(voterId) === String(req.user._id))) {
    throw new ApiError(400, 'You have already voted in this election');
  }

  const candidate = election.candidates.find(
    (cand) => String(cand.student) === String(candidateId)
  );

  if (!candidate) {
    throw new ApiError(404, 'Candidate not found in this election');
  }

  candidate.votes += 1;
  election.voters.push(req.user._id);
  await election.save();

  res
    .status(200)
    .json(new ApiResponse(200, { success: true }, 'Vote submitted successfully'));
});

export const closeElection = asyncHandler(async (req, res) => {
  ensureManager(req.user);

  const { electionId } = req.params;
  const election = await Election.findById(electionId)
    .populate('candidates.student', 'name email idNo class');

  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  if (election.status === 'CLOSED') {
    return res
      .status(200)
      .json(new ApiResponse(200, election, 'Election already closed'));
  }

  // Process CR candidates only (primary focus)
  const crCandidates = election.candidates.filter(
    (candidate) => candidate.position === 'CR'
  );

  let winnerId = null;
  let isDraw = false;
  let winners = [];

  if (crCandidates.length > 0) {
    // Sort by votes (descending)
    const sortedCandidates = [...crCandidates].sort((a, b) => b.votes - a.votes);
    const topCandidate = sortedCandidates[0];
    const topVotes = topCandidate.votes;

    // Check for tie: multiple candidates with same top votes
    const tiedCandidates = sortedCandidates.filter(
      (c) => c.votes === topVotes && c.votes > 0
    );

    if (tiedCandidates.length > 1) {
      // Draw detected - do not assign role, just mark as draw
      isDraw = true;
      election.status = 'CLOSED';
      election.resultDeclared = true;
      election.isDraw = true;
      election.winner = null;
      election.winners = [];
    } else if (topCandidate && topCandidate.votes > 0) {
      // Clear winner found
      winnerId = topCandidate.student;
      winners = [{
        position: 'CR',
        student: winnerId,
      }];

      // Update roles atomically
      await updateCRRole(winnerId, election.className);

      election.status = 'CLOSED';
      election.resultDeclared = true;
      election.isDraw = false;
      election.winner = winnerId;
      election.winners = winners;
    } else {
      // No votes cast
      election.status = 'CLOSED';
      election.resultDeclared = true;
      election.isDraw = false;
      election.winner = null;
      election.winners = [];
    }
  } else {
    // No CR candidates
    election.status = 'CLOSED';
    election.resultDeclared = true;
    election.isDraw = false;
    election.winner = null;
    election.winners = [];
  }

  await election.save();

  const updatedElection = await Election.findById(election._id)
    .populate('candidates.student', 'name email idNo class')
    .populate('winners.student', 'name email idNo class')
    .populate('winner', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(200)
    .json(new ApiResponse(200, updatedElection, 'Election closed successfully'));
});

export const deleteElection = asyncHandler(async (req, res) => {
  ensureManager(req.user);

  const { electionId } = req.params;
  const election = await Election.findById(electionId);
  if (!election) {
    throw new ApiError(404, 'Election not found');
  }

  await election.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, { success: true }, 'Election deleted successfully'));
});
