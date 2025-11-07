import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { availbleAcadmicYears, availbleClasses, availbleRoles } from '../constants.js';
// import attendenceSchema from './attendence.model.js';

//student Schema

const studentSchema = new mongoose.Schema(
	{
		idNo: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		password: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			trim: true,
			required: true,
		},
		// 		avatar: {
		// 			type: String,
		// 			default:
		// 				'https://res.cloudinary.com/dz1q5v0xj/image/upload/v1735681234/University-Utility-Portal/default-avatar.png',
		// 		},
	class: {
		type: String,
		enum: availbleClasses,
	},
	branch: {
		type: String,
		trim: true,
	},
	section: {
		type: String,
		trim: true,
	},
	phone: {
		type: String,
		trim: true,
	},
		role: {
			type: String,
		enum: availbleRoles,
		default: 'STUDENT',
		},
		acadmicYear: {
			type: String,
			enum: availbleAcadmicYears,
		},
		// 		isEmailVerified: {
		// 			type: Boolean,
		// 			default: false,
		// 		},
	isGrouped: {
		type: [
			{
				gid: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Group',
					required: true,
				},
				year: String,
				branch: String,
				section: String,
				class: String,
				subject: String,
				isjoined: Boolean,
			},
		],
		default: [],
	},
		// attendence: {
		// 	cs401: {
		// 		totalClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 		attendedClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 	},
		// 	cs402: {
		// 		totalClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 		attendedClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 	},
		// 	cs403: {
		// 		totalClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 		attendedClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 	},
		// 	cs404: {
		// 		totalClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 		attendedClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 	},
		// 	cs405: {
		// 		totalClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 		attendedClasses: {
		// 			type: Number,
		// 			default: 0,
		// 		},
		// 	},
		// },
		// attendence: {
		// 	// type: Map,
		// 	// of: attendenceSchema,
		// },
	refreshToken: {
		type: String,
		default: undefined,
	},
	emailVerificationToken: {
		type: String,
		default: undefined,
	},
	emailVerificationTokenExpiry: {
		type: Date,
		default: undefined,
	},
	resetPasswordToken: {
		type: String,
		default: undefined,
	},
	resetPasswordTokenExpiry: {
		type: Date,
		default: undefined,
	},
	},

	{ timestamps: true }
);

//hash passsword before saving

studentSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		// Hash the password before saving
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

//check whether password is correct or not

studentSchema.methods.isPasswordCorrect = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

//generates a email verification token
studentSchema.methods.createEmailVerificationToken = function () {
	return crypto.randomBytes(32).toString('hex');
};

//generates a token for password Reset

studentSchema.methods.createResetPasswordToken = function () {
	return crypto.randomBytes(32).toString('hex');
};

//creates a long lived jwt token for refresh
studentSchema.methods.createRefreshToken = function () {
	return jwt.sign(
		{
			id: this._id,
		},
		process.env.REFRESH_TOKEN_SECRET,
		{
			expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
		}
	);
};

//creatwes a short lived jwt token for access
studentSchema.methods.createAccessToken = function () {
	return jwt.sign(
		{
			id: this._id,
		},
		process.env.ACCESS_TOKEN_SECRET,
		{
			expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
		}
	);
};

//exports the student model

const Student = mongoose.model('Student', studentSchema);
export default Student;
