import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    role: {
      type: String,
      enum: ['LEADER', 'MEMBER'],
      default: 'MEMBER',
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
	className: {
		type: String,
		required: true,
	},
    acadmicYear: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    statistics: {
      totalTasks: {
        type: Number,
        default: 0,
      },
      completedTasks: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

groupSchema.index(
	{ name: 1, subject: 1, section: 1, branch: 1, acadmicYear: 1, className: 1 },
	{ unique: true }
);

export default mongoose.model('Group', groupSchema);
