const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Signature name is required'],
        trim: true,
        maxlength: [100, 'Signature name cannot exceed 100 characters']
    },
    image: {
        key: {
            type: String,
            default: ''
        },
        contentType: {
            type: String,
            default: ''
        },
        uploadedAt: {
            type: Date,
            default: null
        },
        // Kept in Mongo so invoice/receipt PDFs can embed the signature on
        // Netlify, where the local blob file is not available.
        data: {
            type: Buffer,
            select: false,
            default: undefined
        }
    }
}, {
    timestamps: true
});

signatureSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

signatureSchema.virtual('hasImage').get(function() {
    const image = this.image || {};
    return Boolean(image.key || (image.data && image.data.length));
});

signatureSchema.set('toJSON', { virtuals: true });
signatureSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Signature', signatureSchema);
