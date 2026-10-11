const crypto = require('crypto');
const express = require('express');
const { getFileStore } = require('./fileStore');
const { detectImageType } = require('./imageBytes');

function isRecordId(id) {
    return /^[a-f\d]{24}$/i.test(String(id || ''));
}

function sendPhotoError(res, error) {
    console.error('Photograph storage error:', error);
    const unavailable = error.statusCode === 503 || error.name === 'MissingBlobsEnvironmentError';
    return res.status(unavailable ? 503 : 500).json({
        success: false,
        message: unavailable
            ? 'Photo storage is not available right now'
            : 'Could not access the photograph'
    });
}

function readPhoto(req, res, next) {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        return res.status(400).json({
            success: false,
            message: 'Photograph must be a JPEG, PNG, or WebP image'
        });
    }

    return express.raw({ type: () => true, limit: '4mb' })(req, res, (error) => {
        if (!error) {
            return next();
        }
        if (error.type === 'entity.too.large' || error.status === 413) {
            return res.status(413).json({
                success: false,
                message: 'Photograph must be under 4 MB'
            });
        }
        return next(error);
    });
}

function normalizeRecordPhotos(record) {
    const photos = Array.isArray(record.photos)
        ? record.photos
            .filter((photo) => photo && photo.key)
            .map((photo) => ({
                photoId: photo.photoId || photo.id || 'legacy',
                key: photo.key,
                contentType: photo.contentType || '',
                uploadedAt: photo.uploadedAt || null
            }))
        : [];

    if (photos.length === 0 && record.photo && record.photo.key) {
        return [{
            photoId: 'legacy',
            key: record.photo.key,
            contentType: record.photo.contentType || '',
            uploadedAt: record.photo.uploadedAt || null
        }];
    }

    return photos;
}

