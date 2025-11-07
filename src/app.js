import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

//intialize express App
const app = express();

//configure middlewares
const allowedOrigins = [
	process.env.FRONTEND_URL?.trim() || 'http://localhost:5173',
];

app.use(
	cors({
		origin(origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, origin);
			}
			return callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
	'/public',
	express.static(path.join(process.cwd(), 'public'), {
		maxAge: '30d',
	})
);

//routes
import studentRoutes from './routes/student.routes.js';
import itemRoutes from './routes/item.routes.js';
import attendanceRoutes from './routes/attendence.routes.js';
import groupRoutes from './routes/group.routes.js';
import taskRoutes from './routes/task.routes.js';
import electionRoutes from './routes/election.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/elections', electionRoutes);
app.use('/api/v1/quizzes', quizRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
