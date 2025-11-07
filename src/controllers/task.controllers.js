import { Task } from '../models/task.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const ALLOWED_TASK_ROLES = ['FACULTY', 'ADMIN'];

const ensureTaskPrivileges = (user) => {
  if (!user || !ALLOWED_TASK_ROLES.includes(user.role)) {
    throw new ApiError(403, 'You are not authorised to manage lab tasks');
  }
};

export const createTask = asyncHandler(async (req, res) => {
  ensureTaskPrivileges(req.user);

  const {
    title = '',
    description = '',
    branch = '',
    subject = '',
    semister = '',
    dueDate,
    references = [],
  } = req.body;

  if ([title, description, branch, subject, semister].some((field) => !field.trim())) {
    throw new ApiError(422, 'Title, description, branch, subject and semester are required');
  }

  const formattedReferences = Array.isArray(references)
    ? references
        .filter((ref) => ref?.name && ref?.url)
        .map((ref) => ({
          name: ref.name,
          url: ref.url,
        }))
    : [];

  const task = await Task.create({
    title,
    description,
    branch,
    subject,
    semister,
    dueDate,
    references: formattedReferences,
    createdBy: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, task, 'Lab task created successfully'));
});

export const getTasks = asyncHandler(async (req, res) => {
  const { branch, subject, semister, status } = req.query;

  const filters = {};
  if (branch) filters.branch = branch;
  if (subject) filters.subject = subject;
  if (semister) filters.semister = semister;
  if (status) filters.status = status;

  const tasks = await Task.find(filters)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email idNo role');

  res
    .status(200)
    .json(new ApiResponse(200, tasks, 'Lab tasks fetched successfully'));
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId).populate('createdBy', 'name email idNo role');
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  res
    .status(200)
    .json(new ApiResponse(200, task, 'Lab task fetched successfully'));
});

export const updateTask = asyncHandler(async (req, res) => {
  ensureTaskPrivileges(req.user);

  const { taskId } = req.params;
  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const updates = {
    title: req.body.title ?? task.title,
    description: req.body.description ?? task.description,
    branch: req.body.branch ?? task.branch,
    subject: req.body.subject ?? task.subject,
    semister: req.body.semister ?? task.semister,
    dueDate: req.body.dueDate ?? task.dueDate,
    status: req.body.status ?? task.status,
  };

  if (Array.isArray(req.body.references)) {
    updates.references = req.body.references
      .filter((ref) => ref?.name && ref?.url)
      .map((ref) => ({ name: ref.name, url: ref.url }));
  }

  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    { $set: updates },
    { new: true }
  ).populate('createdBy', 'name email idNo role');

  res
    .status(200)
    .json(new ApiResponse(200, updatedTask, 'Lab task updated successfully'));
});

export const deleteTask = asyncHandler(async (req, res) => {
  ensureTaskPrivileges(req.user);

  const { taskId } = req.params;
  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  await task.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, { success: true }, 'Lab task deleted successfully'));
});
