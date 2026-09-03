const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');

// Get all maintenance requests with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = '', 
            priority = '', 
            type = '',
            apartmentNumber = '',
            sortBy = 'reportedDate', 
            sortOrder = 'desc' 
        } = req.query;

        // Build query
        let query = {};
        
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (type) query.type = type;
        if (apartmentNumber) query.apartmentNumber = apartmentNumber;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const maintenance = await Maintenance.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Maintenance.countDocuments(query);

        res.json({
            success: true,
            data: maintenance,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching maintenance requests:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance requests',
            error: error.message
        });
    }
});

// Get maintenance request by ID
router.get('/:id', async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        
        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance request not found'
            });
        }

        res.json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        console.error('Error fetching maintenance request:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance request',
            error: error.message
        });
    }
});

// Create new maintenance request
router.post('/', async (req, res) => {
    try {
        console.log('🔧 POST /maintenance - Creating new maintenance request');
        console.log('📋 Request body:', req.body);
        
        const maintenanceData = req.body;
        const maintenance = new Maintenance(maintenanceData);
        console.log('💾 Saving maintenance request to database...');
        await maintenance.save();
        console.log('✅ Maintenance request saved successfully:', maintenance._id);

        res.status(201).json({
            success: true,
            message: 'Maintenance request created successfully',
            data: maintenance
        });
    } catch (error) {
        console.error('Error creating maintenance request:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating maintenance request',
            error: error.message
        });
    }
});

// Update maintenance request
router.put('/:id', async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance request not found'
            });
        }

        res.json({
            success: true,
            message: 'Maintenance request updated successfully',
            data: maintenance
        });
    } catch (error) {
        console.error('Error updating maintenance request:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating maintenance request',
            error: error.message
        });
    }
});

// Delete maintenance request
router.delete('/:id', async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndDelete(req.params.id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance request not found'
            });
        }

        res.json({
            success: true,
            message: 'Maintenance request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting maintenance request:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting maintenance request',
            error: error.message
        });
    }
});

// Mark maintenance request as completed
router.patch('/:id/complete', async (req, res) => {
    try {
        const { completedDate, actualCost, notes } = req.body;
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance request not found'
            });
        }

        await maintenance.complete(completedDate, actualCost, notes);

        res.json({
            success: true,
            message: 'Maintenance request marked as completed',
            data: maintenance
        });
    } catch (error) {
        console.error('Error completing maintenance request:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing maintenance request',
            error: error.message
        });
    }
});

// Assign maintenance request
router.patch('/:id/assign', async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance request not found'
            });
        }

        await maintenance.assign(assignedTo);

        res.json({
            success: true,
            message: 'Maintenance request assigned successfully',
            data: maintenance
        });
    } catch (error) {
        console.error('Error assigning maintenance request:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning maintenance request',
            error: error.message
        });
    }
});

// Get maintenance statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Maintenance.getMaintenanceStats();
        
        // Get overdue requests
        const overdueRequests = await Maintenance.find({
            status: { $in: ['pending', 'in-progress'] },
            reportedDate: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days ago
        }).countDocuments();

        res.json({
            success: true,
            data: {
                ...stats,
                overdueRequests
            }
        });
    } catch (error) {
        console.error('Error fetching maintenance stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance statistics',
            error: error.message
        });
    }
});

// Get maintenance by apartment
router.get('/apartment/:apartmentNumber', async (req, res) => {
    try {
        const maintenance = await Maintenance.find({
            apartmentNumber: req.params.apartmentNumber
        }).sort({ reportedDate: -1 });

        res.json({
            success: true,
            data: maintenance
        });
    } catch (error) {
        console.error('Error fetching maintenance by apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance by apartment',
            error: error.message
        });
    }
});

// Get pending maintenance requests
router.get('/status/pending', async (req, res) => {
    try {
        const pendingRequests = await Maintenance.find({
            status: 'pending'
        }).sort({ priority: -1, reportedDate: 1 });

        res.json({
            success: true,
            data: pendingRequests
        });
    } catch (error) {
        console.error('Error fetching pending maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending maintenance',
            error: error.message
        });
    }
});

// Get completed maintenance requests
router.get('/status/completed', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const completedRequests = await Maintenance.find({
            status: 'completed'
        })
        .sort({ completedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Maintenance.countDocuments({ status: 'completed' });

        res.json({
            success: true,
            data: completedRequests,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching completed maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching completed maintenance',
            error: error.message
        });
    }
});

// Get urgent maintenance requests
router.get('/priority/urgent', async (req, res) => {
    try {
        const urgentRequests = await Maintenance.find({
            priority: 'urgent',
            status: { $ne: 'completed' }
        }).sort({ reportedDate: 1 });

        res.json({
            success: true,
            data: urgentRequests
        });
    } catch (error) {
        console.error('Error fetching urgent maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching urgent maintenance',
            error: error.message
        });
    }
});

module.exports = router;

