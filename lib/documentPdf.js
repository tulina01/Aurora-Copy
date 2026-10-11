const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
// Ensure PNG decoding is available when PDFKit embeds logo/signature images
// inside the Netlify function bundle.
try {
    require('png-js');
} catch (error) {
    console.warn('png-js is not available for PDF image embedding:', error.message);
}
const { getFileStore, signatureImageKey } = require('./fileStore');
const Signature = require('../models/Signature');

const CURRENCY_SYMBOLS = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    LKR: 'Rs'
};

function currencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || String(currency || '') + ' ';
}

function formatMoney(amount, currency) {
    const value = Number(amount);
    const safe = Number.isFinite(value) ? value : 0;
    const symbol = currencySymbol(currency);
    const formatted = Math.abs(safe).toFixed(2);
    return safe < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function textOrDash(value) {
    const text = String(value == null ? '' : value).trim();
    return text || '—';
}

function formatDocumentDate(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) {
        return '—';
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match) {
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }
    return text;
}

function sanitizeFilename(value) {
    return String(value || 'document')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'document';
}

function includeMap(payload) {
    return payload && payload.include && typeof payload.include === 'object'
        ? payload.include
        : {};
}

function isIncluded(payload, field) {
    const map = includeMap(payload);
    if (!Object.prototype.hasOwnProperty.call(map, field)) {
        return true;
    }
    return map[field] !== false;
}

function loadSignatureFromPayload(payload) {
    const raw = payload && (payload.signatureImageBase64 || payload.signaturePngBase64);
    if (!raw) {
        return null;
    }

    try {
        const cleaned = String(raw)
            .replace(/^data:image\/\w+;base64,/i, '')
            .replace(/\s+/g, '');
        if (!cleaned) {
            return null;
        }
        const buffer = Buffer.from(cleaned, 'base64');
        if (!buffer.length) {
            return null;
        }
        return {
            name: (payload && payload.signerName) || '',
            buffer
        };
    } catch (error) {
        console.warn('Could not decode signature image from request payload:', error.message);
        return null;
    }
}

async function loadSignatureImage(signatureId) {
    if (!signatureId || !/^[a-f\d]{24}$/i.test(String(signatureId))) {
        return null;
    }

    const signature = await Signature.findById(signatureId).select('name image.key +image.data');
    if (signature && signature.image && signature.image.data && signature.image.data.length) {
        return {
            name: signature.name,
            buffer: Buffer.from(signature.image.data)
        };
    }
    if (!signature || !signature.image || !signature.image.key) {
        return null;
    }

    const key = signature.image.key || signatureImageKey(signatureId);
    const store = getFileStore();
    let result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if ((!result || !result.data) && key !== signatureImageKey(signatureId)) {
        result = await store.getWithMetadata(signatureImageKey(signatureId), {
            type: 'arrayBuffer'
        });
    }
    if (!result || !result.data) {
        return null;
    }

    const buffer = Buffer.isBuffer(result.data)
        ? result.data
        : Buffer.from(result.data);

    return {
        name: signature.name,
        buffer
    };
}

function drawKeyValue(doc, label, value, x, y, labelWidth = 120, valueWidth = 200) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text(label, x, y, {
        width: labelWidth,
        lineBreak: false
    });
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(textOrDash(value), x + labelWidth, y, {
        width: valueWidth
    });
    return Math.max(y + 16, doc.y);
}

function drawSectionTitle(doc, title, y) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#00B4D8').text(title, 50, y);
    doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor('#e2e8f0').lineWidth(1).stroke();
    return y + 28;
}

function drawHeader(doc, title, payload, logoBuffer) {
    let y = 40;

    if (logoBuffer) {
        try {
            doc.image(logoBuffer, 50, y, { fit: [56, 56] });
        } catch (error) {
            console.warn('Could not embed logo in PDF:', error.message);
        }
    }

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text('Aurora', 120, y + 8);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text('Tenant Management', 120, y + 34);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#00B4D8')
        .text(title, 320, y + 10, { width: 225, align: 'right' });

    if (isIncluded(payload, 'documentDate')) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b')
            .text(`Date: ${formatDocumentDate(payload.documentDate)}`, 320, y + 36, {
                width: 225,
                align: 'right'
            });
    }

    return 110;
}

