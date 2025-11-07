import mongoose, { Schema } from 'mongoose';

const itemSchema = Schema(
	{
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		location: {
			type: String,
			trim: true,
		},
		category: {
			type: String,
			trim: true,
		},
		itemImage: {
			type: String,
			default: '',
		},
		phoneNo: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ['OPEN', 'RESOLVED'],
			default: 'OPEN',
		},
		resolvedAt: {
			type: Date,
			default: null,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
		},
	},
	{ timestamps: true }
);

export const Item = mongoose.model('Item', itemSchema);
