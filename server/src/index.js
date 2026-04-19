require('dotenv').config();
const express = require('express');
const cors = require('cors');
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const decayScheduler = require('./services/decayScheduler');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path}`
    );
    next();
});

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Next In Line server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    decayScheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    decayScheduler.stop();
    pool.end();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    decayScheduler.stop();
    pool.end();
    process.exit(0);
});