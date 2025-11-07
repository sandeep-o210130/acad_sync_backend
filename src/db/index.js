import mongoose from 'mongoose';
import { DATA_BASE_NAME } from '../constants.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDb = async () => {
	try {
		const connectionString = process.env.MONGODB_URI;
		if (!connectionString) {
			throw new Error('MONGODB_URI is not defined');
		}

		const dbInstance = await mongoose.connect(connectionString, {
			dbName: process.env.MONGODB_DB_NAME || DATA_BASE_NAME,
		});

		console.log('DB connected ', dbInstance.connection.host);
	} catch (err) {
		console.error('Error while connecting to database', err.message);
		process.exit(1);
	}
};

export default connectDb;
