import dotenv from 'dotenv';
dotenv.config({
	path: './.env',
});
import nodemailer from 'nodemailer';

//const send mail Function
const sendMail = async () => {
	//create a transporter object using the default SMTP transport
	const transporter = nodemailer.createTransport({
		host: process.env.MAILTRAP_HOST,
		port: process.env.MAILTRAP_PORT,
		secure: false,
		auth: {
			user: process.env.MAILTRAP_USER,
			pass: process.env.MAILTRAP_PASSWORD,
		},
	});
	const mailOptions = {
		from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
		to: 'bar@example.com, baz@example.com',
		subject: 'Hello ✔',
		text: 'Hello world?', // plain‑text body
		html: '<b>Hello world?</b>', // HTML body
	};
	await transporter.sendMail(mailOptions);
};

export const sendEmailVerificationMail = async ({
	email,
	emailVerificationToken,
}) => {
	try {
	} catch (error) {}
};

export const sendPasswordResetMail = async ({ email, resetPasswordToken }) => {
	try {
	} catch (error) {}
};
