// Aurora Tenant Management System - API Service

class APIService {
    constructor() {
        this.baseURL = '/api';
        this.endpoints = {
            tenants: '/tenants',
            maintenance: '/maintenance',
            inventory: '/inventory',
            apartments: '/apartments',
            health: '/health'
        };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const authHeaders = {};
        if (window.auth && typeof window.auth.getToken === 'function') {
            const token = await window.auth.getToken();
            if (token) {
                authHeaders['Authorization'] = `Bearer ${token}`;
            }
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.request(this.endpoints.health);
    }

    // Tenant API methods
    async getTenants(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${this.endpoints.tenants}${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getTenant(id) {
        return this.request(`${this.endpoints.tenants}/${id}`);
    }

    async createTenant(tenantData) {
        return this.request(this.endpoints.tenants, {
            method: 'POST',
            body: JSON.stringify(tenantData)
        });
    }

    async updateTenant(id, tenantData) {
        return this.request(`${this.endpoints.tenants}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tenantData)
        });
    }

    async deleteTenant(id) {
        return this.request(`${this.endpoints.tenants}/${id}`, {
            method: 'DELETE'
        });
    }

    async checkoutTenant(id, checkoutDate) {
        return this.request(`${this.endpoints.tenants}/${id}/checkout`, {
            method: 'PATCH',
            body: JSON.stringify({ checkoutDate })
        });
    }

    async getTenantStats() {
        return this.request(`${this.endpoints.tenants}/stats/dashboard`);
    }

    async searchTenants(query) {
        return this.request(`${this.endpoints.tenants}/search/${encodeURIComponent(query)}`);
    }

    async updateTenantStatuses() {
        return this.request(`${this.endpoints.tenants}/update-statuses`, {
            method: 'PATCH'
        });
    }

    async getTenantsByApartment(apartmentNumber) {
        return this.request(`${this.endpoints.tenants}/apartment/${apartmentNumber}`);
    }

    // Maintenance API methods
    async getMaintenance(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${this.endpoints.maintenance}${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getMaintenance(id = null) {
        if (id) {
            return this.request(`${this.endpoints.maintenance}/${id}`);
        }
        return this.request(this.endpoints.maintenance);
    }

    async createMaintenance(maintenanceData) {
        return this.request(this.endpoints.maintenance, {
            method: 'POST',
            body: JSON.stringify(maintenanceData)
        });
    }

    async updateMaintenance(id, maintenanceData) {
        return this.request(`${this.endpoints.maintenance}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(maintenanceData)
        });
    }

    async deleteMaintenance(id) {
        return this.request(`${this.endpoints.maintenance}/${id}`, {
            method: 'DELETE'
        });
    }

    async completeMaintenance(id, completedDate, actualCost, notes) {
        return this.request(`${this.endpoints.maintenance}/${id}/complete`, {
            method: 'PATCH',
            body: JSON.stringify({ completedDate, actualCost, notes })
        });
    }

    async assignMaintenance(id, assignedTo) {
        return this.request(`${this.endpoints.maintenance}/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ assignedTo })
        });
    }

    async getMaintenanceStats() {
        return this.request(`${this.endpoints.maintenance}/stats/overview`);
    }

    async getPendingMaintenance() {
        return this.request(`${this.endpoints.maintenance}/status/pending`);
    }

    async getCompletedMaintenance(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${this.endpoints.maintenance}/status/completed${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getUrgentMaintenance() {
        return this.request(`${this.endpoints.maintenance}/priority/urgent`);
    }

    async getMaintenanceByApartment(apartmentNumber) {
        return this.request(`${this.endpoints.maintenance}/apartment/${apartmentNumber}`);
    }

    // Inventory API methods
    async getInventory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${this.endpoints.inventory}${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getInventoryById(id) {
        return this.request(`${this.endpoints.inventory}/${id}`);
    }

    async getInventory(id) {
        if (id) {
            return this.request(`${this.endpoints.inventory}/${id}`);
        }
        return this.request(this.endpoints.inventory);
    }

    async createInventory(inventoryData) {
        return this.request(this.endpoints.inventory, {
            method: 'POST',
            body: JSON.stringify(inventoryData)
        });
    }

    async updateInventory(id, inventoryData) {
        return this.request(`${this.endpoints.inventory}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(inventoryData)
        });
    }

    async deleteInventory(id) {
        return this.request(`${this.endpoints.inventory}/${id}`, {
            method: 'DELETE'
        });
    }

    async getInventoryByCategory(category, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${this.endpoints.inventory}/category/${category}${queryString ? `?${queryString}` : ''}`;
        return this.request(endpoint);
    }

    async getInventoryByApartment(apartmentNumber) {
        return this.request(`${this.endpoints.inventory}/apartment/${apartmentNumber}`);
    }

    async getMaintenanceDueItems() {
        return this.request(`${this.endpoints.inventory}/maintenance/due`);
    }

    async updateMaintenanceSchedule(id, nextMaintenanceDate) {
        return this.request(`${this.endpoints.inventory}/${id}/maintenance`, {
            method: 'PATCH',
            body: JSON.stringify({ nextMaintenanceDate })
        });
    }

    // Apartment methods
    async getApartments() {
        return this.request(this.endpoints.apartments);
    }

    async getApartment(id) {
        return this.request(`${this.endpoints.apartments}/${id}`);
    }

    async createApartment(apartmentData) {
        return this.request(this.endpoints.apartments, {
            method: 'POST',
            body: JSON.stringify(apartmentData)
        });
    }

    async updateApartment(id, apartmentData) {
        return this.request(`${this.endpoints.apartments}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(apartmentData)
        });
    }

    async deleteApartment(id) {
        return this.request(`${this.endpoints.apartments}/${id}`, {
            method: 'DELETE'
        });
    }

    async getApartmentInventory(apartmentId) {
        return this.request(`${this.endpoints.apartments}/${apartmentId}/inventory`);
    }

    async getApartmentMaintenance(apartmentId) {
        return this.request(`${this.endpoints.apartments}/${apartmentId}/maintenance`);
    }

    async changeItemStatus(id, status) {
        return this.request(`${this.endpoints.inventory}/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async updateItemCondition(id, condition) {
        return this.request(`${this.endpoints.inventory}/${id}/condition`, {
            method: 'PATCH',
            body: JSON.stringify({ condition })
        });
    }

    async getInventoryStats() {
        return this.request(`${this.endpoints.inventory}/stats/overview`);
    }

    async searchInventory(query) {
        return this.request(`${this.endpoints.inventory}/search/${encodeURIComponent(query)}`);
    }

    async bulkUpdateInventory(items) {
        return this.request(`${this.endpoints.inventory}/bulk-update`, {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    }

    // Utility methods
    async checkConnection() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            console.error('Backend connection failed:', error);
            return false;
        }
    }

    // Error handling
    handleError(error) {
        console.error('API Error:', error);
        
        if (error.message.includes('Failed to fetch')) {
            return {
                success: false,
                message: 'Unable to connect to server. Please check your internet connection.',
                error: 'NETWORK_ERROR'
            };
        }

        return {
            success: false,
            message: error.message || 'An unexpected error occurred',
            error: 'API_ERROR'
        };
    }

    // Data transformation helpers
    transformTenantData(tenant) {
        return {
            id: tenant._id,
            name: tenant.name,
            phone: tenant.phone,
            email: tenant.email,
            apartmentNumber: tenant.apartmentNumber,
            checkinDate: tenant.checkinDate,
            checkoutDate: tenant.checkoutDate,
            rentalBasis: tenant.rentalBasis,
            currency: tenant.currency || 'USD', // Default to USD if not set
            rentAmount: tenant.rentAmount,
            deposit: tenant.deposit,
            bookingSource: tenant.bookingSource,
            specialRequests: tenant.specialRequests,
            remarks: tenant.remarks,
            status: tenant.status,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
        };
    }

    transformMaintenanceData(maintenance) {
        return {
            id: maintenance._id,
            apartmentNumber: maintenance.apartmentNumber,
            type: maintenance.type,
            description: maintenance.description,
            priority: maintenance.priority,
            status: maintenance.status,
            reportedDate: maintenance.reportedDate,
            completedDate: maintenance.completedDate,
            assignedTo: maintenance.assignedTo,
            estimatedCost: maintenance.estimatedCost,
            actualCost: maintenance.actualCost,
            createdAt: maintenance.createdAt,
            updatedAt: maintenance.updatedAt
        };
    }

    transformInventoryData(inventory) {
        return {
            id: inventory._id,
            apartmentNumber: inventory.apartmentNumber,
            category: inventory.category,
            type: inventory.type,
            count: inventory.count,
            condition: inventory.condition,
            brand: inventory.brand,
            model: inventory.model,
            purchaseDate: inventory.purchaseDate,
            purchasePrice: inventory.purchasePrice,
            warrantyExpiry: inventory.warrantyExpiry,
            location: inventory.location,
            notes: inventory.notes,
            status: inventory.status,
            createdAt: inventory.createdAt,
            updatedAt: inventory.updatedAt
        };
    }
}

// Create global API instance
const api = new APIService();

// Export for use in other files
window.api = api;

