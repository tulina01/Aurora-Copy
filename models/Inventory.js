const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    apartmentNumber: {
        type: String,
        required: [true, 'Apartment number is required'],
        trim: true,
        maxlength: [20, 'Apartment number cannot exceed 20 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['furniture', 'appliances', 'utensils'],
        default: 'furniture'
    },
    type: {
        type: String,
        required: [true, 'Item type is required'],
        trim: true,
        maxlength: [100, 'Item type cannot exceed 100 characters']
    },
    count: {
        type: Number,
        required: [true, 'Count is required'],
        min: [1, 'Count must be at least 1'],
        max: [1000, 'Count cannot exceed 1000']
    },
    condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
        default: 'good'
    },
    brand: {
        type: String,
        trim: true,
        maxlength: [100, 'Brand cannot exceed 100 characters'],
        default: ''
    },
    model: {
        type: String,
        trim: true,
        maxlength: [100, 'Model cannot exceed 100 characters'],
        default: ''
    },
    purchaseDate: {
        type: Date,
        default: null
    },
    purchasePrice: {
        type: Number,
        min: [0, 'Purchase price cannot be negative'],
        default: 0
    },
    warrantyExpiry: {
        type: Date,
        default: null
    },
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters'],
        default: ''
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        default: ''
    },
    status: {
        type: String,
        enum: ['available', 'in-use', 'maintenance', 'retired'],
        default: 'available'
    },
    lastMaintenance: {
        type: Date,
        default: null
    },
    nextMaintenance: {
        type: Date,
        default: null
    },
    images: [{
        url: {
            type: String,
            trim: true
        },
        caption: {
            type: String,
            maxlength: [200, 'Image caption cannot exceed 200 characters']
        }
    }],
    specifications: {
        dimensions: {
            length: { type: Number, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 }
        },
        weight: { type: Number, min: 0 },
        color: { type: String, trim: true },
        material: { type: String, trim: true }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating item age
inventorySchema.virtual('age').get(function() {
    if (!this.purchaseDate) return null;
    const now = new Date();
    const diffTime = Math.abs(now - this.purchaseDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for checking if warranty is expired
inventorySchema.virtual('warrantyExpired').get(function() {
    if (!this.warrantyExpiry) return null;
    return new Date() > this.warrantyExpiry;
});

// Virtual for checking if maintenance is due
inventorySchema.virtual('maintenanceDue').get(function() {
    if (!this.nextMaintenance) return false;
    return new Date() >= this.nextMaintenance;
});

// Indexes for better query performance
inventorySchema.index({ apartmentNumber: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ condition: 1 });

// Static method to get inventory statistics
inventorySchema.statics.getInventoryStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$category',
                totalItems: { $sum: '$count' },
                totalValue: { $sum: { $multiply: ['$purchasePrice', '$count'] } },
                averageCondition: { $avg: { $cond: [
                    { $eq: ['$condition', 'excellent'] }, 5,
                    { $cond: [{ $eq: ['$condition', 'good'] }, 4,
                    { $cond: [{ $eq: ['$condition', 'fair'] }, 3,
                    { $cond: [{ $eq: ['$condition', 'poor'] }, 2, 1] }] }] }
                ] } }
            }
        }
    ]);
    
    return stats;
};

// Static method to get items by apartment
inventorySchema.statics.getByApartment = async function(apartmentNumber) {
    return this.find({ apartmentNumber }).sort({ category: 1, type: 1 });
};

// Static method to get maintenance due items
inventorySchema.statics.getMaintenanceDue = async function() {
    const now = new Date();
    return this.find({
        nextMaintenance: { $lte: now },
        status: { $ne: 'retired' }
    }).sort({ nextMaintenance: 1 });
};

// Instance method to update maintenance schedule
inventorySchema.methods.updateMaintenance = function(nextMaintenanceDate) {
    this.lastMaintenance = new Date();
    this.nextMaintenance = nextMaintenanceDate;
    return this.save();
};

// Instance method to change status
inventorySchema.methods.changeStatus = function(newStatus) {
    this.status = newStatus;
    return this.save();
};

// Instance method to update condition
inventorySchema.methods.updateCondition = function(newCondition) {
    this.condition = newCondition;
    return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);