function drawFieldColumn(doc, fields, x, y, labelWidth, valueWidth) {
    let cursor = y;
    fields.forEach(([label, value]) => {
        cursor = drawKeyValue(doc, label, value, x, cursor, labelWidth, valueWidth);
    });
    return cursor;
}

function drawPartyBlock(doc, payload, y) {
    const leftFields = [
        ['Name', payload.tenantName, 'tenantName'],
        ['Phone', payload.phone, 'phone'],
        ['Email', payload.email, 'email'],
        ['Apartment', payload.apartmentNumber, 'apartmentNumber']
    ].filter(([, , key]) => isIncluded(payload, key))
        .map(([label, value]) => [label, value]);

    const rightFields = [
        ['Check-in', payload.checkinDate, 'checkinDate'],
        ['Check-out', payload.checkoutDate, 'checkoutDate'],
        ['Rental basis', payload.rentalBasis, 'rentalBasis'],
        ['Currency', payload.currency, 'currency']
    ].filter(([, , key]) => isIncluded(payload, key))
        .map(([label, value]) => [label, value]);

    if (!leftFields.length && !rightFields.length) {
        return y;
    }

    y = drawSectionTitle(doc, 'Tenant', y);
    const leftY = leftFields.length
        ? drawFieldColumn(doc, leftFields, 50, y, 120, 200)
        : y;
    const rightY = rightFields.length
        ? drawFieldColumn(doc, rightFields, 310, y, 110, 160)
        : y;

    return Math.max(leftY, rightY) + 12;
}

function drawMoneyRow(doc, label, value, y, options = {}) {
    const { emphasize = false } = options;
    doc.font(emphasize ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(emphasize ? 11 : 10)
        .fillColor(emphasize ? '#0f172a' : '#334155')
        .text(label, 50, y, { width: 320 });
    doc.font(emphasize ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(emphasize ? 11 : 10)
        .fillColor(emphasize ? '#00B4D8' : '#0f172a')
        .text(value, 370, y, { width: 175, align: 'right' });
    return y + (emphasize ? 22 : 18);
}

function drawMoneyRows(doc, rows, y, sectionTitle) {
    const visible = rows.filter((row) => row.include);
    if (!visible.length) {
        return y;
    }

    y = drawSectionTitle(doc, sectionTitle, y);
    visible.forEach((row, index) => {
        if (row.separatorBefore && index > 0) {
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
            y += 10;
        }
        y = drawMoneyRow(doc, row.label, row.value, y, { emphasize: Boolean(row.emphasize) });
    });
    return y;
}

function drawNotes(doc, payload, y) {
    if (!isIncluded(payload, 'notes')) {
        return y;
    }
    if (!payload.notes || !String(payload.notes).trim()) {
        return y;
    }
    y = drawSectionTitle(doc, 'Notes', y);
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(String(payload.notes).trim(), 50, y, {
        width: 495
    });
    return doc.y + 12;
}

function drawSignature(doc, payload, signature, y) {
    if (!isIncluded(payload, 'signature')) {
        return y;
    }

    y = Math.max(y + 8, 560);
    y = drawSectionTitle(doc, 'Authorized signature', y);

    if (signature && signature.buffer) {
        try {
            doc.image(signature.buffer, 50, y, { fit: [180, 70] });
            y += 80;
        } catch (error) {
            console.warn('Could not embed signature in PDF:', error.message);
            y += 8;
        }
    } else {
        doc.moveTo(50, y + 40).lineTo(230, y + 40).strokeColor('#94a3b8').lineWidth(1).stroke();
        y += 48;
    }

    const label = payload.signerName || (signature && signature.name) || '';
    if (label) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label, 50, y);
    }
    return y + 20;
}

function drawFooter(doc) {
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
        .text('Generated by Aurora Tenant Management System', 50, 760, {
            width: 495,
            align: 'center'
        });
}

function collectPdfBuffer(build) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: 'Aurora Document',
                Author: 'Aurora'
            }
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        Promise.resolve(build(doc))
            .then(() => doc.end())
            .catch(reject);
    });
}

