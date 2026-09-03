const express = require('express');
const router = express.Router();
const Apartment = require('../models/Apartment');
const Tenant = require('../models/Tenant');
const Inventory = require('../models/Inventory');
const Maintenance = require('../models/Maintenance');

// GET /api/apartments - Get all apartments
router.get('/', async (req, res) => {
    try {
        const apartments = await Apartment.getAllApartments();
        res.json({
            success: true,
            data: apartments,
            message: 'Apartments retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching apartments',
            error: error.message
        });
    }
});

// GET /api/apartments/:id - Get specific apartment
router.get('/:id', async (req, res) => {
    try {
        const apartment = await Apartment.getApartmentWithDetails(req.params.id);
        
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        
        res.json({
            success: true,
            data: apartment,
            message: 'Apartment retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching apartment',
            error: error.message
        });
    }
});

// POST /api/apartments - Create new apartment
router.post('/', async (req, res) => {
    try {
        const { number, size, bedrooms, bathrooms, status } = req.body;
        
        // Validate required fields
        if (!number || !size || !bedrooms || !bathrooms) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: number, size, bedrooms, bathrooms'
            });
        }
        
        // Check if apartment number already exists
        const existingApartment = await Apartment.findOne({ number });
        if (existingApartment) {
            return res.status(400).json({
                success: false,
                message: 'Apartment number already exists'
            });
        }
        
        const apartment = new Apartment({
            number,
            size,
            bedrooms,
            bathrooms,
            status: status || 'available'
        });
        
        await apartment.save();
        
        res.status(201).json({
            success: true,
            data: apartment,
            message: 'Apartment created successfully'
        });
    } catch (error) {
        console.error('Error creating apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating apartment',
            error: error.message
        });
    }
});

// PUT /api/apartments/:id - Update apartment
router.put('/:id', async (req, res) => {
    try {
        const { number, size, bedrooms, bathrooms, status } = req.body;
        
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        
        // Check if new number conflicts with existing apartment
        if (number && number !== apartment.number) {
            const existingApartment = await Apartment.findOne({ number, _id: { $ne: req.params.id } });
            if (existingApartment) {
                return res.status(400).json({
                    success: false,
                    message: 'Apartment number already exists'
                });
            }
        }
        
        // Update fields
        if (number) apartment.number = number;
        if (size) apartment.size = size;
        if (bedrooms) apartment.bedrooms = bedrooms;
        if (bathrooms) apartment.bathrooms = bathrooms;
        if (status) apartment.status = status;
        
        await apartment.save();
        
        res.json({
            success: true,
            data: apartment,
            message: 'Apartment updated successfully'
        });
    } catch (error) {
        console.error('Error updating apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating apartment',
            error: error.message
        });
    }
});

// DELETE /api/apartments/:id - Delete apartment
router.delete('/:id', async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        
        // Check if apartment has tenants
        const tenant = await Tenant.findOne({ apartmentNumber: apartment.number });
        if (tenant) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete apartment with active tenants'
            });
        }
        
        // Remove apartment from inventory and maintenance references
        await Inventory.updateMany(
            { apartmentNumber: apartment.number },
            { $unset: { apartmentNumber: 1 } }
        );
        
        await Maintenance.updateMany(
            { apartmentNumber: apartment.number },
            { $unset: { apartmentNumber: 1 } }
        );
        
        await Apartment.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Apartment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting apartment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting apartment',
            error: error.message
        });
    }
});

// GET /api/apartments/:id/inventory - Get apartment inventory
router.get('/:id/inventory', async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        
        const inventory = await Inventory.find({ apartmentNumber: apartment.number });
        
        res.json({
            success: true,
            data: inventory,
            message: 'Apartment inventory retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching apartment inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching apartment inventory',
            error: error.message
        });
    }
});

// GET /api/apartments/:id/maintenance - Get apartment maintenance
router.get('/:id/maintenance', async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: 'Apartment not found'
            });
        }
        
        const maintenance = await Maintenance.find({ apartmentNumber: apartment.number });
        
        res.json({
            success: true,
            data: maintenance,
            message: 'Apartment maintenance retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching apartment maintenance:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching apartment maintenance',
            error: error.message
        });
    }
});

module.exports = router;

