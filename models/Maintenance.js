const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    apartmentNumber: {
        type: String,
        required: [true, 'Apartment number is required'],
        trim: true,
        maxlength: [20, 'Apartment number cannot exceed 20 characters']
    },
    type: {
        type: String,
        required: [true, 'Maintenance type is required'],
        enum: ['plumbing', 'electrical', 'appliance', 'structural', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    reportedDate: {
        type: Date,
        default: Date.now
    },
    completedDate: {
        type: Date,
        default: null
    },
    assignedTo: {
        type: String,
        trim: true,
        maxlength: [100, 'Assigned to cannot exceed 100 characters'],
        default: ''
    },
    estimatedCost: {
        type: Number,
        min: [0, 'Estimated cost cannot be negative'],
        default: 0
    },
    actualCost: {
        type: Number,
        min: [0, 'Actual cost cannot be negative'],
        default: 0
    },
    previousCondition: {
        type: String,
        maxlength: [500, 'Previous condition cannot exceed 500 characters'],
        default: ''
    },
    postDepartureCondition: {
        type: String,
        maxlength: [500, 'Post departure condition cannot exceed 500 characters'],
        default: ''
    },
    damages: {
        type: String,
        maxlength: [500, 'Damages description cannot exceed 500 characters'],
        default: ''
    },
    depositDeductions: {
        type: Number,
        min: [0, 'Deposit deductions cannot be negative'],
        default: 0
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        default: ''
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
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating resolution time
maintenanceSchema.virtual('resolutionTime').get(function() {
    if (!this.completedDate || !this.reportedDate) return null;
    const diffTime = Math.abs(this.completedDate - this.reportedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for checking if overdue
maintenanceSchema.virtual('isOverdue').get(function() {
    if (this.status === 'completed' || this.status === 'cancelled') return false;
    
    const now = new Date();
    const reportedDate = new Date(this.reportedDate);
    const diffTime = Math.abs(now - reportedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Consider overdue based on priority
    const overdueThresholds = {
        'urgent': 1,
        'high': 3,
        'medium': 7,
        'low': 14
    };
    
    return diffDays > (overdueThresholds[this.priority] || 7);
});

// Indexes for better query performance
maintenanceSchema.index({ apartmentNumber: 1 });
maintenanceSchema.index({ status: 1 });
maintenanceSchema.index({ priority: 1 });
maintenanceSchema.index({ reportedDate: -1 });
maintenanceSchema.index({ type: 1 });

// Static method to get maintenance statistics
maintenanceSchema.statics.getMaintenanceStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                pendingRequests: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                inProgressRequests: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
                completedRequests: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                urgentRequests: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
                totalCost: { $sum: '$actualCost' }
            }
        }
    ]);
    
    return stats[0] || {
        totalRequests: 0,
        pendingRequests: 0,
        inProgressRequests: 0,
        completedRequests: 0,
        urgentRequests: 0,
        totalCost: 0
    };
};

// Instance method to mark as completed
maintenanceSchema.methods.complete = function(completedDate = new Date(), actualCost = 0, notes = '') {
    this.status = 'completed';
    this.completedDate = completedDate;
    this.actualCost = actualCost;
    if (notes) this.notes = notes;
    return this.save();
};

// Instance method to assign to someone
maintenanceSchema.methods.assign = function(assignedTo) {
    this.assignedTo = assignedTo;
    this.status = 'in-progress';
    return this.save();
};

module.exports = mongoose.model('Maintenance', maintenanceSchema);

