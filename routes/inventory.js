const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// Get all inventory items with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            category = '', 
            status = '', 
            condition = '',
            apartmentNumber = '',
            sortBy = 'createdAt', 
            sortOrder = 'desc' 
        } = req.query;

        // Build query
        let query = {};
        
        if (category) query.category = category;
        if (status) query.status = status;
        if (condition) query.condition = condition;
        if (apartmentNumber) query.apartmentNumber = apartmentNumber;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const inventory = await Inventory.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Inventory.countDocuments(query);

        res.json({
            success: true,
            data: inventory,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory',
            error: error.message
        });
    }
});

// Get inventory item by ID
router.get('/:id', async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);
        
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory item',
            error: error.message
        });
    }
});

// Create new inventory item
router.post('/', async (req, res) => {
    try {
        console.log('📦 POST /inventory - Creating new inventory item');
        console.log('📋 Request body:', req.body);
        
        const inventoryData = req.body;
        const inventory = new Inventory(inventoryData);
        console.log('💾 Saving inventory item to database...');
        await inventory.save();
        console.log('✅ Inventory item saved successfully:', inventory._id);

        res.status(201).json({
            success: true,
            message: 'Inventory item created successfully',
            data: inventory
        });
    } catch (error) {
        console.error('Error creating inventory item:', error);
        
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
            message: 'Error creating inventory item',
            error: error.message
        });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
    try {
        const inventory = await Inventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        res.json({
            success: true,
            message: 'Inventory item updated successfully',
            data: inventory
        });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        
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
            message: 'Error updating inventory item',
            error: error.message
        });
    }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
    try {
        const inventory = await Inventory.findByIdAndDelete(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        res.json({
            success: true,
            message: 'Inventory item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting inventory item',
            error: error.message
        });
    }
});

// Get inventory by category
router.get('/category/:category', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const inventory = await Inventory.find({
            category: req.params.category
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Inventory.countDocuments({
            category: req.params.category
        });

        res.json({
            success: true,
            data: inventory,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching inventory by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory by category',
            error: error.message
        });
    }
});

// Get inventory by apartment
router.get('/apartment/:apartmentNumber', async (req, res) => {
    try {
        const inventory = await Inventory.getByApartment(req.params.apartmentNumber);

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Error fetching inventory by apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory by apartment',
            error: error.message
        });
    }
});

// Get maintenance due items
router.get('/maintenance/due', async (req, res) => {
    try {
        const maintenanceDue = await Inventory.getMaintenanceDue();

        res.json({
            success: true,
            data: maintenanceDue
        });
    } catch (error) {
        console.error('Error fetching maintenance due items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance due items',
            error: error.message
        });
    }
});

// Update maintenance schedule
router.patch('/:id/maintenance', async (req, res) => {
    try {
        const { nextMaintenanceDate } = req.body;
        const inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        await inventory.updateMaintenance(nextMaintenanceDate);

        res.json({
            success: true,
            message: 'Maintenance schedule updated successfully',
            data: inventory
        });
    } catch (error) {
        console.error('Error updating maintenance schedule:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating maintenance schedule',
            error: error.message
        });
    }
});

// Change item status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        await inventory.changeStatus(status);

        res.json({
            success: true,
            message: 'Item status updated successfully',
            data: inventory
        });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating item status',
            error: error.message
        });
    }
});

// Update item condition
router.patch('/:id/condition', async (req, res) => {
    try {
        const { condition } = req.body;
        const inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        await inventory.updateCondition(condition);

        res.json({
            success: true,
            message: 'Item condition updated successfully',
            data: inventory
        });
    } catch (error) {
        console.error('Error updating item condition:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating item condition',
            error: error.message
        });
    }
});

// Get inventory statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Inventory.getInventoryStats();
        
        // Get total items and value
        const totalStats = await Inventory.aggregate([
            {
                $group: {
                    _id: null,
                    totalItems: { $sum: '$count' },
                    totalValue: { $sum: { $multiply: ['$purchasePrice', '$count'] } },
                    averageAge: { $avg: { $subtract: [new Date(), '$purchaseDate'] } }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                categoryStats: stats,
                totalStats: totalStats[0] || {
                    totalItems: 0,
                    totalValue: 0,
                    averageAge: 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching inventory stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory statistics',
            error: error.message
        });
    }
});

// Search inventory items
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const inventory = await Inventory.find({
            $or: [
                { type: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } },
                { model: { $regex: query, $options: 'i' } },
                { apartmentNumber: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        console.error('Error searching inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching inventory',
            error: error.message
        });
    }
});

// Bulk update inventory
router.post('/bulk-update', async (req, res) => {
    try {
        const { items } = req.body;
        const results = [];

        for (const item of items) {
            try {
                const inventory = await Inventory.findByIdAndUpdate(
                    item.id,
                    item.updates,
                    { new: true, runValidators: true }
                );
                results.push({ id: item.id, success: true, data: inventory });
            } catch (error) {
                results.push({ id: item.id, success: false, error: error.message });
            }
        }

        res.json({
            success: true,
            message: 'Bulk update completed',
            data: results
        });
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Error in bulk update',
            error: error.message
        });
    }
});

module.exports = router;

