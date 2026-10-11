const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { getFileStore, tenantNicKey } = require('../lib/fileStore');
const { detectImageType } = require('../lib/imageBytes');

const MAX_NIC_PHOTOS = 5;

function normalizeNicPhotos(tenant) {
    const photos = Array.isArray(tenant.nicPhotos)
        ? tenant.nicPhotos
            .filter((photo) => photo && photo.key)
            .map((photo) => ({
                photoId: photo.photoId || photo.id || 'legacy',
                key: photo.key,
                contentType: photo.contentType || '',
                uploadedAt: photo.uploadedAt || null
            }))
        : [];

    if (photos.length === 0 && tenant.nicPhoto && tenant.nicPhoto.key) {
        return [{
            photoId: 'legacy',
            key: tenant.nicPhoto.key,
            contentType: tenant.nicPhoto.contentType || '',
            uploadedAt: tenant.nicPhoto.uploadedAt || null
        }];
    }

    return photos;
}

async function deleteNicBlob(key) {
    if (!key) {
        return;
    }
    try {
        await getFileStore().delete(key);
    } catch (error) {
        if (error && error.statusCode === 404) {
            return;
        }
        throw error;
    }
}

// Get all tenants with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '', 
            sortBy = 'createdAt', 
            sortOrder = 'desc' 
        } = req.query;

        // Build query
        let query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { apartmentNumber: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (status) {
            query.status = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const tenants = await Tenant.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Tenant.countDocuments(query);

        res.json({
            success: true,
            data: tenants,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenants',
            error: error.message
        });
    }
});

// Get tenant by ID
router.get('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.json({
            success: true,
            data: tenant
        });
    } catch (error) {
        console.error('Error fetching tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenant',
            error: error.message
        });
    }
});

// Create new tenant
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /tenants - Creating new tenant');
        console.log('📋 Request body:', req.body);
        
        const tenantData = req.body;
        // Photographs are stored separately. Ignore any keys sent with the form.
        delete tenantData.nicPhoto;
        delete tenantData.nicPhotos;
        
        // Set current rental period if not provided
        if (!tenantData.currentRentalPeriod) {
            tenantData.currentRentalPeriod = {
                startDate: tenantData.checkinDate,
                endDate: tenantData.checkoutDate || null
            };
        }

        const tenant = new Tenant(tenantData);
        console.log('💾 Saving tenant to database...');
        await tenant.save();
        console.log('✅ Tenant saved successfully:', tenant._id);

        res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error creating tenant:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating tenant',
            error: error.message
        });
    }
});

// Update tenant
router.put('/:id', async (req, res) => {
    try {
        const tenantData = req.body;
        delete tenantData.nicPhoto;
        delete tenantData.nicPhotos;
        
        // Set current rental period if not provided
        if (!tenantData.currentRentalPeriod) {
            tenantData.currentRentalPeriod = {
                startDate: tenantData.checkinDate,
                endDate: tenantData.checkoutDate || null
            };
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.params.id,
            tenantData,
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.json({
            success: true,
            message: 'Tenant updated successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error updating tenant:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating tenant',
            error: error.message
        });
    }
});

// Delete tenant
router.delete('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        try {
            const photos = normalizeNicPhotos(tenant);
            for (const photo of photos) {
                await deleteNicBlob(photo.key);
            }
        } catch (error) {
            return sendNicStorageError(res, error);
        }

        await tenant.deleteOne();

        res.json({
            success: true,
            message: 'Tenant deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting tenant',
            error: error.message
        });
    }
});

// Checkout tenant
router.patch('/:id/checkout', async (req, res) => {
    try {
        const { checkoutDate } = req.body;
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        await tenant.checkout(checkoutDate);

        res.json({
            success: true,
            message: 'Tenant checked out successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error checking out tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking out tenant',
            error: error.message
        });
    }
});