async function deletePhotoBlob(key) {
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

function emptyPhotoField() {
    return {
        key: '',
        contentType: '',
        uploadedAt: null
    };
}

function attachPhotoRoutes(router, { Model, keyFor, kind, maxPhotos = 1 }) {
    const multi = maxPhotos > 1;

    async function savePhotoBuffer(record, buffer, contentType) {
        const photos = normalizeRecordPhotos(record).map((photo) => ({
            photoId: photo.photoId,
            key: photo.key,
            contentType: photo.contentType || '',
            uploadedAt: photo.uploadedAt || null
        }));

        if (photos.length >= maxPhotos) {
            const error = new Error(`A record can have at most ${maxPhotos} photographs`);
            error.statusCode = 400;
            throw error;
        }

        const photoId = crypto.randomBytes(8).toString('hex');
        const key = multi ? keyFor(record._id.toString(), photoId) : keyFor(record._id.toString());
        const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        await getFileStore().set(key, bytes, {
            metadata: { contentType, kind, photoId }
        });

        const uploadedAt = new Date();

        if (!multi) {
            await Model.findByIdAndUpdate(record._id, {
                $set: {
                    'photo.key': key,
                    'photo.contentType': contentType,
                    'photo.uploadedAt': uploadedAt
                }
            });
            return { photoId: 'legacy', uploadedAt, count: 1 };
        }

        const nextPhotos = photos.concat([{
            photoId,
            key,
            contentType,
            uploadedAt
        }]);

        await Model.findByIdAndUpdate(record._id, {
            $set: {
                photos: nextPhotos,
                photo: emptyPhotoField()
            }
        });

        return { photoId, uploadedAt, count: nextPhotos.length };
    }

    async function readPhotoById(record, photoId) {
        const photos = normalizeRecordPhotos(record);
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

    async function removePhotoById(record, photoId) {
        const photos = normalizeRecordPhotos(record);
        const index = photos.findIndex((entry) => entry.photoId === photoId);
        if (index === -1) {
            return { removed: false, count: photos.length };
        }

        const [removed] = photos.splice(index, 1);
        await deletePhotoBlob(removed.key);

        if (!multi) {
            await Model.findByIdAndUpdate(record._id, {
                $set: {
                    photo: emptyPhotoField()
                }
            });
            return { removed: true, count: 0 };
        }

        await Model.findByIdAndUpdate(record._id, {
            $set: {
                photos,
                photo: emptyPhotoField()
            }
        });

        return { removed: true, count: photos.length };
    }

    if (multi) {
        router.post('/:id/photos', readPhoto, async (req, res) => {
            try {
                const recordId = req.params.id;
                if (!isRecordId(recordId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid record id'
                    });
                }

                const buffer = req.body;
                if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Photograph file is empty'
                    });
                }

                const detected = detectImageType(buffer);
                if (!detected) {
                    return res.status(400).json({
                        success: false,
                        message: 'Photograph must be a JPEG, PNG, or WebP image'
                    });
                }

                const record = await Model.findById(recordId);
                if (!record) {
                    return res.status(404).json({
                        success: false,
                        message: 'Record not found'
                    });
                }

                const data = await savePhotoBuffer(record, buffer, detected);
                res.json({
                    success: true,
                    message: 'Photograph saved',
                    data
                });
            } catch (error) {
                if (error.statusCode === 400) {
                    return res.status(400).json({
                        success: false,
                        message: error.message
                    });
                }
                return sendPhotoError(res, error);
            }
        });

        router.get('/:id/photos/:photoId', async (req, res) => {
            try {
                const recordId = req.params.id;
                if (!isRecordId(recordId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid record id'
                    });
                }

                const record = await Model.findById(recordId).select('photo photos');
                if (!record) {
                    return res.status(404).json({
                        success: false,
                        message: 'Record not found'
                    });
                }

                const result = await readPhotoById(record, req.params.photoId);
                if (!result) {
                    return res.status(404).json({
                        success: false,
                        message: 'No photograph on file'
                    });
                }

                res.set('Content-Type', result.contentType);
                res.set('Cache-Control', 'private, no-store');
                res.set('Content-Disposition', 'inline; filename="photograph"');
                res.send(result.data);
            } catch (error) {
                return sendPhotoError(res, error);
            }
        });

        router.delete('/:id/photos/:photoId', async (req, res) => {
            try {
                const recordId = req.params.id;
                if (!isRecordId(recordId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid record id'
                    });
                }

                const record = await Model.findById(recordId);
                if (!record) {
                    return res.status(404).json({
                        success: false,
                        message: 'Record not found'
                    });
                }

                const result = await removePhotoById(record, req.params.photoId);
                res.json({
                    success: true,
                    message: result.removed ? 'Photograph removed' : 'Photograph not found',
                    data: { count: result.count }
                });
            } catch (error) {
                return sendPhotoError(res, error);
            }
        });
    }

    // Legacy single-photo endpoints (replace / fetch-first / clear-all).
    router.put('/:id/photo', readPhoto, async (req, res) => {
        try {
            const recordId = req.params.id;
            if (!isRecordId(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid record id'
                });
            }

            const buffer = req.body;
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Photograph file is empty'
                });
            }

            const detected = detectImageType(buffer);
            if (!detected) {
                return res.status(400).json({
                    success: false,
                    message: 'Photograph must be a JPEG, PNG, or WebP image'
                });
            }

            const record = await Model.findById(recordId);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'Record not found'
                });
            }

            if (multi) {
                const existing = normalizeRecordPhotos(record);
                for (const photo of existing) {
                    await deletePhotoBlob(photo.key);
                }
                await Model.findByIdAndUpdate(recordId, {
                    $set: {
                        photos: [],
                        photo: emptyPhotoField()
                    }
                });
                const refreshed = await Model.findById(recordId);
                const data = await savePhotoBuffer(refreshed, buffer, detected);
                return res.json({
                    success: true,
                    message: 'Photograph saved',
                    data
                });
            }

            const key = keyFor(recordId);
            const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            await getFileStore().set(key, bytes, {
                metadata: { contentType: detected, kind }
            });

            const uploadedAt = new Date();
            await Model.findByIdAndUpdate(recordId, {
                $set: {
                    'photo.key': key,
                    'photo.contentType': detected,
                    'photo.uploadedAt': uploadedAt
                }
            });

            res.json({
                success: true,
                message: 'Photograph saved',
                data: { uploadedAt }
            });
        } catch (error) {
            if (error.statusCode === 400) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return sendPhotoError(res, error);
        }
    });

    router.get('/:id/photo', async (req, res) => {
        try {
            const recordId = req.params.id;
            if (!isRecordId(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid record id'
                });
            }

            const record = await Model.findById(recordId).select(multi ? 'photo photos' : 'photo');
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'Record not found'
                });
            }

            if (multi) {
                const photos = normalizeRecordPhotos(record);
                if (photos.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'No photograph on file'
                    });
                }
                const result = await readPhotoById(record, photos[0].photoId);
                if (!result) {
                    return res.status(404).json({
                        success: false,
                        message: 'No photograph on file'
                    });
                }
                res.set('Content-Type', result.contentType);
                res.set('Cache-Control', 'private, no-store');
                res.set('Content-Disposition', 'inline; filename="photograph"');
                return res.send(result.data);
            }

            if (!record.photo || !record.photo.key) {
                return res.status(404).json({
                    success: false,
                    message: 'No photograph on file'
                });
            }

            const result = await getFileStore().getWithMetadata(keyFor(recordId), { type: 'arrayBuffer' });
            if (!result || !result.data) {
                return res.status(404).json({
                    success: false,
                    message: 'No photograph on file'
                });
            }

            const contentType = (result.metadata && result.metadata.contentType) || record.photo.contentType || 'application/octet-stream';
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'private, no-store');
            res.set('Content-Disposition', 'inline; filename="photograph"');
            res.send(Buffer.from(result.data));
        } catch (error) {
            return sendPhotoError(res, error);
        }
    });

    router.delete('/:id/photo', async (req, res) => {
        try {
            const recordId = req.params.id;
            if (!isRecordId(recordId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid record id'
                });
            }

            const record = await Model.findById(recordId);
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'Record not found'
                });
            }

            if (multi) {
                const photos = normalizeRecordPhotos(record);
                for (const photo of photos) {
                    await deletePhotoBlob(photo.key);
                }
                await Model.findByIdAndUpdate(recordId, {
                    $set: {
                        photos: [],
                        photo: emptyPhotoField()
                    }
                });
            } else if (record.photo && record.photo.key) {
                await getFileStore().delete(keyFor(recordId));
                await Model.findByIdAndUpdate(recordId, {
                    $set: {
                        photo: emptyPhotoField()
                    }
                });
            }

            res.json({
                success: true,
                message: 'Photograph removed'
            });
        } catch (error) {
            return sendPhotoError(res, error);
        }
    });
}

async function deleteRecordPhoto(record, keyFor) {
    if (!record) {
        return;
    }

    const photos = normalizeRecordPhotos(record);
    if (photos.length > 0) {
        for (const photo of photos) {
            await deletePhotoBlob(photo.key);
        }
        return;
    }

    if (record.photo && record.photo.key) {
        await getFileStore().delete(keyFor(record._id.toString()));
    }
}

module.exports = {
    attachPhotoRoutes,
    deleteRecordPhoto,
    sendPhotoError,
    normalizeRecordPhotos
};
