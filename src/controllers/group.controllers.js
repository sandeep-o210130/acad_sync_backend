import mongoose from 'mongoose';
import Group from '../models/group.model.js';
import Student from '../models/student.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const ALLOWED_GROUP_ROLES = ['CR', 'FACULTY', 'ADMIN'];

const ensurePrivilege = (user) => {
  if (!user || !ALLOWED_GROUP_ROLES.includes(user.role)) {
    throw new ApiError(403, 'You are not authorised to manage project groups');
  }
};

const mapMemberPayload = (members = []) => {
  if (!Array.isArray(members) || members.length === 0) {
    throw new ApiError(422, 'At least one group member is required');
  }

  const uniqueMembers = new Map();

  members.forEach((member) => {
    if (!mongoose.Types.ObjectId.isValid(member.studentId)) return;
    uniqueMembers.set(String(member.studentId), {
      studentId: member.studentId,
      role: member.role === 'LEADER' ? 'LEADER' : 'MEMBER',
    });
  });

  if (uniqueMembers.size === 0) {
    throw new ApiError(422, 'Valid student ids are required for members');
  }

  return Array.from(uniqueMembers.values());
};

export const createGroup = asyncHandler(async (req, res) => {
  ensurePrivilege(req.user);

	const {
		name = '',
		description = '',
		subject = '',
		acadmicYear = '',
		branch = '',
		section = '',
		className = '',
		members = [],
	} = req.body;

	if (
		[name, subject, acadmicYear, branch, section, className].some(
			(field) => !field.trim()
		)
	) {
		throw new ApiError(
			422,
			'Name, subject, class, academic year, branch and section are required'
		);
  }

  const memberPayload = mapMemberPayload(members);
  const memberIds = memberPayload.map((member) => member.studentId);

  const students = await Student.find({ _id: { $in: memberIds } });
  if (students.length !== memberPayload.length) {
    throw new ApiError(404, 'One or more members were not found in the system');
  }

	const group = await Group.create({
		name,
		description,
		subject,
		acadmicYear,
		branch,
		section,
		className,
		createdBy: req.user._id,
		members: memberPayload.map((member) => ({
			student: member.studentId,
			role: member.role,
		})),
	});

  await Promise.all(
    students.map((student) =>
      Student.findByIdAndUpdate(
        student._id,
        {
          $addToSet: {
            isGrouped: {
              gid: group._id,
              year: acadmicYear,
              branch,
              section,
							class: className || student.class,
              subject,
              isjoined: true,
            },
          },
        },
        { new: false }
      )
    )
  );

  const populatedGroup = await Group.findById(group._id)
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(201)
    .json(new ApiResponse(201, populatedGroup, 'Group created successfully'));
});

export const getGroups = asyncHandler(async (req, res) => {
	const { branch, section, subject, className, status, search } = req.query;

  const filters = {};
  if (branch) filters.branch = branch;
  if (section) filters.section = section;
  if (subject) filters.subject = subject;
	if (className) filters.className = className;
  if (status) filters.status = status;
  if (search) {
    filters.name = { $regex: search, $options: 'i' };
  }

  const groups = await Group.find(filters)
    .sort({ createdAt: -1 })
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(200)
    .json(new ApiResponse(200, groups, 'Groups fetched successfully'));
});

export const getGroupById = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new ApiError(422, 'Invalid group id');
  }

  const group = await Group.findById(groupId)
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  res
    .status(200)
    .json(new ApiResponse(200, group, 'Group fetched successfully'));
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new ApiError(422, 'Invalid group id');
  }

  ensurePrivilege(req.user);

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const updates = {
    name: req.body.name ?? group.name,
    description: req.body.description ?? group.description,
    subject: req.body.subject ?? group.subject,
    acadmicYear: req.body.acadmicYear ?? group.acadmicYear,
    branch: req.body.branch ?? group.branch,
    section: req.body.section ?? group.section,
    status: req.body.status ?? group.status,
  };

  if (req.body.statistics) {
    updates.statistics = {
      totalTasks: req.body.statistics.totalTasks ?? group.statistics.totalTasks,
      completedTasks:
        req.body.statistics.completedTasks ?? group.statistics.completedTasks,
    };
  }

  const updatedGroup = await Group.findByIdAndUpdate(
    groupId,
    { $set: updates },
    { new: true }
  )
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(200)
    .json(new ApiResponse(200, updatedGroup, 'Group updated successfully'));
});

export const addGroupMembers = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  ensurePrivilege(req.user);

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new ApiError(422, 'Invalid group id');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const newMembers = mapMemberPayload(req.body.members);
  const studentIds = newMembers.map((member) => member.studentId);

  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== newMembers.length) {
    throw new ApiError(404, 'One or more members were not found');
  }

  const mergedMembers = [
    ...group.members,
    ...newMembers.map((member) => ({
      student: member.studentId,
      role: member.role,
    })),
  ];

  group.members = mergedMembers;
  await group.save();

  await Promise.all(
    students.map((student) =>
      Student.findByIdAndUpdate(
        student._id,
        {
          $addToSet: {
            isGrouped: {
              gid: group._id,
              year: group.acadmicYear,
              branch: group.branch,
              section: group.section,
							class: group.className || student.class,
							class: group.className || student.class,
              subject: group.subject,
              isjoined: true,
            },
          },
        },
        { new: false }
      )
    )
  );

  const populatedGroup = await Group.findById(groupId)
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(200)
    .json(new ApiResponse(200, populatedGroup, 'Members added successfully'));
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  ensurePrivilege(req.user);

  if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
    throw new ApiError(422, 'Invalid group or member id');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  group.members = group.members.filter(
    (member) => String(member.student) !== String(memberId)
  );
  await group.save();

  await Student.findByIdAndUpdate(memberId, {
    $pull: {
      isGrouped: {
        gid: group._id,
      },
    },
  });

  const populatedGroup = await Group.findById(groupId)
    .populate('members.student', 'name email idNo class')
    .populate('createdBy', 'name email idNo');

  res
    .status(200)
    .json(new ApiResponse(200, populatedGroup, 'Member removed successfully'));
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  ensurePrivilege(req.user);

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    throw new ApiError(422, 'Invalid group id');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  await Student.updateMany(
    { 'isGrouped.gid': group._id },
    {
      $pull: {
        isGrouped: {
          gid: group._id,
        },
      },
    }
  );

  await group.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, { success: true }, 'Group deleted successfully'));
});
