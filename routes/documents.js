const express = require('express');
const router = express.Router();
const { createDocumentPdf, sanitizeFilename } = require('../lib/documentPdf');

const INCLUDE_FIELDS = [
    'documentDate',
    'signature',
    'tenantName',
    'apartmentNumber',
    'phone',
    'email',
    'checkinDate',
    'checkoutDate',
    'rentalBasis',
    'currency',
    'rentAmount',
    'deposit',
    'amountPaid',
    'billingSummary',
    'paymentMethod',
    'amountDue',
    'amountReceived',
    'balanceRemaining',
    'notes'
];

function asString(value) {
    if (value == null) {
        return '';
    }
    return String(value).trim();
}

function asNumber(value) {
    if (value === '' || value == null) {
        return 0;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function normalizeInclude(body) {
    const source = body && body.include && typeof body.include === 'object'
        ? body.include
        : {};
    const include = {};
    INCLUDE_FIELDS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            include[field] = source[field] !== false;
        } else {
            include[field] = true;
        }
    });
    return include;
}

function normalizeSharedFields(body) {
    const signatureImageBase64 = typeof body.signatureImageBase64 === 'string'
        ? body.signatureImageBase64.trim()
        : (typeof body.signaturePngBase64 === 'string' ? body.signaturePngBase64.trim() : '');

    return {
        documentDate: asString(body.documentDate),
        tenantName: asString(body.tenantName),
        phone: asString(body.phone),
        email: asString(body.email),
        apartmentNumber: asString(body.apartmentNumber),
        checkinDate: asString(body.checkinDate),
        checkoutDate: asString(body.checkoutDate),
        rentalBasis: asString(body.rentalBasis),
        currency: asString(body.currency) || 'USD',
        rentAmount: asNumber(body.rentAmount),
        deposit: asNumber(body.deposit),
        amountPaid: asNumber(body.amountPaid),
        notes: asString(body.notes),
        signatureId: asString(body.signatureId),
        signerName: asString(body.signerName),
        signatureImageBase64,
        include: normalizeInclude(body)
    };
}

function normalizeInvoicePayload(body) {
    return {
        ...normalizeSharedFields(body),
        billingSummary: asString(body.billingSummary),
        amountDue: asNumber(body.amountDue)
    };
}

function normalizeReceiptPayload(body) {
    return {
        ...normalizeSharedFields(body),
        amountReceived: asNumber(body.amountReceived),
        paymentMethod: asString(body.paymentMethod),
        balanceRemaining: asNumber(body.balanceRemaining)
    };
}

async function sendPdf(res, type, payload) {
    const pdf = await createDocumentPdf(type, payload);
    const baseName = sanitizeFilename(payload.tenantName || type);
    const filename = `${type}-${baseName}.pdf`;

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdf.length,
        'Cache-Control': 'private, no-store'
    });
    res.send(pdf);
}

router.post('/invoice', async (req, res) => {
    try {
        const payload = normalizeInvoicePayload(req.body || {});
        await sendPdf(res, 'invoice', payload);
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Could not generate invoice PDF',
            error: error.message
        });
    }
});

router.post('/receipt', async (req, res) => {
    try {
        const payload = normalizeReceiptPayload(req.body || {});
        await sendPdf(res, 'receipt', payload);
    } catch (error) {
        console.error('Error generating receipt PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Could not generate receipt PDF',
            error: error.message
        });
    }
});

module.exports = router;
