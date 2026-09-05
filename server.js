const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Serve static files (in production, Netlify's CDN serves these directly
// instead of routing them through this server)
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file for all other non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