// Get dashboard statistics
router.get('/stats/dashboard', async (req, res) => {
    try {
        const stats = await Tenant.getDashboardStats();
        
        // Get recent tenants
        const recentTenants = await Tenant.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name apartmentNumber checkinDate status')
            .lean();

        res.json({
            success: true,
            data: {
                ...stats,
                recentTenants
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
});

// Get tenants by apartment
router.get('/apartment/:apartmentNumber', async (req, res) => {
    try {
        const tenants = await Tenant.find({
            apartmentNumber: req.params.apartmentNumber
        }).sort({ checkinDate: -1 });

        res.json({
            success: true,
            data: tenants
        });
    } catch (error) {
        console.error('Error fetching tenants by apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenants by apartment',
            error: error.message
        });
    }
});

// Search tenants
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const tenants = await Tenant.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { apartmentNumber: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json({
            success: true,
            data: tenants
        });
    } catch (error) {
        console.error('Error searching tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching tenants',
            error: error.message
        });
    }
});

// Update all tenant statuses based on dates
router.patch('/update-statuses', async (req, res) => {
    try {
        const result = await Tenant.updateAllStatuses();
        
        res.json({
            success: true,
            message: `Updated ${result.updated} tenant statuses`,
            data: result
        });
    } catch (error) {
        console.error('Error updating tenant statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating tenant statuses',
            error: error.message
        });
    }
});

function isTenantId(id) {
    return /^[a-f\d]{24}$/i.test(id);
}

function sendNicStorageError(res, error) {
    console.error('NIC photograph storage error:', error);
    const unavailable = error.statusCode === 503 || error.name === 'MissingBlobsEnvironmentError';
    return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable
            ? 'Photo storage is not available right now'
            : 'Could not access the NIC photograph'
    });
}

function readNicImage(req, res, next) {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        return res.status(400).json({
            success: false,
            message: 'NIC photograph must be a JPEG, PNG, or WebP image'
        });
    }

    return express.raw({ type: () => true, limit: '4mb' })(req, res, (error) => {
        if (!error) {
            return next();
        }
        if (error.type === 'entity.too.large' || error.status === 413) {
            return res.status(413).json({
                success: false,
                message: 'NIC photograph must be under 4 MB'
            });
        }
        return next(error);
    });
}

async function saveNicPhotoBuffer(tenant, buffer, contentType) {
    // Promote any legacy single-photo record into nicPhotos first.
    const photos = normalizeNicPhotos(tenant).map((photo) => ({
        photoId: photo.photoId,
        key: photo.key,
        contentType: photo.contentType || '',
        uploadedAt: photo.uploadedAt || null
    }));
    if (photos.length >= MAX_NIC_PHOTOS) {
        const error = new Error(`A tenant can have at most ${MAX_NIC_PHOTOS} NIC photographs`);
        error.statusCode = 400;
        throw error;
    }

    const photoId = crypto.randomBytes(8).toString('hex');
    const key = tenantNicKey(tenant._id.toString(), photoId);
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    await getFileStore().set(key, bytes, {
        metadata: { contentType, kind: 'nic', photoId }
    });

    const uploadedAt = new Date();
    const nextPhotos = photos.concat([{
        photoId,
        key,
        contentType,
        uploadedAt
    }]);

    await Tenant.findByIdAndUpdate(tenant._id, {
        $set: {
            nicPhotos: nextPhotos,
            nicPhoto: {
                key: '',
                contentType: '',
                uploadedAt: null
            }
        }
    });

    return { photoId, uploadedAt, count: nextPhotos.length };
}

async function readNicPhotoById(tenant, photoId) {
    const photos = normalizeNicPhotos(tenant);
    const photo = photos.find((entry) => entry.photoId === photoId) ||
        (photoId === '0' && photos[0]) ||
        null;
    if (!photo) {
        return null;
    }

    const result = await getFileStore().getWithMetadata(photo.key, { type: 'arrayBuffer' });
    if (!result || !result.data) {
        return null;
    }

    return {
        photo,
        contentType: (result.metadata && result.metadata.contentType) || photo.contentType || 'application/octet-stream',
        data: Buffer.from(result.data)
    };
}