async function buildInvoicePdf(payload, options = {}) {
    const logoBuffer = options.logoBuffer;
    const signature = options.signature;
    const currency = payload.currency || 'USD';

    return collectPdfBuffer((doc) => {
        let y = drawHeader(doc, 'INVOICE', payload, logoBuffer);
        y = drawPartyBlock(doc, payload, y);

        y = drawMoneyRows(doc, [
            {
                include: isIncluded(payload, 'rentAmount'),
                label: 'Rent amount',
                value: formatMoney(payload.rentAmount, currency)
            },
            {
                include: isIncluded(payload, 'billingSummary'),
                label: 'Billing period',
                value: textOrDash(payload.billingSummary)
            },
            {
                include: isIncluded(payload, 'deposit'),
                label: 'Deposit',
                value: formatMoney(payload.deposit, currency)
            },
            {
                include: isIncluded(payload, 'amountPaid'),
                label: 'Amount paid',
                value: formatMoney(payload.amountPaid, currency)
            },
            {
                include: isIncluded(payload, 'amountDue'),
                label: 'Amount due',
                value: formatMoney(payload.amountDue, currency),
                emphasize: true,
                separatorBefore: true
            }
        ], y, 'Charges');

        y = drawNotes(doc, payload, y + 8);
        drawSignature(doc, payload, signature, y);
        drawFooter(doc);
    });
}

async function buildReceiptPdf(payload, options = {}) {
    const logoBuffer = options.logoBuffer;
    const signature = options.signature;
    const currency = payload.currency || 'USD';

    return collectPdfBuffer((doc) => {
        let y = drawHeader(doc, 'RECEIPT', payload, logoBuffer);
        y = drawPartyBlock(doc, payload, y);

        y = drawMoneyRows(doc, [
            {
                include: isIncluded(payload, 'amountReceived'),
                label: 'Amount received',
                value: formatMoney(payload.amountReceived, currency),
                emphasize: true
            },
            {
                include: isIncluded(payload, 'paymentMethod'),
                label: 'Payment method',
                value: textOrDash(payload.paymentMethod)
            },
            {
                include: isIncluded(payload, 'rentAmount'),
                label: 'Rent amount',
                value: formatMoney(payload.rentAmount, currency)
            },
            {
                include: isIncluded(payload, 'deposit'),
                label: 'Deposit',
                value: formatMoney(payload.deposit, currency)
            },
            {
                include: isIncluded(payload, 'amountPaid'),
                label: 'Total amount paid',
                value: formatMoney(payload.amountPaid, currency)
            },
            {
                include: isIncluded(payload, 'balanceRemaining'),
                label: 'Balance remaining',
                value: formatMoney(payload.balanceRemaining, currency)
            }
        ], y, 'Payment');

        y = drawNotes(doc, payload, y + 8);
        drawSignature(doc, payload, signature, y);
        drawFooter(doc);
    });
}

function resolveLogoPath() {
    // Local Express: lib/../images/...
    // Netlify function (esbuild + included_files): /var/task/images/...
    const candidates = [
        path.join(__dirname, '..', 'images', 'aurora-logo.png'),
        path.join(process.cwd(), 'images', 'aurora-logo.png'),
        path.join(__dirname, 'images', 'aurora-logo.png'),
        path.join(__dirname, '..', '..', 'images', 'aurora-logo.png')
    ];

    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        } catch (error) {
            // Try the next candidate.
        }
    }
    return null;
}

function readLogoBuffer() {
    const logoPath = resolveLogoPath();
    if (!logoPath) {
        console.warn('Aurora logo not found for PDF. Tried local and Netlify function paths.');
        return null;
    }
    try {
        return fs.readFileSync(logoPath);
    } catch (error) {
        console.warn('Aurora logo could not be read for PDF:', error.message);
        return null;
    }
}

async function createDocumentPdf(type, payload) {
    const logoBuffer = readLogoBuffer();
    let signature = null;

    if (isIncluded(payload, 'signature')) {
        // Prefer the image sent by the browser. On Netlify, Blobs access from
        // inside PDF generation is unreliable, while /signatures/:id/image works.
        signature = loadSignatureFromPayload(payload);
        if (!signature) {
            try {
                signature = await loadSignatureImage(payload.signatureId);
            } catch (error) {
                console.warn('Could not load signature for PDF:', error.message);
            }
        }
    }

    if (type === 'receipt') {
        return buildReceiptPdf(payload, { logoBuffer, signature });
    }
    return buildInvoicePdf(payload, { logoBuffer, signature });
}

module.exports = {
    createDocumentPdf,
    formatMoney,
    sanitizeFilename,
    loadSignatureImage
};
