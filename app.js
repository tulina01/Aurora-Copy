const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const requireIdentity = require('./middleware/requireIdentity');

// Import routes
const tenantRoutes = require('./routes/tenants');
const maintenanceRoutes = require('./routes/maintenance');
const inventoryRoutes = require('./routes/inventory');
const apartmentRoutes = require('./routes/apartments');

const app = express();

// Security middleware
// contentSecurityPolicy is disabled: the Netlify Identity widget loads a
// cross-origin script and iframe that a default CSP would block.
app.use(helmet({ contentSecurityPolicy: false }));

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

// Health check endpoint (public, no auth required)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Aurora Tenant Management API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API Routes (require an authenticated Netlify Identity user)
app.use('/api/tenants', requireIdentity, tenantRoutes);
app.use('/api/maintenance', requireIdentity, maintenanceRoutes);
app.use('/api/inventory', requireIdentity, inventoryRoutes);
app.use('/api/apartments', requireIdentity, apartmentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler, scoped to /api so it never shadows static asset requests
// when this app is mounted alongside static file serving in server.js
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;
