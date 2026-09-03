const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');

// Get all tenants with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = '', 
            sortBy = 'createdAt', 
            sortOrder = 'desc' 
        } = req.query;

        // Build query
        let query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { apartmentNumber: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (status) {
            query.status = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const tenants = await Tenant.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Tenant.countDocuments(query);

        res.json({
            success: true,
            data: tenants,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenants',
            error: error.message
        });
    }
});

// Get tenant by ID
router.get('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.json({
            success: true,
            data: tenant
        });
    } catch (error) {
        console.error('Error fetching tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenant',
            error: error.message
        });
    }
});

// Create new tenant
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /tenants - Creating new tenant');
        console.log('📋 Request body:', req.body);
        
        const tenantData = req.body;
        
        // Set current rental period if not provided
        if (!tenantData.currentRentalPeriod) {
            tenantData.currentRentalPeriod = {
                startDate: tenantData.checkinDate,
                endDate: tenantData.checkoutDate || null
            };
        }

        const tenant = new Tenant(tenantData);
        console.log('💾 Saving tenant to database...');
        await tenant.save();
        console.log('✅ Tenant saved successfully:', tenant._id);

        res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error creating tenant:', error);
        
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
            message: 'Error creating tenant',
            error: error.message
        });
    }
});

// Update tenant
router.put('/:id', async (req, res) => {
    try {
        const tenantData = req.body;
        
        // Set current rental period if not provided
        if (!tenantData.currentRentalPeriod) {
            tenantData.currentRentalPeriod = {
                startDate: tenantData.checkinDate,
                endDate: tenantData.checkoutDate || null
            };
        }

        const tenant = await Tenant.findByIdAndUpdate(
            req.params.id,
            tenantData,
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.json({
            success: true,
            message: 'Tenant updated successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error updating tenant:', error);
        
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
            message: 'Error updating tenant',
            error: error.message
        });
    }
});

// Delete tenant
router.delete('/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndDelete(req.params.id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.json({
            success: true,
            message: 'Tenant deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting tenant',
            error: error.message
        });
    }
});

// Checkout tenant
router.patch('/:id/checkout', async (req, res) => {
    try {
        const { checkoutDate } = req.body;
        const tenant = await Tenant.findById(req.params.id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        await tenant.checkout(checkoutDate);

        res.json({
            success: true,
            message: 'Tenant checked out successfully',
            data: tenant
        });
    } catch (error) {
        console.error('Error checking out tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking out tenant',
            error: error.message
        });
    }
});

// Get dashboard statistics
router.get('/stats/dashboard', async (req, res) => {
    try {
        const stats = await Tenant.getDashboardStats();
        
        // Get recent tenants
        const recentTenants = await Tenant.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name apartmentNumber checkinDate status')
            .lean();

        res.json({
            success: true,
            data: {
                ...stats,
                recentTenants
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
});

// Get tenants by apartment
router.get('/apartment/:apartmentNumber', async (req, res) => {
    try {
        const tenants = await Tenant.find({
            apartmentNumber: req.params.apartmentNumber
        }).sort({ checkinDate: -1 });

        res.json({
            success: true,
            data: tenants
        });
    } catch (error) {
        console.error('Error fetching tenants by apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tenants by apartment',
            error: error.message
        });
    }
});

// Search tenants
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const tenants = await Tenant.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { apartmentNumber: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json({
            success: true,
            data: tenants
        });
    } catch (error) {
        console.error('Error searching tenants:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching tenants',
            error: error.message
        });
    }
});

// Update all tenant statuses based on dates
router.patch('/update-statuses', async (req, res) => {
    try {
        const result = await Tenant.updateAllStatuses();
        
        res.json({
            success: true,
            message: `Updated ${result.updated} tenant statuses`,
            data: result
        });
    } catch (error) {
        console.error('Error updating tenant statuses:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating tenant statuses',
            error: error.message
        });
    }
});

module.exports = router;

