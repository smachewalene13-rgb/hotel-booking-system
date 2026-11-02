import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startBackgroundJobs } from './jobs/scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint (NFR-06)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Hotel Booking System API',
    version: '1.0.0'
  });
});

// RESTful API mount (under /api/v1 as requested in PDF page 17)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter); // convenient fallback

// Error Handler Middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Hotel Booking Server running on http://localhost:${PORT}`);
  console.log(`📡 REST API available at http://localhost:${PORT}/api/v1`);
  // Start background jobs (holds release, no-show check)
  startBackgroundJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
