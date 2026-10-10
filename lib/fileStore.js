// Site-wide Netlify Blobs store for private files.
// Keys are grouped so later photos can share this store:
//   tenants/{tenantId}/nic
//   inventory/{itemId}/photo
//   apartments/{apartmentId}/utility
const path = require('path');
const { getStore, connectLambda } = require('@netlify/blobs');

const STORE_NAME = 'aurora-files';
const LOCAL_SITE_ID = 'aurora-local';
const LOCAL_TOKEN = 'aurora-local-dev-token';

let localEdgeURL = null;
let startingLocal = null;

function runningOnNetlify() {
    return process.env.NETLIFY === 'true' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function connectNetlifyBlobs(event) {
    connectLambda(event);
}

async function ensureLocalFileStore() {
    if (runningOnNetlify()) {
        return;
    }
    if (localEdgeURL) {
        return;
    }
    if (!startingLocal) {
        startingLocal = startLocalFileStore();
    }
    await startingLocal;
}

async function startLocalFileStore() {
    const { BlobsServer } = require('@netlify/blobs/server');
    const directory = path.join(__dirname, '..', '.data', 'blobs');
    const server = new BlobsServer({
        directory,
        token: LOCAL_TOKEN
    });
    const info = await server.start();
    localEdgeURL = info.address;
    console.log(`📁 Local file store ready at ${localEdgeURL}`);
}

function getFileStore() {
    if (runningOnNetlify()) {
        return getStore(STORE_NAME);
    }
    if (!localEdgeURL) {
        const error = new Error('File storage is not available');
        error.statusCode = 503;
        throw error;
    }
    return getStore({
        name: STORE_NAME,
        edgeURL: localEdgeURL,
        siteID: LOCAL_SITE_ID,
        token: LOCAL_TOKEN
    });
}

function tenantNicKey(tenantId) {
    return `tenants/${tenantId}/nic`;
}

function maintenancePhotoKey(recordId) {
    return `maintenance/${recordId}/photo`;
}

function inventoryPhotoKey(recordId) {
    return `inventory/${recordId}/photo`;
}

module.exports = {
    STORE_NAME,
    connectNetlifyBlobs,
    ensureLocalFileStore,
    getFileStore,
    tenantNicKey,
    maintenancePhotoKey,
    inventoryPhotoKey
};
