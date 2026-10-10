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

function attachPhotoRoutes(router, { Model, keyFor, kind }) {
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

            const record = await Model.findById(recordId).select('photo');
            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'Record not found'
                });
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

            if (record.photo && record.photo.key) {
                await getFileStore().delete(keyFor(recordId));
                await Model.findByIdAndUpdate(recordId, {
                    $set: {
                        'photo.key': '',
                        'photo.contentType': '',
                        'photo.uploadedAt': null
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
    if (!record || !record.photo || !record.photo.key) {
        return;
    }
    await getFileStore().delete(keyFor(record._id.toString()));
}

module.exports = {
    attachPhotoRoutes,
    deleteRecordPhoto,
    sendPhotoError
};
