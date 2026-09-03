const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
    number: {
        type: String,
        required: [true, 'Apartment number is required'],
        unique: true,
        trim: true,
        maxlength: [20, 'Apartment number cannot exceed 20 characters']
    },
    size: {
        type: Number,
        required: [true, 'Apartment size is required'],
        min: [1, 'Apartment size must be at least 1 square foot']
    },
    bedrooms: {
        type: Number,
        required: [true, 'Number of bedrooms is required'],
        min: [1, 'Must have at least 1 bedroom']
    },
    bathrooms: {
        type: Number,
        required: [true, 'Number of bathrooms is required'],
        min: [0.5, 'Must have at least 0.5 bathrooms']
    },
    status: {
        type: String,
        required: [true, 'Apartment status is required'],
        enum: ['available', 'occupied', 'maintenance'],
        default: 'available'
    },
    // Virtual fields for related data
    currentTenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        default: null
    },
    inventoryItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory'
    }],
    maintenanceRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Maintenance'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for apartment details summary
apartmentSchema.virtual('summary').get(function() {
    return `${this.number} - ${this.size} sq ft, ${this.bedrooms} bed, ${this.bathrooms} bath`;
});

// Index for better query performance
apartmentSchema.index({ number: 1 });
apartmentSchema.index({ status: 1 });

// Pre-save middleware to update status based on tenant
apartmentSchema.pre('save', async function(next) {
    if (this.isModified('currentTenant')) {
        if (this.currentTenant) {
            this.status = 'occupied';
        } else {
            this.status = 'available';
        }
    }
    next();
});

// Static method to get apartment with related data
apartmentSchema.statics.getApartmentWithDetails = async function(apartmentId) {
    return await this.findById(apartmentId)
        .populate('currentTenant', 'name phone email checkinDate checkoutDate')
        .populate('inventoryItems', 'type category count notes')
        .populate('maintenanceRequests', 'description type priority status reportedDate');
};

// Static method to get all apartments with summary data
apartmentSchema.statics.getAllApartments = async function() {
    return await this.find()
        .populate('currentTenant', 'name phone email')
        .populate('inventoryItems', 'type category count')
        .populate('maintenanceRequests', 'description status priority');
};

module.exports = mongoose.model('Apartment', apartmentSchema);

