import mongoose, { Schema } from 'mongoose';

const questionSchema = new Schema(
	{
		question: {
			type: String,
			required: true,
		},
		options: {
			type: [String],
			validate: [(arr) => arr.length >= 2, 'At least two options required'],
			required: true,
		},
		correctOption: {
			type: Number,
			required: true,
		},
		points: {
			type: Number,
			default: 1,
		},
	},
	{ _id: false }
);

const submissionSchema = new Schema(
	{
		student: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
		answers: {
			type: [Number],
			default: [],
		},
		score: {
			type: Number,
			default: 0,
		},
		submittedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false }
);

const quizSchema = new Schema(
	{
		title: {
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
		startAt: {
			type: Date,
		},
		endAt: {
			type: Date,
		},
		questions: {
			type: [questionSchema],
			default: [],
		},
		submissions: {
			type: [submissionSchema],
			default: [],
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
	},
	{ timestamps: true }
);

quizSchema.methods.isOpen = function () {
	const now = new Date();
	if (this.startAt && now < this.startAt) return false;
	if (this.endAt && now > this.endAt) return false;
	return true;
};

export default mongoose.model('Quiz', quizSchema);

