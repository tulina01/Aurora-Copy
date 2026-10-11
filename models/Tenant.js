const mongoose = require('mongoose');
const { calculateTenantAmountDue } = require('../lib/tenantBilling');

const nicPhotoEntrySchema = new mongoose.Schema({
    photoId: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        default: ''
    },
    uploadedAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tenant name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [100, 'Email cannot exceed 100 characters'],
        default: '',
        validate: {
            validator(value) {
                if (!value) {
                    return true;
                }
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);
            },
            message: 'Please enter a valid email'
        }
    },
    occupation: {
        type: String,
        trim: true,
        maxlength: [100, 'Occupation cannot exceed 100 characters'],
        default: ''
    },
    address: {
        type: String,
        trim: true,
        maxlength: [300, 'Address cannot exceed 300 characters'],
        default: ''
    },
    nicNumber: {
        type: String,
        trim: true,
        maxlength: [20, 'NIC number cannot exceed 20 characters'],
        default: ''
    },
    emergencyContact: {
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Emergency contact name cannot exceed 100 characters'],
            default: ''
        },
        phone: {
            type: String,
            trim: true,
            maxlength: [20, 'Emergency contact phone cannot exceed 20 characters'],
            default: ''
        },
        relationship: {
            type: String,
            trim: true,
            maxlength: [50, 'Relationship cannot exceed 50 characters'],
            default: ''
        }
    },
    apartmentNumber: {
        type: String,
        required: [true, 'Apartment number is required'],
        trim: true,
        maxlength: [20, 'Apartment number cannot exceed 20 characters']
    },
    checkinDate: {
        type: Date,
        required: [true, 'Check-in date is required']
    },
    checkoutDate: {
        type: Date,
        default: null
    },
    rentalBasis: {
        type: String,
        required: [true, 'Rental basis is required'],
        enum: ['monthly', 'daily'],
        default: 'monthly'
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        enum: ['USD', 'GBP', 'EUR', 'LKR'],
        default: 'USD'
    },
    rentAmount: {
        type: Number,
        required: [true, 'Rent amount is required'],
        min: [0, 'Rent amount cannot be negative']
    },
    deposit: {
        type: Number,
        default: 0,
        min: [0, 'Deposit cannot be negative']
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: [0, 'Amount paid cannot be negative']
    },
    bookingSource: {
        type: String,
        enum: ['online', 'in-person', 'call', 'travel-agent', 'other', ''],
        default: ''
    },
    specialRequests: {
        type: String,
        maxlength: [500, 'Special requests cannot exceed 500 characters'],
        default: ''
    },
    remarks: {
        type: String,
        maxlength: [1000, 'Remarks cannot exceed 1000 characters'],
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },
    idVerification: {
        type: String,
        enum: ['verified', 'pending', 'not-verified'],
        default: 'pending'
    },
    // Legacy single-photo field; kept so existing records still load.
    nicPhoto: {
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
        }
    },
    nicPhotos: {
        type: [nicPhotoEntrySchema],
        default: [],
        validate: {
            validator(value) {
                return !Array.isArray(value) || value.length <= 5;
            },
            message: 'A tenant can have at most 5 NIC photographs'
        }
    },
    currentRentalPeriod: {
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        }
    },
    totalRent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating rental duration
tenantSchema.virtual('rentalDuration').get(function() {
    if (!this.checkinDate) return 0;
    const endDate = this.checkoutDate || new Date();
    const diffTime = Math.abs(endDate - this.checkinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

tenantSchema.virtual('amountDue').get(function() {
    return calculateTenantAmountDue(this);
});

// Virtual for calculating total rent
tenantSchema.virtual('calculatedTotalRent').get(function() {
    if (this.rentalBasis === 'daily') {
        return this.rentAmount * this.rentalDuration;
    }
    return this.rentAmount;
});

// Index for better query performance
tenantSchema.index({ apartmentNumber: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ checkinDate: -1 });
tenantSchema.index({ name: 'text', email: 'text' });

// Pre-save middleware to update total rent and status
tenantSchema.pre('save', function(next) {
    this.totalRent = this.calculatedTotalRent;
    
    // Auto-calculate status based on dates
    this.status = this.calculateStatus();
    
    next();
});

// Static method to get dashboard statistics
tenantSchema.statics.getDashboardStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalTenants: { $sum: 1 },
                activeTenants: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                totalRevenue: { $sum: '$amountPaid' },
                averageRent: { $avg: '$rentAmount' }
            }
        }
    ]);
    
    return stats[0] || {
        totalTenants: 0,
        activeTenants: 0,
        totalRevenue: 0,
        averageRent: 0
    };
};

// Instance method to mark tenant as inactive
tenantSchema.methods.checkout = function(checkoutDate = new Date()) {
    this.checkoutDate = checkoutDate;
    this.status = 'inactive';
    return this.save();
};

// Instance method to calculate status based on dates
tenantSchema.methods.calculateStatus = function() {
    const now = new Date();
    const checkinDate = new Date(this.checkinDate);
    const checkoutDate = this.checkoutDate ? new Date(this.checkoutDate) : null;
    
    // If check-in date is in the future, status is pending
    if (checkinDate > now) {
        return 'pending';
    }
    
    // If there's a check-out date and it's in the past, status is inactive
    if (checkoutDate && checkoutDate <= now) {
        return 'inactive';
    }
    
    // Otherwise, status is active (checked in and not checked out yet)
    return 'active';
};

// Static method to update all tenant statuses
tenantSchema.statics.updateAllStatuses = async function() {
    const tenants = await this.find({});
    const updatePromises = tenants.map(async (tenant) => {
        const calculatedStatus = tenant.calculateStatus();
        if (tenant.status !== calculatedStatus) {
            tenant.status = calculatedStatus;
            return tenant.save();
        }
        return tenant;
    });
    
    await Promise.all(updatePromises);
    return { updated: updatePromises.length };
};

module.exports = mongoose.model('Tenant', tenantSchema);

