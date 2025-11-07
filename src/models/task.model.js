import { Schema , model } from 'mongoose';

const taskSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		branch: {
			type: String,
			enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'],
			required: true,
		},
		subject: {
			type: String,
		},
		semister: {
			type: String,
			required: true,
		},
		dueDate: {
			type: Date,
		},
		status: {
			type: String,
			enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
			default: 'PENDING',
		},
		references: [
			{
				name: String,
				url: String,
			},
		],
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		},
	},
	{ timestamps: true }
);

export const Task = model('Task', taskSchema);
