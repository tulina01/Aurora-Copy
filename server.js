const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// Import routes
const tenantRoutes = require('./routes/tenants');
const maintenanceRoutes = require('./routes/maintenance');
const inventoryRoutes = require('./routes/inventory');
const apartmentRoutes = require('./routes/apartments');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Serve static files
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/tenants', tenantRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/apartments', apartmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Aurora Tenant Management API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 20000,
})
.then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    // Extract database name from connection string
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
    console.log(`📊 Database: ${dbName}`);
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Aurora Tenant Management Server is running');
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
});

