const serverless = require('serverless-http');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('../../app');
const { connectNetlifyBlobs } = require('../../lib/fileStore');

let isConnected = false;

async function connectToDatabase() {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    await mongoose.connect(process.env.MONGODB_URI, {
        family: 4,
        serverSelectionTimeoutMS: 20000,
    });
    isConnected = true;
}

// Attach the Lambda context (which carries Netlify Identity's decoded user
// under context.clientContext.user) onto req.context for middleware/requireIdentity.js
const handleRequest = serverless(app, {
    binary: ['image/*', 'application/pdf'],
    request(request, event, context) {
        request.context = context;
    }
});

module.exports.handler = async (event, context) => {
    // Let a warm container reuse its MongoDB connection across invocations
    // instead of waiting for the connection pool to drain on every call.
    context.callbackWaitsForEmptyEventLoop = false;

    // Always wire Blobs for this request. Signature images (and other private
    // files) are read during PDF generation; skipping connectLambda when
    // event.blobs is missing leaves getStore() unable to load those files.
    try {
        connectNetlifyBlobs(event);
    } catch (error) {
        console.warn('Netlify Blobs connect skipped:', error.message);
    }

    await connectToDatabase();

    return handleRequest(event, context);
};