async function removeNicPhotoById(tenant, photoId) {
    const photos = normalizeNicPhotos(tenant);
    const index = photos.findIndex((entry) => entry.photoId === photoId);
    if (index === -1) {
        return { removed: false, count: photos.length };
    }

    const [removed] = photos.splice(index, 1);
    await deleteNicBlob(removed.key);

    await Tenant.findByIdAndUpdate(tenant._id, {
        $set: {
            nicPhotos: photos,
            nicPhoto: {
                key: '',
                contentType: '',
                uploadedAt: null
            }
        }
    });

    return { removed: true, count: photos.length };
}

// Append a NIC photograph (up to 5 total).
router.post('/:id/nic-photos', readNicImage, async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const buffer = req.body;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'NIC photograph file is empty'
            });
        }

        const detected = detectImageType(buffer);
        if (!detected) {
            return res.status(400).json({
                success: false,
                message: 'NIC photograph must be a JPEG, PNG, or WebP image'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const data = await saveNicPhotoBuffer(tenant, buffer, detected);
        res.json({
            success: true,
            message: 'NIC photograph saved',
            data
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        return sendNicStorageError(res, error);
    }
});

router.get('/:id/nic-photos/:photoId', async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const tenant = await Tenant.findById(tenantId).select('nicPhoto nicPhotos');
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const result = await readNicPhotoById(tenant, req.params.photoId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'No NIC photograph on file'
            });
        }

        res.set('Content-Type', result.contentType);
        res.set('Cache-Control', 'private, no-store');
        res.set('Content-Disposition', 'inline; filename="nic-photograph"');
        res.send(result.data);
    } catch (error) {
        return sendNicStorageError(res, error);
    }
});

router.delete('/:id/nic-photos/:photoId', async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const result = await removeNicPhotoById(tenant, req.params.photoId);
        res.json({
            success: true,
            message: result.removed ? 'NIC photograph removed' : 'NIC photograph not found',
            data: { count: result.count }
        });
    } catch (error) {
        return sendNicStorageError(res, error);
    }
});

// Legacy single-photo endpoints (replace-first / fetch-first / clear-all).
router.put('/:id/nic-photo', readNicImage, async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const buffer = req.body;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'NIC photograph file is empty'
            });
        }

        const detected = detectImageType(buffer);
        if (!detected) {
            return res.status(400).json({
                success: false,
                message: 'NIC photograph must be a JPEG, PNG, or WebP image'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const existing = normalizeNicPhotos(tenant);
        for (const photo of existing) {
            await deleteNicBlob(photo.key);
        }

        await Tenant.findByIdAndUpdate(tenantId, {
            $set: {
                nicPhotos: [],
                nicPhoto: {
                    key: '',
                    contentType: '',
                    uploadedAt: null
                }
            }
        });

        const refreshed = await Tenant.findById(tenantId);
        const data = await saveNicPhotoBuffer(refreshed, buffer, detected);
        res.json({
            success: true,
            message: 'NIC photograph saved',
            data
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        return sendNicStorageError(res, error);
    }
});

router.get('/:id/nic-photo', async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const tenant = await Tenant.findById(tenantId).select('nicPhoto nicPhotos');
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const photos = normalizeNicPhotos(tenant);
        if (photos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No NIC photograph on file'
            });
        }

        const result = await readNicPhotoById(tenant, photos[0].photoId);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'No NIC photograph on file'
            });
        }

        res.set('Content-Type', result.contentType);
        res.set('Cache-Control', 'private, no-store');
        res.set('Content-Disposition', 'inline; filename="nic-photograph"');
        res.send(result.data);
    } catch (error) {
        return sendNicStorageError(res, error);
    }
});

router.delete('/:id/nic-photo', async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (!isTenantId(tenantId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tenant id'
            });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        const photos = normalizeNicPhotos(tenant);
        for (const photo of photos) {
            await deleteNicBlob(photo.key);
        }

        await Tenant.findByIdAndUpdate(tenantId, {
            $set: {
                nicPhotos: [],
                nicPhoto: {
                    key: '',
                    contentType: '',
                    uploadedAt: null
                }
            }
        });

        res.json({
            success: true,
            message: 'NIC photograph removed'
        });
    } catch (error) {
        return sendNicStorageError(res, error);
    }
});

module.exports = router;

