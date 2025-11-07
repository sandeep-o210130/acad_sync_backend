import mongoose, { Schema, model } from 'mongoose';

const candidateSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    position: {
      type: String,
      enum: ['CR', 'GR'],
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const winnerSchema = new Schema(
  {
    position: {
      type: String,
      enum: ['CR', 'GR'],
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
  },
  { _id: false }
);

const electionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    acadmicYear: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    },
    closesAt: {
      type: Date,
    },
    candidates: {
      type: [candidateSchema],
      default: [],
    },
    voters: {
      type: [Schema.Types.ObjectId],
      ref: 'Student',
      default: [],
    },
    winners: {
      type: [winnerSchema],
      default: [],
    },
    resultDeclared: {
      type: Boolean,
      default: false,
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
  },
  { timestamps: true }
);

electionSchema.index({ className: 1, status: 1 });

electionSchema.methods.isOpen = function () {
  if (this.status === 'CLOSED') return false;
  if (this.closesAt && new Date() > this.closesAt) return false;
  return true;
};

export const Election = model('Election', electionSchema);
