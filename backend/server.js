import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import connectDB from './config/database.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import returnsRoutes from './routes/returnsRoutes.js';
import ratioRoutes from './routes/ratioRoutes.js';
import authRoutes from './routes/authRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';
import allocationRoutes from './routes/allocationRoutes.js';
import { startRatioAlertScheduler } from './jobs/ratioAlertJob.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', authMiddleware, portfolioRoutes);
app.use('/api/returns', authMiddleware, returnsRoutes);
app.use('/api/ratios', authMiddleware, ratioRoutes);
app.use('/api/allocations', authMiddleware, allocationRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Portfolio Tracker API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const startServer = async () => {
  await connectDB();
  startRatioAlertScheduler();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();


