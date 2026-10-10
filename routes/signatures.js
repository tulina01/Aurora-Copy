const express = require('express');
const router = express.Router();
const Signature = require('../models/Signature');
const { getFileStore, signatureImageKey } = require('../lib/fileStore');
const { detectImageType } = require('../lib/imageBytes');
const { sendPhotoError } = require('../lib/recordPhoto');

function isSignatureId(id) {
    return /^[a-f\d]{24}$/i.test(String(id || ''));
}

function normalizeName(name) {
    return String(name || '').trim();
}

function isDuplicateNameError(error) {
    return Boolean(error && (error.code === 11000 || error.code === 11001));
}

function readPng(req, res, next) {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'image/png') {
        return res.status(400).json({
            success: false,
            message: 'Signature must be a PNG image'
        });
    }

    return express.raw({ type: () => true, limit: '4mb' })(req, res, (error) => {
        if (!error) {
            return next();
        }
        if (error.type === 'entity.too.large' || error.status === 413) {
            return res.status(413).json({
                success: false,
                message: 'Signature must be under 4 MB'
            });
        }
        return next(error);
    });
}

async function deleteSignatureImage(signature) {
    if (!signature || !signature.image || !signature.image.key) {
        return;
    }
    await getFileStore().delete(signatureImageKey(signature._id.toString()));
}

router.get('/', async (req, res) => {
    try {
        const signatures = await Signature.find()
            .sort({ name: 1 })
            .collation({ locale: 'en', strength: 2 });

        res.json({
            success: true,
            data: signatures
        });
    } catch (error) {
        console.error('Error listing signatures:', error);
        res.status(500).json({
            success: false,
            message: 'Could not load signatures',
            error: error.message
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const name = normalizeName(req.body && req.body.name);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Signature name is required'
            });
        }

        const signature = await Signature.create({ name });
        res.status(201).json({
            success: true,
            message: 'Signature created',
            data: signature
        });
    } catch (error) {
        if (isDuplicateNameError(error)) {
            return res.status(409).json({
                success: false,
                message: 'A signature with that name already exists'
            });
        }
        console.error('Error creating signature:', error);
        res.status(500).json({
            success: false,
            message: 'Could not create signature',
            error: error.message
        });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const signatureId = req.params.id;
        if (!isSignatureId(signatureId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signature id'
            });
        }

        const name = normalizeName(req.body && req.body.name);
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Signature name is required'
            });
        }

        const signature = await Signature.findById(signatureId);
        if (!signature) {
            return res.status(404).json({
                success: false,
                message: 'Signature not found'
            });
        }

        signature.name = name;
        await signature.save();

        res.json({
            success: true,
            message: 'Signature renamed',
            data: signature
        });
    } catch (error) {
        if (isDuplicateNameError(error)) {
            return res.status(409).json({
                success: false,
                message: 'A signature with that name already exists'
            });
        }
        console.error('Error renaming signature:', error);
        res.status(500).json({
            success: false,
            message: 'Could not rename signature',
            error: error.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const signatureId = req.params.id;
        if (!isSignatureId(signatureId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signature id'
            });
        }

        const signature = await Signature.findById(signatureId);
        if (!signature) {
            return res.status(404).json({
                success: false,
                message: 'Signature not found'
            });
        }

        try {
            await deleteSignatureImage(signature);
        } catch (storageError) {
            return sendPhotoError(res, storageError);
        }

        await Signature.findByIdAndDelete(signatureId);

        res.json({
            success: true,
            message: 'Signature removed'
        });
    } catch (error) {
        console.error('Error deleting signature:', error);
        res.status(500).json({
            success: false,
            message: 'Could not delete signature',
            error: error.message
        });
    }
});

router.put('/:id/image', readPng, async (req, res) => {
    try {
        const signatureId = req.params.id;
        if (!isSignatureId(signatureId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signature id'
            });
        }

        const buffer = req.body;
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Signature file is empty'
            });
        }

        const detected = detectImageType(buffer);
        if (detected !== 'image/png') {
            return res.status(400).json({
                success: false,
                message: 'Signature must be a PNG image'
            });
        }

        const signature = await Signature.findById(signatureId);
        if (!signature) {
            return res.status(404).json({
                success: false,
                message: 'Signature not found'
            });
        }

        const key = signatureImageKey(signatureId);
        const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        await getFileStore().set(key, bytes, {
            metadata: { contentType: detected, kind: 'signature' }
        });

        const uploadedAt = new Date();
        await Signature.findByIdAndUpdate(signatureId, {
            $set: {
                'image.key': key,
                'image.contentType': detected,
                'image.uploadedAt': uploadedAt
            }
        });

        res.json({
            success: true,
            message: 'Signature image saved',
            data: { uploadedAt }
        });
    } catch (error) {
        return sendPhotoError(res, error);
    }
});

router.get('/:id/image', async (req, res) => {
    try {
        const signatureId = req.params.id;
        if (!isSignatureId(signatureId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signature id'
            });
        }

        const signature = await Signature.findById(signatureId).select('image name');
        if (!signature) {
            return res.status(404).json({
                success: false,
                message: 'Signature not found'
            });
        }
        if (!signature.image || !signature.image.key) {
            return res.status(404).json({
                success: false,
                message: 'No signature image on file'
            });
        }

        const result = await getFileStore().getWithMetadata(signatureImageKey(signatureId), {
            type: 'arrayBuffer'
        });
        if (!result || !result.data) {
            return res.status(404).json({
                success: false,
                message: 'No signature image on file'
            });
        }

        const contentType = (result.metadata && result.metadata.contentType)
            || signature.image.contentType
            || 'image/png';
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'private, no-store');
        res.set('Content-Disposition', 'inline; filename="signature.png"');
        res.send(Buffer.from(result.data));
    } catch (error) {
        return sendPhotoError(res, error);
    }
});

module.exports = router;
