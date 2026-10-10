// Aurora Tenant Management System - Main JavaScript
// Global variables
let tenants = [];
let maintenanceRequests = [];
let inventory = [];
let apartments = [];
let signatures = [];
let signaturePreviewObjectUrl = null;
const signatureCardObjectUrls = new Map();

// DOM elements
let navLinks, pages, searchInput, statusFilter;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aurora Tenant Management System initializing...');

    initializeApp();
    setupEventListeners();

    // js/auth.js gates data loading behind a Netlify Identity session. If it
    // already unlocked the UI before this listener ran (e.g. the Identity
    // widget wasn't available and auth.js fell back to unlocking locally),
    // start loading data now instead of waiting for a login event that will
    // never come.
    if (document.body.classList.contains('authenticated')) {
        window.onAuthReady();
    }
});

// Called by js/auth.js once a Netlify Identity session is confirmed
// (or once auth.js decides to unlock the UI without one, for local dev).
window.onAuthReady = async function() {
    try {
        // Check if backend is available
        console.log('🔍 Checking backend connection...');
        const backendAvailable = await api.checkConnection();

        if (backendAvailable) {
            console.log('✅ Backend connected successfully');
            await loadDataFromAPI();
        } else {
            console.log('⚠️ Backend not available, using localStorage');
            loadSampleData();
        }

        updateDashboard();
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        // Fallback to localStorage
        loadSampleData();
        updateDashboard();
    }
};

// Initialize app
function initializeApp() {
    console.log('🔍 Initializing app...');
    
    navLinks = document.querySelectorAll('.nav-link');
    pages = document.querySelectorAll('.page');
    searchInput = document.getElementById('tenant-search');
    statusFilter = document.getElementById('status-filter');
    
    console.log(`📊 Found ${navLinks.length} nav links, ${pages.length} pages`);
    
    // Set dashboard as active by default
    document.getElementById('dashboard').classList.add('active');
    document.querySelector('[data-page="dashboard"]').classList.add('active');
    
    console.log('✅ App initialized');
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Search and filter
    if (searchInput) {
        searchInput.addEventListener('input', handleTenantSearch);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', handleStatusFilter);
    }
    
    // Form submissions
    const addTenantForm = document.getElementById('add-tenant-form');
    if (addTenantForm) {
        console.log('✅ Add tenant form found, adding submit listener');
        
        // Remove any existing listeners first
        const newForm = addTenantForm.cloneNode(true);
        addTenantForm.parentNode.replaceChild(newForm, addTenantForm);
        
        // Get the new form reference
        const freshForm = document.getElementById('add-tenant-form');
        
        // Add submit listener
        freshForm.addEventListener('submit', function(e) {
            console.log('🚀 Form submit event fired!');
            e.preventDefault();
            handleAddTenant(e);
        });
        
        // Test form submission
        console.log('🧪 Testing form submission...');
        const submitBtn = freshForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log('✅ Submit button found:', submitBtn.textContent);
            
            // Also add click listener as backup
            submitBtn.addEventListener('click', function(e) {
                console.log('🖱️ Submit button clicked!');
                // Prevent default to avoid double submission
                e.preventDefault();
                
                // Manually trigger form submission
                console.log('🔄 Manually triggering form submission...');
                const formData = new FormData(freshForm);
                console.log('📋 Form data collected:', Object.fromEntries(formData));
                
                // Call the handler directly
                handleAddTenant(e);
            });
            
                    // Test form validation
        console.log('🧪 Testing form validation...');
        const requiredFields = freshForm.querySelectorAll('[required]');
        console.log(`📋 Found ${requiredFields.length} required fields:`, Array.from(requiredFields).map(f => f.id));
        
        // Test form validity
        console.log('🧪 Testing form validity...');
        console.log('Form valid:', freshForm.checkValidity());
        console.log('Form validation message:', freshForm.validationMessage);
        
        // Check each required field
        requiredFields.forEach(field => {
            console.log(`Field ${field.id}:`, {
                valid: field.validity.valid,
                value: field.value,
                required: field.required,
                validationMessage: field.validationMessage
            });
        });
        } else {
            console.error('❌ Submit button not found!');
        }

        freshForm.addEventListener('change', function(e) {
            if (e.target.id !== 'tenant-nic-photo') {
                return;
            }
            const file = e.target.files && e.target.files[0];
            freshForm.removeAttribute('data-remove-nic');
            if (!file) {
                return;
            }
            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowed.includes(file.type)) {
                e.target.value = '';
                showFieldError(e.target, 'NIC photograph must be a JPEG, PNG, or WebP image');
                return;
            }
            showNicPreview(file);
        });

        freshForm.addEventListener('click', function(e) {
            if (!e.target.closest('#nic-photo-remove-btn')) {
                return;
            }
            e.preventDefault();
            handleRemoveNicPhoto();
        });
    } else {
        console.error('❌ Add tenant form not found!');
        console.log('🔍 Available forms:', document.querySelectorAll('form').length);
        document.querySelectorAll('form').forEach((form, index) => {
            console.log(`Form ${index}:`, form.id, form.className);
        });
    }
    
    const maintenanceForm = document.getElementById('maintenance-form');
    if (maintenanceForm) {
        console.log('✅ Maintenance form found, adding submit listener');
        
        // Remove any existing listeners first
        const newMaintenanceForm = maintenanceForm.cloneNode(true);
        maintenanceForm.parentNode.replaceChild(newMaintenanceForm, maintenanceForm);
        
        // Get the new form reference
        const freshMaintenanceForm = document.getElementById('maintenance-form');
        
        // Add submit listener
        freshMaintenanceForm.addEventListener('submit', function(e) {
            console.log('🚀 Maintenance form submit event fired!');
            e.preventDefault();
            handleAddMaintenance(e);
        });
        
        // Test form submission
        console.log('🧪 Testing maintenance form submission...');
        const submitBtn = freshMaintenanceForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log('✅ Maintenance submit button found:', submitBtn.textContent);
            
            // Also add click listener as backup
            submitBtn.addEventListener('click', function(e) {
                console.log('🖱️ Maintenance submit button clicked!');
                e.preventDefault();
                
                // Manually trigger form submission
                console.log('🔄 Manually triggering maintenance form submission...');
                const formData = new FormData(freshMaintenanceForm);
                console.log('📋 Maintenance form data collected:', Object.fromEntries(formData));
                
                // Call the handler directly
                handleAddMaintenance(e);
            });
        } else {
            console.error('❌ Maintenance submit button not found!');
        }
        bindRecordPhotoField(freshMaintenanceForm, 'maintenance');
    } else {
        console.error('❌ Maintenance form not found!');
    }
    
    const inventoryForm = document.getElementById('inventory-form');
    if (inventoryForm) {
        console.log('✅ Inventory form found, adding submit listener');
        
        // Remove any existing listeners first
        const newInventoryForm = inventoryForm.cloneNode(true);
        inventoryForm.parentNode.replaceChild(newInventoryForm, inventoryForm);
        
        // Get the new form reference
        const freshInventoryForm = document.getElementById('inventory-form');
        
        // Add submit listener
        freshInventoryForm.addEventListener('submit', function(e) {
            console.log('🚀 Inventory form submit event fired!');
            e.preventDefault();
            handleAddInventory(e);
        });
        
        // Test form submission
        console.log('🧪 Testing inventory form submission...');
        const submitBtn = freshInventoryForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log('✅ Inventory submit button found:', submitBtn.textContent);
            
            // Also add click listener as backup
            submitBtn.addEventListener('click', function(e) {
                console.log('🖱️ Inventory submit button clicked!');
                e.preventDefault();
                
                // Manually trigger form submission
                console.log('🔄 Manually triggering inventory form submission...');
                const formData = new FormData(freshInventoryForm);
                console.log('📋 Inventory form data collected:', Object.fromEntries(formData));
                
                // Call the handler directly
                handleAddInventory(e);
            });
        } else {
            console.error('❌ Inventory submit button not found!');
        }
        bindRecordPhotoField(freshInventoryForm, 'inventory');
    } else {
        console.error('❌ Inventory form not found!');
    }
    
    // Apartment form event listener
    const freshApartmentForm = document.getElementById('add-apartment-form');
    if (freshApartmentForm) {
        console.log('✅ Apartment form found, setting up listeners...');
        
        // Add submit listener
        freshApartmentForm.addEventListener('submit', function(e) {
            console.log('🚀 Apartment form submit event fired!');
            e.preventDefault();
            handleAddApartment(e);
        });
        
        // Test form submission
        console.log('🧪 Testing apartment form submission...');
        const submitBtn = freshApartmentForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log('✅ Apartment submit button found:', submitBtn.textContent);
            
            // Also add click listener as backup
            submitBtn.addEventListener('click', function(e) {
                console.log('🖱️ Apartment submit button clicked!');
                e.preventDefault();
                
                // Manually trigger form submission
                console.log('🔄 Manually triggering apartment form submission...');
                const formData = new FormData(freshApartmentForm);
                console.log('📋 Apartment form data collected:', Object.fromEntries(formData));
                
                // Call the handler directly
                handleAddApartment(e);
            });
        } else {
            console.error('❌ Apartment submit button not found!');
        }
    } else {
        console.error('❌ Apartment form not found!');
    }

    const addSignatureForm = document.getElementById('add-signature-form');
    if (addSignatureForm) {
        addSignatureForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddSignature();
        });
        const signatureSaveBtn = document.getElementById('add-signature-submit');
        if (signatureSaveBtn) {
            signatureSaveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleAddSignature();
            });
        }
        const signatureFileInput = document.getElementById('signature-file');
        if (signatureFileInput) {
            signatureFileInput.addEventListener('change', handleSignatureFilePreview);
        }
    }
    
    // Event delegation for apartment action buttons
    document.addEventListener('click', function(e) {
        const button = e.target.closest('.apartment-action-btn');
        if (button) {
            const action = button.getAttribute('data-action');
            const apartmentId = button.getAttribute('data-apartment-id');
            
            if (action && apartmentId) {
                console.log(`🏠 Apartment ${action} button clicked for ID: ${apartmentId}`);
                
                switch(action) {
                    case 'view':
                        viewApartmentDetails(apartmentId);
                        break;
                    case 'edit':
                        editApartment(apartmentId);
                        break;
                    case 'delete':
                        deleteApartment(apartmentId);
                        break;
                }
            }
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Cancel buttons
    document.querySelectorAll('[data-modal]').forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // Add buttons
    const addTenantBtn = document.getElementById('add-tenant-btn');
    if (addTenantBtn) {
        addTenantBtn.addEventListener('click', () => {
            // Reset modal to add mode
            const modal = document.getElementById('add-tenant-modal');
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitButton = modal.querySelector('button[type="submit"]');
            
            modalTitle.textContent = 'Add New Tenant';
            submitButton.textContent = 'Add Tenant';
            resetNicPhotoField();
            updateRentAmountLabel();
            updateAmountDue();
            
            showModal('add-tenant-modal');
        });
    }
    
    const addMaintenanceBtn = document.getElementById('add-maintenance-btn');
    if (addMaintenanceBtn) {
        addMaintenanceBtn.addEventListener('click', () => showModal('maintenance-modal'));
    }
    
    const addInventoryBtn = document.getElementById('add-inventory-btn');
    if (addInventoryBtn) {
        addInventoryBtn.addEventListener('click', () => showModal('inventory-modal'));
    }
    
    // Dashboard action buttons
    const dashboardAddTenantBtn = document.getElementById('dashboard-add-tenant-btn');
    if (dashboardAddTenantBtn) {
        dashboardAddTenantBtn.addEventListener('click', () => {
            // Reset modal to add mode
            const modal = document.getElementById('add-tenant-modal');
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitButton = modal.querySelector('button[type="submit"]');
            
            modalTitle.textContent = 'Add New Tenant';
            submitButton.textContent = 'Add Tenant';
            resetNicPhotoField();
            updateRentAmountLabel();
            updateAmountDue();
            
            showModal('add-tenant-modal');
        });
    }
    
    const dashboardMaintenanceBtn = document.getElementById('dashboard-maintenance-btn');
    if (dashboardMaintenanceBtn) {
        dashboardMaintenanceBtn.addEventListener('click', () => showModal('maintenance-modal'));
    }
    
    const dashboardInventoryBtn = document.getElementById('dashboard-inventory-btn');
    if (dashboardInventoryBtn) {
        dashboardInventoryBtn.addEventListener('click', () => showModal('inventory-modal'));
    }
    
    ['rent-amount', 'deposit', 'amount-paid', 'currency', 'checkin-date', 'checkout-date'].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', updateAmountDue);
        }
    });
    const rentalBasisField = document.getElementById('rental-basis');
    if (rentalBasisField) {
        rentalBasisField.addEventListener('change', () => {
            updateRentAmountLabel();
            updateAmountDue();
        });
    }

    // Inventory tab functionality
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
    
    // Modal closing is now only handled by close buttons and cancel buttons
    // No click-outside-to-close functionality to prevent drag issues
    
    // Form input focus effects and real-time validation
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.borderColor = '#4AA0BA';
            this.style.boxShadow = '0 0 0 3px rgba(74, 160, 186, 0.1)';
        });
        
        input.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            this.style.boxShadow = 'none';
            
            // Real-time validation on blur
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            // Clear error styling when user starts typing
            this.classList.remove('error');
            const errorMsg = this.parentNode.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
            
            // Clear general form error when user starts typing
            const generalError = document.getElementById('form-general-error');
            if (generalError) {
                generalError.style.display = 'none';
            }
            
            if (this.value.length > 0) {
                this.style.borderColor = '#98C454';
            } else {
                this.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            }
        });
    });
    
    // Setup dynamic event delegation for dynamically created elements
    setupDynamicEventListeners();
    
    console.log('✅ Event listeners setup complete');
}

// Setup dynamic event listeners for dynamically created elements
function setupDynamicEventListeners() {
    // Use event delegation for dynamically created buttons
    document.addEventListener('click', function(e) {
        // Info tenant button
        if (e.target.closest('.info-tenant-btn')) {
            const tenantId = e.target.closest('.info-tenant-btn').getAttribute('data-tenant-id');
            showTenantDetails(tenantId);
        }
        
        // Edit tenant button
        if (e.target.closest('.edit-tenant-btn')) {
            const tenantId = e.target.closest('.edit-tenant-btn').getAttribute('data-tenant-id');
            editTenant(tenantId);
        }
        
        // Delete tenant button
        if (e.target.closest('.delete-tenant-btn')) {
            const tenantId = e.target.closest('.delete-tenant-btn').getAttribute('data-tenant-id');
            deleteTenant(tenantId);
        }
        
        // Complete maintenance button
        if (e.target.closest('.complete-maintenance-btn')) {
            const requestId = e.target.closest('.complete-maintenance-btn').getAttribute('data-request-id');
            completeMaintenance(requestId);
        }
        
        // Edit from details modal button
        if (e.target.closest('#edit-from-details-btn')) {
            const tenantId = document.getElementById('edit-from-details-btn').getAttribute('data-tenant-id');
            closeModal('tenant-details-modal');
            editTenant(tenantId);
        }
        
        if (e.target.closest('.info-maintenance-btn')) {
            const requestId = e.target.closest('.info-maintenance-btn').getAttribute('data-request-id');
            showMaintenanceDetails(requestId);
        }

        if (e.target.closest('#edit-maintenance-from-details-btn')) {
            const requestId = document.getElementById('edit-maintenance-from-details-btn').getAttribute('data-request-id');
            closeModal('maintenance-details-modal');
            editMaintenance(requestId);
        }

        // Edit maintenance button
        if (e.target.closest('.edit-maintenance-btn')) {
            const requestId = e.target.closest('.edit-maintenance-btn').getAttribute('data-request-id');
            editMaintenance(requestId);
        }
        
        // Delete maintenance button
        if (e.target.closest('.delete-maintenance-btn')) {
            const requestId = e.target.closest('.delete-maintenance-btn').getAttribute('data-request-id');
            deleteMaintenance(requestId);
        }
        
        if (e.target.closest('.info-inventory-btn')) {
            const itemId = e.target.closest('.info-inventory-btn').getAttribute('data-item-id');
            showInventoryDetails(itemId);
        }

        if (e.target.closest('#edit-inventory-from-details-btn')) {
            const itemId = document.getElementById('edit-inventory-from-details-btn').getAttribute('data-item-id');
            closeModal('inventory-details-modal');
            editInventory(itemId);
        }

        // Edit inventory button
        if (e.target.closest('.edit-inventory-btn')) {
            const itemId = e.target.closest('.edit-inventory-btn').getAttribute('data-item-id');
            editInventory(itemId);
        }
        
        // Delete inventory button
        if (e.target.closest('.delete-inventory-btn')) {
            const itemId = e.target.closest('.delete-inventory-btn').getAttribute('data-item-id');
            deleteInventory(itemId);
        }

        if (e.target.closest('.rename-signature-btn')) {
            const signatureId = e.target.closest('.rename-signature-btn').getAttribute('data-signature-id');
            renameSignature(signatureId);
        }

        if (e.target.closest('.replace-signature-btn')) {
            const button = e.target.closest('.replace-signature-btn');
            const signatureId = button.getAttribute('data-signature-id');
            const fileInput = document.querySelector(`.signature-replace-input[data-signature-id="${signatureId}"]`);
            if (fileInput) {
                fileInput.click();
            }
        }

        if (e.target.closest('.delete-signature-btn')) {
            const signatureId = e.target.closest('.delete-signature-btn').getAttribute('data-signature-id');
            deleteSignature(signatureId);
        }
        
        // Add apartment button
        if (e.target.closest('#add-apartment-btn')) {
            showModal('add-apartment-modal');
        }
    });

    document.addEventListener('change', function(e) {
        if (e.target.classList && e.target.classList.contains('signature-replace-input')) {
            const signatureId = e.target.getAttribute('data-signature-id');
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (signatureId && file) {
                replaceSignatureImage(signatureId, file);
            }
        }
    });
}

// Data persistence
function saveDataToStorage() {
    localStorage.setItem('aurora-tenants', JSON.stringify(tenants));
    localStorage.setItem('aurora-maintenance', JSON.stringify(maintenanceRequests));
    localStorage.setItem('aurora-inventory', JSON.stringify(inventory));
}

function loadDataFromStorage() {
    const savedTenants = localStorage.getItem('aurora-tenants');
    const savedMaintenance = localStorage.getItem('aurora-maintenance');
    const savedInventory = localStorage.getItem('aurora-inventory');
    
    if (savedTenants) tenants = JSON.parse(savedTenants);
    if (savedMaintenance) maintenanceRequests = JSON.parse(savedMaintenance);
    if (savedInventory) inventory = JSON.parse(savedInventory);
}

// Load data from API
async function loadDataFromAPI() {
    try {
        console.log('📥 Loading data from API...');
        
        // Load tenants
        console.log('👥 Loading tenants...');
        // First update all tenant statuses based on current dates
        await api.updateTenantStatuses();
        
        const tenantsResponse = await api.getTenants();
        if (tenantsResponse.success) {
            tenants = tenantsResponse.data.map(tenant => api.transformTenantData(tenant));
            console.log(`✅ Loaded ${tenants.length} tenants`);
        }
        
        // Load maintenance
        console.log('🔧 Loading maintenance requests...');
        const maintenanceResponse = await api.getMaintenance();
        if (maintenanceResponse.success) {
            maintenanceRequests = maintenanceResponse.data.map(maintenance => api.transformMaintenanceData(maintenance));
            console.log(`✅ Loaded ${maintenanceRequests.length} maintenance requests`);
        }
        
        // Load inventory
        console.log('📦 Loading inventory...');
        const inventoryResponse = await api.getInventory();
        if (inventoryResponse.success) {
            inventory = inventoryResponse.data.map(item => api.transformInventoryData(item));
            console.log(`✅ Loaded ${inventory.length} inventory items`);
        }
        
        console.log('✅ Data loaded from API successfully');
    } catch (error) {
        console.error('❌ Error loading data from API:', error);
        // Fallback to localStorage
        console.log('🔄 Falling back to localStorage...');
        loadDataFromStorage();
    }
}

// Load tenants from API
async function loadTenantsFromAPI() {
    try {
        // First update all tenant statuses based on current dates
        await api.updateTenantStatuses();
        
        // Then load the updated tenants
        const response = await api.getTenants();
        if (response.success) {
            tenants = response.data.map(tenant => api.transformTenantData(tenant));
        }
    } catch (error) {
        console.error('❌ Error loading tenants from API:', error);
    }
}

// Load maintenance from API
async function loadMaintenanceFromAPI() {
    try {
        const response = await api.getMaintenance();
        if (response.success) {
            maintenanceRequests = response.data.map(maintenance => api.transformMaintenanceData(maintenance));
        }
    } catch (error) {
        console.error('❌ Error loading maintenance from API:', error);
    }
}

// Load inventory from API
async function loadInventoryFromAPI() {
    try {
        const response = await api.getInventory();
        if (response.success) {
            inventory = response.data.map(item => api.transformInventoryData(item));
        }
    } catch (error) {
        console.error('❌ Error loading inventory from API:', error);
    }
}

async function loadSignaturesFromAPI() {
    try {
        const response = await api.getSignatures();
        if (response.success) {
            signatures = response.data.map(signature => api.transformSignatureData(signature));
        }
    } catch (error) {
        console.error('❌ Error loading signatures from API:', error);
        showMessage('Could not load signatures: ' + error.message, 'error');
    }
}

function clearSignatureCardObjectUrls() {
    signatureCardObjectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    signatureCardObjectUrls.clear();
}

function clearSignatureUploadForm() {
    const form = document.getElementById('add-signature-form');
    if (form) {
        form.reset();
    }
    const previewWrap = document.getElementById('signature-file-preview-wrap');
    const preview = document.getElementById('signature-file-preview');
    if (previewWrap) {
        previewWrap.hidden = true;
    }
    if (preview) {
        preview.removeAttribute('src');
    }
    if (signaturePreviewObjectUrl) {
        URL.revokeObjectURL(signaturePreviewObjectUrl);
        signaturePreviewObjectUrl = null;
    }
}

function handleSignatureFilePreview(e) {
    const file = e.target.files && e.target.files[0];
    const previewWrap = document.getElementById('signature-file-preview-wrap');
    const preview = document.getElementById('signature-file-preview');
    if (!previewWrap || !preview) {
        return;
    }

    if (signaturePreviewObjectUrl) {
        URL.revokeObjectURL(signaturePreviewObjectUrl);
        signaturePreviewObjectUrl = null;
    }

    if (!file) {
        previewWrap.hidden = true;
        preview.removeAttribute('src');
        return;
    }

    if (file.type !== 'image/png' && !/\.png$/i.test(file.name)) {
        showMessage('Signature must be a PNG image', 'error');
        e.target.value = '';
        previewWrap.hidden = true;
        preview.removeAttribute('src');
        return;
    }

    signaturePreviewObjectUrl = URL.createObjectURL(file);
    preview.src = signaturePreviewObjectUrl;
    previewWrap.hidden = false;
}

function isPngFile(file) {
    return Boolean(file && (file.type === 'image/png' || /\.png$/i.test(file.name)));
}

function formatSignatureDate(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderSignaturesGrid() {
    const grid = document.getElementById('signatures-grid');
    if (!grid) {
        return;
    }

    clearSignatureCardObjectUrls();

    if (!signatures.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-signature"></i>
                <h3>No signatures yet</h3>
                <p>Upload a named PNG signature to use on invoices and receipts.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = signatures.map((signature) => {
        const updatedLabel = formatSignatureDate(signature.uploadedAt || signature.updatedAt);
        return `
            <article class="signature-card" data-signature-id="${signature.id}">
                <div class="signature-card-header">
                    <div>
                        <h3>${escapeHtml(signature.name)}</h3>
                        <p class="signature-card-meta">${updatedLabel ? `Updated ${updatedLabel}` : 'No image uploaded yet'}</p>
                    </div>
                </div>
                <div class="signature-card-preview" data-signature-preview="${signature.id}">
                    ${signature.hasImage
                        ? '<span class="signature-card-preview-empty">Loading…</span>'
                        : '<span class="signature-card-preview-empty">No image on file</span>'}
                </div>
                <div class="signature-card-actions">
                    <button type="button" class="btn-secondary replace-signature-btn" data-signature-id="${signature.id}" title="Replace image">
                        <i class="fas fa-upload"></i>
                        Replace
                    </button>
                    <button type="button" class="btn-secondary rename-signature-btn" data-signature-id="${signature.id}" title="Rename">
                        <i class="fas fa-pen"></i>
                        Rename
                    </button>
                    <button type="button" class="btn-secondary delete-signature-btn" data-signature-id="${signature.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                    <input type="file" class="signature-replace-input" data-signature-id="${signature.id}" accept="image/png,.png">
                </div>
            </article>
        `;
    }).join('');

    signatures.forEach((signature) => {
        if (signature.hasImage) {
            loadSignatureCardPreview(signature.id);
        }
    });
}

async function loadSignatureCardPreview(signatureId) {
    const preview = document.querySelector(`[data-signature-preview="${signatureId}"]`);
    if (!preview) {
        return;
    }

    try {
        const blob = await api.fetchSignatureImage(signatureId);
        if (!blob) {
            preview.innerHTML = '<span class="signature-card-preview-empty">No image on file</span>';
            return;
        }
        const url = URL.createObjectURL(blob);
        const existing = signatureCardObjectUrls.get(signatureId);
        if (existing) {
            URL.revokeObjectURL(existing);
        }
        signatureCardObjectUrls.set(signatureId, url);
        preview.innerHTML = `<img src="${url}" alt="Signature preview">`;
    } catch (error) {
        console.error('Error loading signature preview:', error);
        preview.innerHTML = '<span class="signature-card-preview-empty">Could not load image</span>';
    }
}

async function handleAddSignature() {
    const nameInput = document.getElementById('signature-name');
    const fileInput = document.getElementById('signature-file');
    const saveButton = document.getElementById('add-signature-submit');
    const name = nameInput ? nameInput.value.trim() : '';
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!name) {
        showMessage('Please enter a signature name', 'error');
        return;
    }
    if (!file) {
        showMessage('Please choose a PNG signature image', 'error');
        return;
    }
    if (!isPngFile(file)) {
        showMessage('Signature must be a PNG image', 'error');
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
    }

    let createdId = null;
    try {
        const created = await api.createSignature(name);
        if (!created.success || !created.data || !created.data._id) {
            throw new Error(created.message || 'Could not create signature');
        }
        createdId = created.data._id;
        await api.uploadSignatureImage(createdId, file);
        clearSignatureUploadForm();
        await loadSignaturesFromAPI();
        renderSignaturesGrid();
        showMessage('Signature added successfully', 'success');
    } catch (error) {
        console.error('Error adding signature:', error);
        if (createdId) {
            try {
                await api.deleteSignature(createdId);
            } catch (cleanupError) {
                console.error('Could not clean up incomplete signature:', cleanupError);
            }
        }
        showMessage(error.message || 'Could not add signature', 'error');
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    }
}

async function renameSignature(signatureId) {
    const signature = signatures.find((item) => item.id === signatureId);
    if (!signature) {
        return;
    }

    const nextName = prompt('Rename signature', signature.name);
    if (nextName === null) {
        return;
    }
    const name = nextName.trim();
    if (!name) {
        showMessage('Signature name is required', 'error');
        return;
    }
    if (name === signature.name) {
        return;
    }

    try {
        await api.renameSignature(signatureId, name);
        await loadSignaturesFromAPI();
        renderSignaturesGrid();
        showMessage('Signature renamed', 'success');
    } catch (error) {
        console.error('Error renaming signature:', error);
        showMessage(error.message || 'Could not rename signature', 'error');
    }
}

async function replaceSignatureImage(signatureId, file) {
    if (!isPngFile(file)) {
        showMessage('Signature must be a PNG image', 'error');
        return;
    }

    try {
        await api.uploadSignatureImage(signatureId, file);
        await loadSignaturesFromAPI();
        renderSignaturesGrid();
        showMessage('Signature image updated', 'success');
    } catch (error) {
        console.error('Error replacing signature image:', error);
        showMessage(error.message || 'Could not update signature image', 'error');
    }
}

async function deleteSignature(signatureId) {
    const signature = signatures.find((item) => item.id === signatureId);
    const label = signature ? `"${signature.name}"` : 'this signature';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) {
        return;
    }

    try {
        await api.deleteSignature(signatureId);
        await loadSignaturesFromAPI();
        renderSignaturesGrid();
        showMessage('Signature deleted', 'success');
    } catch (error) {
        console.error('Error deleting signature:', error);
        showMessage(error.message || 'Could not delete signature', 'error');
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Sample data for demonstration
function loadSampleData() {
    if (tenants.length === 0) {
        tenants = [
            {
                id: '1',
                name: 'John Doe',
                phone: '+1-555-0123',
                email: 'john@example.com',
                apartmentNumber: 'A101',
                checkinDate: '2024-01-15',
                checkoutDate: null,
                rentalBasis: 'monthly',
                rentAmount: 1200,
                deposit: 1200,
                bookingSource: 'online',
                specialRequests: 'Early check-in preferred',
                remarks: 'Quiet tenant, pays on time',
                status: 'active',
                createdAt: '2024-01-15T10:00:00Z'
            },
            {
                id: '2',
                name: 'Jane Smith',
                phone: '+1-555-0456',
                email: 'jane@example.com',
                apartmentNumber: 'B205',
                checkinDate: '2024-02-01',
                checkoutDate: null,
                rentalBasis: 'monthly',
                rentAmount: 1100,
                deposit: 1100,
                bookingSource: 'in-person',
                specialRequests: 'Pet-friendly unit',
                remarks: 'Has a small dog, very clean',
                status: 'active',
                createdAt: '2024-02-01T14:00:00Z'
            }
        ];
    }
    
    if (maintenanceRequests.length === 0) {
        maintenanceRequests = [
            {
                id: '1',
                apartmentNumber: 'A101',
                type: 'plumbing',
                description: 'Kitchen sink is clogged',
                priority: 'medium',
                reportedDate: '2024-01-20',
                status: 'completed',
                createdAt: '2024-01-20T09:00:00Z'
            }
        ];
    }
    
    if (inventory.length === 0) {
        inventory = [
            {
                id: '1',
                apartmentNumber: 'A101',
                category: 'furniture',
                type: 'Sofa',
                count: 1,
                notes: '3-seater, beige color',
                createdAt: '2024-01-15T10:00:00Z'
            }
        ];
    }
    
    // Initialize apartment data
    if (apartments.length === 0) {
        apartments = [
            {
                id: '1',
                number: '1',
                size: 1200,
                bedrooms: 2,
                bathrooms: 1,
                status: 'occupied'
            },
            {
                id: '2',
                number: '2',
                size: 1500,
                bedrooms: 3,
                bathrooms: 2,
                status: 'occupied'
            },
            {
                id: '3',
                number: '3',
                size: 1000,
                bedrooms: 1,
                bathrooms: 1,
                status: 'available'
            },
            {
                id: '4',
                number: '4',
                size: 1800,
                bedrooms: 3,
                bathrooms: 2,
                status: 'occupied'
            },
            {
                id: '5',
                number: '5',
                size: 1400,
                bedrooms: 2,
                bathrooms: 2,
                status: 'available'
            },
            {
                id: '6',
                number: '6',
                size: 1600,
                bedrooms: 3,
                bathrooms: 2,
                status: 'occupied'
            }
        ];
    }
    
    saveDataToStorage();
}

// Navigation handler
async function handleNavigation(e) {
    e.preventDefault();
    
    const targetPage = this.getAttribute('data-page');
    
    // Update active navigation link
    navLinks.forEach(link => link.classList.remove('active'));
    this.classList.add('active');
    
    // Show target page
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(targetPage).classList.add('active');
    
    // Update page content based on current page
    await updatePageContent(targetPage);
}

// Update page content
async function updatePageContent(page) {
    switch(page) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'tenants':
            await loadTenantsFromAPI();
            renderTenantsTable();
            break;
        case 'maintenance':
            await loadMaintenanceFromAPI();
            renderMaintenanceLists();
            break;
        case 'apartments':
            await loadApartmentsFromAPI();
            renderApartmentsGrid();
            break;
        case 'inventory':
            await loadInventoryFromAPI();
            renderInventoryGrids();
            break;
        case 'admin':
            await loadSignaturesFromAPI();
            renderSignaturesGrid();
            break;
    }
}

// Update dashboard
async function updateDashboard() {
    try {
        // Get dashboard stats from API
        const statsResponse = await api.getTenantStats();
        if (statsResponse.success) {
            const stats = statsResponse.data;
            
            // Update stats
            document.getElementById('total-tenants').textContent = stats.totalTenants || 0;
            document.getElementById('occupied-units').textContent = stats.activeTenants || 0;
            document.getElementById('pending-maintenance').textContent = maintenanceRequests.filter(m => m.status === 'pending').length;
            // Dashboard revenue display (Rupees)
            document.getElementById('monthly-revenue').textContent = `Rs. ${(stats.totalRevenue || 0).toFixed(2)}`;
            
            // Update recent tenants
            const recentTenants = stats.recentTenants || [];
            
            const recentTenantsContainer = document.getElementById('recent-tenants');
            
            if (recentTenants.length === 0) {
                recentTenantsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No tenants yet</h3>
                        <p>Add your first tenant to get started</p>
                    </div>
                `;
            } else {
                recentTenantsContainer.innerHTML = recentTenants.map(tenant => `
                    <div class="recent-item">
                        <div class="recent-item-avatar">${tenant.name.charAt(0).toUpperCase()}</div>
                        <div class="recent-item-info">
                            <h4>${tenant.name}</h4>
                            <p>Apartment ${tenant.apartmentNumber} • ${formatDate(tenant.checkinDate)}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
        // Fallback to local data
        document.getElementById('total-tenants').textContent = tenants.length;
        document.getElementById('occupied-units').textContent = tenants.filter(t => t.status === 'active').length;
        document.getElementById('pending-maintenance').textContent = maintenanceRequests.filter(m => m.status === 'pending').length;
        
        const totalRevenue = tenants.reduce((sum, tenant) => sum + (Number(tenant.amountPaid) || 0), 0);

        document.getElementById('monthly-revenue').textContent = `Rs. ${totalRevenue.toFixed(2)}`;
    }
}

// Form handlers
async function handleAddTenant(e) {
    console.log('🚀 handleAddTenant function called!');
    e.preventDefault();
    if (handleAddTenant.saving) {
        return;
    }
    handleAddTenant.saving = true;
    
    try {
        console.log('📝 Processing tenant form submission...');
        
        // Clear previous validation errors
        clearValidationErrors();
        
        // Debug: Check if form fields exist
        const formFields = {
            name: document.getElementById('tenant-name'),
            phone: document.getElementById('tenant-phone'),
            email: document.getElementById('tenant-email'),
            apartmentNumber: document.getElementById('tenant-apartment-number'),
            checkinDate: document.getElementById('checkin-date'),
            checkoutDate: document.getElementById('checkout-date'),
            rentalBasis: document.getElementById('rental-basis'),
            currency: document.getElementById('currency'),
            rentAmount: document.getElementById('rent-amount'),
            deposit: document.getElementById('deposit'),
            amountPaid: document.getElementById('amount-paid'),
            bookingSource: document.getElementById('booking-source'),
            specialRequests: document.getElementById('special-requests'),
            remarks: document.getElementById('remarks'),
            occupation: document.getElementById('tenant-occupation'),
            address: document.getElementById('tenant-address'),
            nicNumber: document.getElementById('tenant-nic-number'),
            emergencyName: document.getElementById('emergency-contact-name'),
            emergencyPhone: document.getElementById('emergency-contact-phone'),
            emergencyRelationship: document.getElementById('emergency-contact-relationship')
        };
        
        // Validate form fields
        let isValid = true;
        
        // Required field validation
        const requiredFields = {
            name: 'Full Name',
            phone: 'Phone Number',
            email: 'Email',
            apartmentNumber: 'Apartment Number',
            checkinDate: 'Check-in Date',
            rentalBasis: 'Rental Basis',
            currency: 'Currency',
            rentAmount: 'Rent Amount'
        };
        
        for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
            const field = formFields[fieldId];
            if (!field || !field.value.trim()) {
                showFieldError(field, `${fieldName} is required`);
                isValid = false;
            }
        }
        
        // Email validation
        if (formFields.email && formFields.email.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formFields.email.value)) {
                showFieldError(formFields.email, 'Please enter a valid email address');
                isValid = false;
            }
        }
        
        // Phone validation (10 digits)
        if (formFields.phone && formFields.phone.value) {
            const phoneRegex = /^\d{10}$/;
            const cleanPhone = formFields.phone.value.replace(/\D/g, ''); // Remove non-digits
            if (!phoneRegex.test(cleanPhone)) {
                showFieldError(formFields.phone, 'Please enter a valid 10-digit phone number');
                isValid = false;
            }
        }

        if (formFields.emergencyPhone && formFields.emergencyPhone.value.trim()) {
            const phoneRegex = /^\d{10}$/;
            const cleanPhone = formFields.emergencyPhone.value.replace(/\D/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                showFieldError(formFields.emergencyPhone, 'Please enter a valid 10-digit phone number');
                isValid = false;
            }
        }

        if (formFields.amountPaid && formFields.amountPaid.value.trim()) {
            const paid = Number(formFields.amountPaid.value);
            if (!Number.isFinite(paid) || paid < 0) {
                showFieldError(formFields.amountPaid, 'Amount paid must be zero or greater');
                isValid = false;
            }
        }
        
        if (!isValid) {
            showGeneralFormError('Please fix the errors below before submitting');
            return;
        }

        const nicInput = document.getElementById('tenant-nic-photo');
        const nicFile = nicInput && nicInput.files && nicInput.files[0];
        let nicBlob = null;
        if (nicFile) {
            try {
                nicBlob = await compressNicPhoto(nicFile);
            } catch (photoError) {
                showFieldError(nicInput, photoError.message);
                showGeneralFormError(photoError.message);
                return;
            }
        }
        
        console.log('🔍 Form field elements found:', Object.keys(formFields).map(key => ({
            field: key,
            exists: !!formFields[key],
            value: formFields[key] ? formFields[key].value : 'NOT FOUND'
        })));
        
        const tenantData = {
            name: formFields.name?.value || '',
            phone: formFields.phone?.value || '',
            email: formFields.email?.value || '',
            apartmentNumber: formFields.apartmentNumber?.value || '',
            checkinDate: formFields.checkinDate?.value || '',
            checkoutDate: formFields.checkoutDate?.value || null,
            rentalBasis: formFields.rentalBasis?.value || '',
            currency: formFields.currency?.value || '',
            rentAmount: parseFloat(formFields.rentAmount?.value || '0'),
            deposit: parseFloat(formFields.deposit?.value || '0'),
            amountPaid: parseFloat(formFields.amountPaid?.value || '0'),
            bookingSource: formFields.bookingSource?.value || '',
            specialRequests: formFields.specialRequests?.value || '',
            remarks: formFields.remarks?.value || '',
            occupation: formFields.occupation?.value.trim() || '',
            address: formFields.address?.value.trim() || '',
            nicNumber: formFields.nicNumber?.value.trim() || '',
            emergencyContact: {
                name: formFields.emergencyName?.value.trim() || '',
                phone: formFields.emergencyPhone?.value.trim() || '',
                relationship: formFields.emergencyRelationship?.value.trim() || ''
            },
            status: 'active'
        };
        
        console.log('📋 Tenant data:', tenantData);
        
        // Check if this is an edit operation
        const editId = document.getElementById('add-tenant-form').getAttribute('data-edit-id');
        let response;
        
        if (editId) {
            // Update existing tenant
            console.log(`🔄 Updating tenant with ID: ${editId}`);
            response = await api.updateTenant(editId, tenantData);
        } else {
            // Create new tenant
            console.log('🆕 Creating new tenant...');
            console.log('📡 Making API call to create tenant...');
            
            try {
                response = await api.createTenant(tenantData);
                console.log('📡 API response received:', response);
            } catch (apiError) {
                console.error('❌ API call failed:', apiError);
                throw apiError;
            }
        }
        
        if (response.success) {
            console.log('✅ Tenant saved successfully');
            const savedId = editId || (response.data && (response.data._id || response.data.id));
            const tenantForm = document.getElementById('add-tenant-form');
            const removeNic = tenantForm && tenantForm.getAttribute('data-remove-nic') === 'true';
            const hadNic = tenantForm && tenantForm.getAttribute('data-has-nic') === 'true';
            let photoWarning = '';

            try {
                if (savedId && nicBlob) {
                    await api.uploadNicPhoto(savedId, nicBlob);
                } else if (savedId && removeNic && hadNic) {
                    await api.deleteNicPhoto(savedId);
                }
            } catch (photoError) {
                console.error('❌ NIC photograph was not saved:', photoError);
                photoWarning = nicBlob
                    ? ' The tenant was saved, but the NIC photograph could not be uploaded. Edit the tenant and try the photo again.'
                    : ' The tenant was saved, but the NIC photograph could not be removed.';
            }

            showMessage(
                (editId ? 'Tenant updated successfully!' : 'Tenant added successfully!') + photoWarning,
                photoWarning ? 'error' : 'success'
            );
            closeModal('add-tenant-modal');
            // Clear the edit ID
            document.getElementById('add-tenant-form').removeAttribute('data-edit-id');
            await loadTenantsFromAPI();
            updateDashboard();
            
            if (document.getElementById('tenants').classList.contains('active')) {
                renderTenantsTable();
            }
            
            // Also re-render apartments to update status if apartments page is active
            if (document.getElementById('apartments').classList.contains('active')) {
                renderApartmentsGrid();
            }
        } else {
            console.error('❌ Failed to save tenant:', response.message);
            showMessage('Failed to save tenant: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error saving tenant:', error);
        showMessage('Error saving tenant: ' + error.message, 'error');
    } finally {
        handleAddTenant.saving = false;
    }
}

async function handleAddMaintenance(e) {
    e.preventDefault();
    if (handleAddMaintenance.saving) {
        return;
    }
    handleAddMaintenance.saving = true;
    
    try {
        console.log('🔧 Processing maintenance form submission...');
        
        // Debug: Check if form fields exist
        const formFields = {
            apartmentNumber: document.getElementById('maintenance-apartment'),
            type: document.getElementById('maintenance-type'),
            description: document.getElementById('maintenance-description'),
            priority: document.getElementById('maintenance-priority'),
            reportedDate: document.getElementById('maintenance-date'),
            cost: document.getElementById('maintenance-cost')
        };
        
        console.log('🔍 Maintenance form field elements found:', Object.keys(formFields).map(key => ({
            field: key,
            exists: !!formFields[key],
            value: formFields[key] ? formFields[key].value : 'NOT FOUND'
        })));
        
        let maintenanceCost = 0;
        try {
            maintenanceCost = readCost(formFields.cost);
        } catch (costError) {
            showFieldError(formFields.cost, costError.message);
            return;
        }

        const maintenanceData = {
            apartmentNumber: formFields.apartmentNumber?.value || '',
            type: formFields.type?.value || '',
            description: formFields.description?.value || '',
            priority: formFields.priority?.value || 'medium',
            reportedDate: formFields.reportedDate?.value || new Date().toISOString().split('T')[0],
            estimatedCost: maintenanceCost
        };
        
        console.log('📋 Maintenance data:', maintenanceData);

        let photoBlob = null;
        try {
            photoBlob = await prepareRecordPhoto('maintenance');
        } catch (photoError) {
            showFieldError(document.getElementById('maintenance-photo'), photoError.message);
            return;
        }
        
        // Check if this is an edit operation
        const editId = document.getElementById('maintenance-form').getAttribute('data-edit-id');
        let response;
        
        if (editId) {
            // Update existing maintenance request
            console.log(`🔄 Updating maintenance request with ID: ${editId}`);
            response = await api.updateMaintenance(editId, maintenanceData);
        } else {
            maintenanceData.status = 'pending';
            // Create new maintenance request
            console.log('🆕 Creating new maintenance request...');
            console.log('📡 Making API call to create maintenance request...');
            
            try {
                response = await api.createMaintenance(maintenanceData);
                console.log('📡 Maintenance API response received:', response);
            } catch (apiError) {
                console.error('❌ Maintenance API call failed:', apiError);
                throw apiError;
            }
        }
        
        if (response.success) {
            const savedId = editId || (response.data && (response.data._id || response.data.id));
            const photoWarning = await commitRecordPhoto('maintenance', savedId, photoBlob);
            showMessage(
                (editId ? 'Maintenance request updated successfully!' : 'Maintenance request submitted successfully!') + photoWarning,
                photoWarning ? 'error' : 'success'
            );
            closeModal('maintenance-modal');
            // Clear the edit ID
            document.getElementById('maintenance-form').removeAttribute('data-edit-id');
            await loadMaintenanceFromAPI();
            updateDashboard();
            
            if (document.getElementById('maintenance').classList.contains('active')) {
                renderMaintenanceLists();
            }
        } else {
            showMessage('Failed to save maintenance request: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error adding maintenance request:', error);
        showMessage('Error adding maintenance request: ' + error.message, 'error');
    } finally {
        handleAddMaintenance.saving = false;
    }
}

async function handleAddInventory(e) {
    e.preventDefault();
    if (handleAddInventory.saving) {
        return;
    }
    handleAddInventory.saving = true;
    
    try {
        console.log('📦 Processing inventory form submission...');
        
        // Debug: Check if form fields exist
        const formFields = {
            apartmentNumber: document.getElementById('inventory-apartment'),
            category: document.getElementById('inventory-category'),
            type: document.getElementById('item-type'),
            count: document.getElementById('item-count'),
            notes: document.getElementById('item-notes'),
            cost: document.getElementById('item-cost')
        };
        
        console.log('🔍 Inventory form field elements found:', Object.keys(formFields).map(key => ({
            field: key,
            exists: !!formFields[key],
            value: formFields[key] ? formFields[key].value : 'NOT FOUND'
        })));
        
        let itemCost = 0;
        try {
            itemCost = readCost(formFields.cost);
        } catch (costError) {
            showFieldError(formFields.cost, costError.message);
            return;
        }

        const inventoryData = {
            apartmentNumber: formFields.apartmentNumber?.value || '',
            category: formFields.category?.value || '',
            type: formFields.type?.value || '',
            count: parseInt(formFields.count?.value || '1'),
            notes: formFields.notes?.value || '',
            purchasePrice: itemCost
        };
        
        console.log('📋 Inventory data:', inventoryData);

        let photoBlob = null;
        try {
            photoBlob = await prepareRecordPhoto('inventory');
        } catch (photoError) {
            showFieldError(document.getElementById('inventory-photo'), photoError.message);
            return;
        }
        
        // Check if this is an edit operation
        const editId = document.getElementById('inventory-form').getAttribute('data-edit-id');
        let response;
        
        if (editId) {
            // Update existing inventory item
            console.log(`🔄 Updating inventory item with ID: ${editId}`);
            response = await api.updateInventory(editId, inventoryData);
        } else {
            // Create new inventory item
            console.log('🆕 Creating new inventory item...');
            console.log('📡 Making API call to create inventory item...');
            
            try {
                response = await api.createInventory(inventoryData);
                console.log('📡 Inventory API response received:', response);
            } catch (apiError) {
                console.error('❌ Inventory API call failed:', apiError);
                throw apiError;
            }
        }
        
        if (response.success) {
            const savedId = editId || (response.data && (response.data._id || response.data.id));
            const photoWarning = await commitRecordPhoto('inventory', savedId, photoBlob);
            showMessage(
                (editId ? 'Inventory item updated successfully!' : 'Inventory item added successfully!') + photoWarning,
                photoWarning ? 'error' : 'success'
            );
            closeModal('inventory-modal');
            // Clear the edit ID
            document.getElementById('inventory-form').removeAttribute('data-edit-id');
            await loadInventoryFromAPI();
            
            if (document.getElementById('inventory').classList.contains('active')) {
                renderInventoryGrids();
            }
        } else {
            showMessage('Failed to save inventory item: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error adding inventory item:', error);
        showMessage('Error adding inventory item: ' + error.message, 'error');
    } finally {
        handleAddInventory.saving = false;
    }
}

// Search and filter handlers
async function handleTenantSearch(e) {
    const searchTerm = e.target.value;
    
    if (searchTerm.length > 0) {
        try {
            const response = await api.searchTenants(searchTerm);
            if (response.success) {
                tenants = response.data.map(tenant => api.transformTenantData(tenant));
                renderTenantsTable(tenants);
            }
        } catch (error) {
            console.error('Error searching tenants:', error);
        }
    } else {
        // Load all tenants when search is cleared
        await loadTenantsFromAPI();
        renderTenantsTable();
        
        // Also re-render apartments to update status if apartments page is active
        if (document.getElementById('apartments').classList.contains('active')) {
            renderApartmentsGrid();
        }
    }
}

async function handleStatusFilter(e) {
    const status = e.target.value;
    
    try {
        const params = status ? { status } : {};
        const response = await api.getTenants(params);
        if (response.success) {
            tenants = response.data.map(tenant => api.transformTenantData(tenant));
            renderTenantsTable(tenants);
        }
    } catch (error) {
        console.error('Error filtering tenants:', error);
    }
}

// Render functions
function renderTenantsTable(tenantsToRender = tenants) {
    const tbody = document.getElementById('tenants-table-body');
    
    if (tenantsToRender.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No tenants found</h3>
                    <p>Add your first tenant to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = tenantsToRender.map(tenant => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="recent-item-avatar">${tenant.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${tenant.name}</strong>${tenant.hasNicPhoto ? '<i class="fas fa-id-card nic-on-file" title="NIC photograph on file"></i>' : ''}
                        <br>
                        <small>${tenant.email || 'No email'}</small>
                    </div>
                </div>
            </td>
            <td><strong>${tenant.apartmentNumber}</strong></td>
            <td>${tenant.phone}</td>
            <td>${formatDate(tenant.checkinDate)}</td>
            <td>${getCurrencySymbol(tenant.currency)}${tenant.rentAmount.toFixed(2)}</td>
            <td>
                <span class="status-badge status-${tenant.status}">
                    ${tenant.status}
                </span>
            </td>
            <td>
                <button class="btn-secondary info-tenant-btn" data-tenant-id="${tenant.id}" title="View Details">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn-secondary edit-tenant-btn" data-tenant-id="${tenant.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary delete-tenant-btn" data-tenant-id="${tenant.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderMaintenanceLists() {
    const pendingContainer = document.getElementById('pending-maintenance-list');
    const completedContainer = document.getElementById('completed-maintenance-list');
    
    const pending = maintenanceRequests.filter(m => m.status === 'pending');
    const completed = maintenanceRequests.filter(m => m.status === 'completed');
    
    // Render pending requests
    if (pending.length === 0) {
        pendingContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tools"></i>
                <h3>No pending requests</h3>
                <p>All maintenance is up to date!</p>
            </div>
        `;
    } else {
        pendingContainer.innerHTML = pending.map(request => `
            <div class="maintenance-item">
                <div class="maintenance-header">
                    <h4>${request.type.charAt(0).toUpperCase() + request.type.slice(1)} - Apt ${request.apartmentNumber}</h4>
                    <span class="priority-badge priority-${request.priority}">${request.priority}</span>
                </div>
                <p>${request.description}</p>
                <p class="maintenance-cost"><strong>Cost:</strong> ${formatMoney(request.estimatedCost)}</p>
                <div class="maintenance-footer">
                    <small>Reported: ${formatDate(request.reportedDate)}</small>
                    <div class="maintenance-actions">
                        <button class="btn-secondary info-maintenance-btn" data-request-id="${request.id}" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-secondary edit-maintenance-btn" data-request-id="${request.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary delete-maintenance-btn" data-request-id="${request.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-secondary complete-maintenance-btn" data-request-id="${request.id}">
                            Mark Complete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Render completed requests
    if (completed.length === 0) {
        completedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No completed requests</h3>
                <p>Complete some maintenance to see them here</p>
            </div>
        `;
    } else {
        completedContainer.innerHTML = completed.map(request => `
            <div class="maintenance-item completed">
                <div class="maintenance-header">
                    <h4>${request.type.charAt(0).toUpperCase() + request.type.slice(1)} - Apt ${request.apartmentNumber}</h4>
                    <span class="status-badge status-completed">Completed</span>
                </div>
                <p>${request.description}</p>
                <p class="maintenance-cost"><strong>Cost:</strong> ${formatMoney(request.estimatedCost)}</p>
                <div class="maintenance-footer">
                    <small>Completed: ${formatDate(request.completedDate)}</small>
                    <div class="maintenance-actions">
                        <button class="btn-secondary info-maintenance-btn" data-request-id="${request.id}" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-secondary edit-maintenance-btn" data-request-id="${request.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary delete-maintenance-btn" data-request-id="${request.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function renderApartmentsGrid() {
    const container = document.getElementById('apartments-grid');
    
    if (apartments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>No apartments found</h3>
                <p>Add your first apartment to get started</p>
            </div>
        `;
        return;
    }
    
    // Sort apartments by apartment number in ascending order
    const sortedApartments = [...apartments].sort((a, b) => {
        // Convert apartment numbers to integers for proper numerical sorting
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numA - numB;
    });
    
    container.innerHTML = sortedApartments.map(apartment => {
        // Get tenant for this apartment
        const tenant = tenants.find(t => t.apartmentNumber === apartment.number);
        
        // Determine apartment status based on active tenant presence
        const apartmentStatus = isTenantActive(tenant) ? 'occupied' : 'available';
        
        // Get inventory items for this apartment
        const apartmentInventory = inventory.filter(item => item.apartmentNumber === apartment.number);
        
        // Get maintenance requests for this apartment
        const apartmentMaintenance = maintenanceRequests.filter(m => m.apartmentNumber === apartment.number);
        
        return `
            <div class="apartment-card" data-apartment-id="${apartment.id}">
                <div class="apartment-actions">
                    <button class="apartment-action-btn info" data-action="view" data-apartment-id="${apartment.id}" title="View Details">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="apartment-action-btn edit" data-action="edit" data-apartment-id="${apartment.id}" title="Edit Apartment">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="apartment-action-btn delete" data-action="delete" data-apartment-id="${apartment.id}" title="Delete Apartment">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="apartment-header">
                    <div class="apartment-number">Apartment ${apartment.number}</div>
                    <div class="apartment-status ${apartmentStatus}">${apartmentStatus}</div>
                </div>
                
                <div class="apartment-details">
                    <div class="detail-row">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${apartment.size} sq ft</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Bedrooms:</span>
                        <span class="detail-value">${apartment.bedrooms}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Bathrooms:</span>
                        <span class="detail-value">${apartment.bathrooms}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Monthly Rate:</span>
                        <span class="detail-value">${formatMoney(apartment.monthlyRate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Current Tenant:</span>
                        <span class="detail-value">${isTenantActive(tenant) ? tenant.name : 'None'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Inventory Items:</span>
                        <span class="detail-value">${apartmentInventory.length} items</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Maintenance Requests:</span>
                        <span class="detail-value">${apartmentMaintenance.length} requests</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderInventoryGrids() {
    const furnitureContainer = document.getElementById('furniture-grid');
    const appliancesContainer = document.getElementById('appliances-grid');
    const utensilsContainer = document.getElementById('utensils-grid');
    
    const furniture = inventory.filter(item => item.category === 'furniture');
    const appliances = inventory.filter(item => item.category === 'appliances');
    const utensils = inventory.filter(item => item.category === 'utensils');
    
    // Render furniture
    if (furniture.length === 0) {
        furnitureContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-couch"></i>
                <h3>No furniture items</h3>
                <p>Add furniture to get started</p>
            </div>
        `;
    } else {
        furnitureContainer.innerHTML = furniture.map(item => `
            <div class="inventory-item">
                <div class="inventory-header">
                    <h4>${item.type}</h4>
                    <div class="inventory-actions">
                        <button class="btn-secondary info-inventory-btn" data-item-id="${item.id}" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-secondary edit-inventory-btn" data-item-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary delete-inventory-btn" data-item-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="inventory-details">
                    <p><strong>Apartment</strong><span>${item.apartmentNumber}</span></p>
                    <p><strong>Count</strong><span>${item.count} ${item.count === 1 ? 'item' : 'items'}</span></p>
                    <p><strong>Cost</strong><span>${formatMoney(item.purchasePrice)}</span></p>
                    ${item.notes ? `<p><strong>Notes</strong><span>${item.notes}</span></p>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // Render appliances
    if (appliances.length === 0) {
        appliancesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-plug"></i>
                <h3>No appliances</h3>
                <p>Add appliances to get started</p>
            </div>
        `;
    } else {
        appliancesContainer.innerHTML = appliances.map(item => `
            <div class="inventory-item">
                <div class="inventory-header">
                    <h4>${item.type}</h4>
                    <div class="inventory-actions">
                        <button class="btn-secondary info-inventory-btn" data-item-id="${item.id}" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-secondary edit-inventory-btn" data-item-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary delete-inventory-btn" data-item-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="inventory-details">
                    <p><strong>Apartment</strong><span>${item.apartmentNumber}</span></p>
                    <p><strong>Count</strong><span>${item.count} ${item.count === 1 ? 'item' : 'items'}</span></p>
                    <p><strong>Cost</strong><span>${formatMoney(item.purchasePrice)}</span></p>
                    ${item.notes ? `<p><strong>Notes</strong><span>${item.notes}</span></p>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    // Render utensils
    if (utensils.length === 0) {
        utensilsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h3>No utensils</h3>
                <p>Add utensils to get started</p>
            </div>
        `;
    } else {
        utensilsContainer.innerHTML = utensils.map(item => `
            <div class="inventory-item">
                <div class="inventory-header">
                    <h4>${item.type}</h4>
                    <div class="inventory-actions">
                        <button class="btn-secondary info-inventory-btn" data-item-id="${item.id}" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="btn-secondary edit-inventory-btn" data-item-id="${item.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary delete-inventory-btn" data-item-id="${item.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="inventory-details">
                    <p><strong>Apartment</strong><span>${item.apartmentNumber}</span></p>
                    <p><strong>Count</strong><span>${item.count} ${item.count === 1 ? 'item' : 'items'}</span></p>
                    <p><strong>Cost</strong><span>${formatMoney(item.purchasePrice)}</span></p>
                    ${item.notes ? `<p><strong>Notes</strong><span>${item.notes}</span></p>` : ''}
                </div>
            </div>
        `).join('');
    }
}

// Action functions
async function editTenant(tenantId) {
    try {
        const response = await api.getTenant(tenantId);
        if (response.success) {
            const tenant = response.data;
            
            // Populate form with tenant data
            document.getElementById('tenant-name').value = tenant.name;
            document.getElementById('tenant-phone').value = tenant.phone;
            document.getElementById('tenant-email').value = tenant.email || '';
            document.getElementById('tenant-apartment-number').value = tenant.apartmentNumber;
            document.getElementById('checkin-date').value = tenant.checkinDate.split('T')[0];
            document.getElementById('checkout-date').value = tenant.checkoutDate ? tenant.checkoutDate.split('T')[0] : '';
            document.getElementById('rental-basis').value = tenant.rentalBasis;
            document.getElementById('currency').value = tenant.currency || '';
            document.getElementById('rent-amount').value = tenant.rentAmount;
            document.getElementById('deposit').value = tenant.deposit || '';
            document.getElementById('amount-paid').value = Number.isFinite(Number(tenant.amountPaid)) ? tenant.amountPaid : '';
            updateRentAmountLabel();
            updateAmountDue();
            document.getElementById('booking-source').value = tenant.bookingSource || '';
            document.getElementById('special-requests').value = tenant.specialRequests || '';
            document.getElementById('remarks').value = tenant.remarks || '';
            document.getElementById('tenant-occupation').value = tenant.occupation || '';
            document.getElementById('tenant-address').value = tenant.address || '';
            document.getElementById('tenant-nic-number').value = tenant.nicNumber || '';
            document.getElementById('emergency-contact-name').value = tenant.emergencyContact && tenant.emergencyContact.name || '';
            document.getElementById('emergency-contact-phone').value = tenant.emergencyContact && tenant.emergencyContact.phone || '';
            document.getElementById('emergency-contact-relationship').value = tenant.emergencyContact && tenant.emergencyContact.relationship || '';
            resetNicPhotoField();
            
            // Store the tenant ID for update
            const tenantForm = document.getElementById('add-tenant-form');
            tenantForm.setAttribute('data-edit-id', tenantId);
            if (tenant.nicPhoto && tenant.nicPhoto.key) {
                tenantForm.setAttribute('data-has-nic', 'true');
                loadExistingNicPreview(tenantId);
            }
            
            // Update modal title and button text for edit mode
            const modal = document.getElementById('add-tenant-modal');
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitButton = modal.querySelector('button[type="submit"]');
            
            modalTitle.textContent = 'Edit Tenant';
            submitButton.textContent = 'Update Tenant';
            
            showModal('add-tenant-modal');
        } else {
            showMessage('Failed to load tenant data: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error loading tenant data:', error);
        showMessage('Error loading tenant data: ' + error.message, 'error');
    }
}

async function deleteTenant(tenantId) {
    if (confirm('Are you sure you want to delete this tenant?')) {
        try {
            const response = await api.deleteTenant(tenantId);
            
            if (response.success) {
                await loadTenantsFromAPI();
                updateDashboard();
                renderTenantsTable();
                
                // Also re-render apartments to update status if apartments page is active
                if (document.getElementById('apartments').classList.contains('active')) {
                    renderApartmentsGrid();
                }
                
                showMessage('Tenant deleted successfully', 'success');
            } else {
                showMessage('Failed to delete tenant: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
            showMessage('Error deleting tenant: ' + error.message, 'error');
        }
    }
}

async function showTenantDetails(tenantId) {
    try {
        const response = await api.getTenant(tenantId);
        if (response.success) {
            const tenant = response.data;
            
                    // Populate the details modal with tenant data
                    document.getElementById('detail-name').textContent = tenant.name || 'Not provided';
                    document.getElementById('detail-phone').textContent = tenant.phone || 'Not provided';
                    document.getElementById('detail-email').textContent = tenant.email || 'Not provided';
                    document.getElementById('detail-occupation').textContent = tenant.occupation || 'Not provided';
                    document.getElementById('detail-address').textContent = tenant.address || 'Not provided';
                    document.getElementById('detail-nic-number').textContent = tenant.nicNumber || 'Not provided';
                    document.getElementById('detail-emergency-name').textContent = tenant.emergencyContact && tenant.emergencyContact.name || 'Not provided';
                    document.getElementById('detail-emergency-phone').textContent = tenant.emergencyContact && tenant.emergencyContact.phone || 'Not provided';
                    document.getElementById('detail-emergency-relationship').textContent = tenant.emergencyContact && tenant.emergencyContact.relationship || 'Not provided';
                    document.getElementById('detail-apartment').textContent = tenant.apartmentNumber || 'Not provided';
                    document.getElementById('detail-checkin').textContent = tenant.checkinDate ? formatDate(tenant.checkinDate) : 'Not provided';
                    document.getElementById('detail-checkout').textContent = tenant.checkoutDate ? formatDate(tenant.checkoutDate) : 'Not provided';
                    document.getElementById('detail-rental-basis').textContent = tenant.rentalBasis ? tenant.rentalBasis.charAt(0).toUpperCase() + tenant.rentalBasis.slice(1) : 'Not provided';
                    document.getElementById('detail-currency').textContent = tenant.currency || 'Not provided';
                    document.getElementById('detail-rent-amount').textContent = tenant.rentAmount ? `${getCurrencySymbol(tenant.currency)}${tenant.rentAmount.toFixed(2)}` : 'Not provided';
                    document.getElementById('detail-deposit').textContent = tenant.deposit ? `${getCurrencySymbol(tenant.currency)}${Number(tenant.deposit).toFixed(2)}` : 'Not provided';
                    document.getElementById('detail-amount-paid').textContent = formatTenantMoney(tenant.amountPaid, tenant.currency);
                    document.getElementById('detail-rent-periods').textContent = billingSummary(tenant);
                    document.getElementById('detail-amount-due').textContent = formatTenantMoney(calculateAmountDue(tenant), tenant.currency);
                    document.getElementById('detail-booking-source').textContent = tenant.bookingSource ? tenant.bookingSource.charAt(0).toUpperCase() + tenant.bookingSource.slice(1) : 'Not provided';
            document.getElementById('detail-status').innerHTML = `<span class="status-badge status-${tenant.status}">${tenant.status}</span>`;
            document.getElementById('detail-special-requests').textContent = tenant.specialRequests || 'Not provided';
            document.getElementById('detail-remarks').textContent = tenant.remarks || 'Not provided';
            showNicPhotoInDetails(tenant);
            
            // Store the tenant ID for the edit button
            document.getElementById('edit-from-details-btn').setAttribute('data-tenant-id', tenantId);
            
            // Show the modal
            showModal('tenant-details-modal');
        } else {
            showMessage('Failed to load tenant details: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error loading tenant details:', error);
        showMessage('Error loading tenant details: ' + error.message, 'error');
    }
}

async function completeMaintenance(requestId) {
    try {
        const response = await api.completeMaintenance(requestId, new Date().toISOString());
        
        if (response.success) {
            // Reload maintenance data from API to get updated status
            await loadMaintenanceFromAPI();
            // Re-render the maintenance lists with updated data
            renderMaintenanceLists();
            // Update dashboard
            updateDashboard();
            showMessage('Maintenance request marked as completed', 'success');
        } else {
            showMessage('Failed to complete maintenance request: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error completing maintenance request:', error);
        showMessage('Error completing maintenance request: ' + error.message, 'error');
    }
}

let detailMaintenanceRequest = 0;
let detailMaintenanceObjectUrl = null;

function clearDetailMaintenancePhoto() {
    if (detailMaintenanceObjectUrl) {
        URL.revokeObjectURL(detailMaintenanceObjectUrl);
        detailMaintenanceObjectUrl = null;
    }
    const img = document.getElementById('detail-maintenance-photo');
    if (img) {
        img.removeAttribute('src');
        img.hidden = true;
    }
}

function revokeDetailMaintenancePhoto() {
    detailMaintenanceRequest += 1;
    clearDetailMaintenancePhoto();
}

async function showMaintenancePhotoInDetails(request) {
    const requestId = ++detailMaintenanceRequest;
    const img = document.getElementById('detail-maintenance-photo');
    const empty = document.getElementById('detail-maintenance-photo-empty');
    clearDetailMaintenancePhoto();
    if (!img || !empty) {
        return;
    }
    empty.textContent = 'No photograph on file';
    if (!request.photo || !request.photo.key) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    try {
        const blob = await api.fetchRecordPhoto('maintenance', request._id || request.id);
        if (requestId !== detailMaintenanceRequest) {
            return;
        }
        if (!blob) {
            empty.hidden = false;
            return;
        }
        detailMaintenanceObjectUrl = URL.createObjectURL(blob);
        img.src = detailMaintenanceObjectUrl;
        img.hidden = false;
    } catch (error) {
        if (requestId !== detailMaintenanceRequest) {
            return;
        }
        console.error('Could not load maintenance photograph:', error);
        empty.textContent = 'Photograph could not be loaded';
        empty.hidden = false;
    }
}

async function showMaintenanceDetails(requestId) {
    try {
        const response = await api.getMaintenance(requestId);
        if (!response.success) {
            showMessage('Failed to load maintenance request: ' + response.message, 'error');
            return;
        }
        const request = response.data;
        document.getElementById('detail-maintenance-type').textContent = inventoryLabel(request.type);
        document.getElementById('detail-maintenance-apartment').textContent = request.apartmentNumber || 'Not provided';
        document.getElementById('detail-maintenance-priority').textContent = inventoryLabel(request.priority);
        document.getElementById('detail-maintenance-status').textContent = inventoryLabel(request.status);
        document.getElementById('detail-maintenance-cost').textContent = formatMoney(request.estimatedCost);
        document.getElementById('detail-maintenance-reported').textContent = request.reportedDate ? formatDate(request.reportedDate) : 'Not provided';
        document.getElementById('detail-maintenance-completed').textContent = request.completedDate ? formatDate(request.completedDate) : 'Not completed';
        document.getElementById('detail-maintenance-description').textContent = request.description || 'Not provided';
        document.getElementById('edit-maintenance-from-details-btn').setAttribute('data-request-id', requestId);
        showMaintenancePhotoInDetails(request);
        showModal('maintenance-details-modal');
    } catch (error) {
        console.error('Error loading maintenance request:', error);
        showMessage('Error loading maintenance request: ' + error.message, 'error');
    }
}

async function editMaintenance(requestId) {
    try {
        const response = await api.getMaintenance(requestId);
        if (response.success) {
            const maintenance = response.data;
            
            // Populate form with maintenance data
            document.getElementById('maintenance-apartment').value = maintenance.apartmentNumber;
            document.getElementById('maintenance-type').value = maintenance.type;
            document.getElementById('maintenance-description').value = maintenance.description;
            document.getElementById('maintenance-priority').value = maintenance.priority;
            document.getElementById('maintenance-date').value = maintenance.reportedDate ? maintenance.reportedDate.split('T')[0] : '';
            document.getElementById('maintenance-cost').value = Number.isFinite(Number(maintenance.estimatedCost)) ? maintenance.estimatedCost : '';
            resetRecordPhoto('maintenance');
            
            // Store the maintenance ID for update
            const maintenanceForm = document.getElementById('maintenance-form');
            maintenanceForm.setAttribute('data-edit-id', requestId);
            if (maintenance.photo && maintenance.photo.key) {
                maintenanceForm.setAttribute('data-has-photo', 'true');
                loadRecordPhoto('maintenance', requestId);
            }
            
            // Update modal title and button text for edit mode
            const modal = document.getElementById('maintenance-modal');
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitButton = modal.querySelector('button[type="submit"]');
            
            modalTitle.textContent = 'Edit Maintenance Request';
            submitButton.textContent = 'Update Request';
            
            showModal('maintenance-modal');
        } else {
            showMessage('Failed to load maintenance data: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error loading maintenance data:', error);
        showMessage('Error loading maintenance data: ' + error.message, 'error');
    }
}

async function deleteMaintenance(requestId) {
    if (confirm('Are you sure you want to delete this maintenance request?')) {
        try {
            const response = await api.deleteMaintenance(requestId);
            
            if (response.success) {
                await loadMaintenanceFromAPI();
                renderMaintenanceLists();
                updateDashboard();
                showMessage('Maintenance request deleted successfully', 'success');
            } else {
                showMessage('Failed to delete maintenance request: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting maintenance request:', error);
            showMessage('Error deleting maintenance request: ' + error.message, 'error');
        }
    }
}

function inventoryLabel(value) {
    if (!value) {
        return 'Not provided';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}

let detailInventoryRequest = 0;
let detailInventoryObjectUrl = null;

function clearDetailInventoryPhoto() {
    if (detailInventoryObjectUrl) {
        URL.revokeObjectURL(detailInventoryObjectUrl);
        detailInventoryObjectUrl = null;
    }
    const img = document.getElementById('detail-inventory-photo');
    if (img) {
        img.removeAttribute('src');
        img.hidden = true;
    }
}

function revokeDetailInventoryPhoto() {
    detailInventoryRequest += 1;
    clearDetailInventoryPhoto();
}

async function showInventoryPhotoInDetails(item) {
    const requestId = ++detailInventoryRequest;
    const img = document.getElementById('detail-inventory-photo');
    const empty = document.getElementById('detail-inventory-photo-empty');
    clearDetailInventoryPhoto();
    if (!img || !empty) {
        return;
    }
    empty.textContent = 'No photograph on file';
    if (!item.photo || !item.photo.key) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    try {
        const blob = await api.fetchRecordPhoto('inventory', item._id || item.id);
        if (requestId !== detailInventoryRequest) {
            return;
        }
        if (!blob) {
            empty.hidden = false;
            return;
        }
        detailInventoryObjectUrl = URL.createObjectURL(blob);
        img.src = detailInventoryObjectUrl;
        img.hidden = false;
    } catch (error) {
        if (requestId !== detailInventoryRequest) {
            return;
        }
        console.error('Could not load inventory photograph:', error);
        empty.textContent = 'Photograph could not be loaded';
        empty.hidden = false;
    }
}

async function showInventoryDetails(itemId) {
    try {
        const response = await api.getInventory(itemId);
        if (!response.success) {
            showMessage('Failed to load inventory item: ' + response.message, 'error');
            return;
        }
        const item = response.data;
        const count = Number(item.count) || 0;
        document.getElementById('detail-inventory-type').textContent = item.type || 'Not provided';
        document.getElementById('detail-inventory-category').textContent = inventoryLabel(item.category);
        document.getElementById('detail-inventory-count').textContent = count + (count === 1 ? ' item' : ' items');
        document.getElementById('detail-inventory-apartment').textContent = item.apartmentNumber || 'Not provided';
        document.getElementById('detail-inventory-cost').textContent = formatMoney(item.purchasePrice);
        document.getElementById('detail-inventory-notes').textContent = item.notes || 'Not provided';
        document.getElementById('edit-inventory-from-details-btn').setAttribute('data-item-id', itemId);
        showInventoryPhotoInDetails(item);
        showModal('inventory-details-modal');
    } catch (error) {
        console.error('Error loading inventory item:', error);
        showMessage('Error loading inventory item: ' + error.message, 'error');
    }
}

async function editInventory(itemId) {
    try {
        const response = await api.getInventory(itemId);
        if (response.success) {
            const item = response.data;
            
            // Populate form with inventory data
            document.getElementById('inventory-apartment').value = item.apartmentNumber;
            document.getElementById('inventory-category').value = item.category;
            document.getElementById('item-type').value = item.type;
            document.getElementById('item-count').value = item.count;
            document.getElementById('item-notes').value = item.notes || '';
            document.getElementById('item-cost').value = Number.isFinite(Number(item.purchasePrice)) ? item.purchasePrice : '';
            resetRecordPhoto('inventory');
            
            // Store the item ID for update
            const inventoryForm = document.getElementById('inventory-form');
            inventoryForm.setAttribute('data-edit-id', itemId);
            if (item.photo && item.photo.key) {
                inventoryForm.setAttribute('data-has-photo', 'true');
                loadRecordPhoto('inventory', itemId);
            }
            
            // Update modal title and button text for edit mode
            const modal = document.getElementById('inventory-modal');
            const modalTitle = modal.querySelector('.modal-header h2');
            const submitButton = modal.querySelector('button[type="submit"]');
            
            modalTitle.textContent = 'Edit Inventory Item';
            submitButton.textContent = 'Update Item';
            
            showModal('inventory-modal');
        } else {
            showMessage('Failed to load inventory data: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error loading inventory data:', error);
        showMessage('Error loading inventory data: ' + error.message, 'error');
    }
}

async function deleteInventory(itemId) {
    if (confirm('Are you sure you want to delete this inventory item?')) {
        try {
            const response = await api.deleteInventory(itemId);
            
            if (response.success) {
                await loadInventoryFromAPI();
                renderInventoryGrids();
                updateDashboard();
                showMessage('Inventory item deleted successfully', 'success');
            } else {
                showMessage('Failed to delete inventory item: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            showMessage('Error deleting inventory item: ' + error.message, 'error');
        }
    }
}

// Apartment form handler
async function handleAddApartment(e) {
    e.preventDefault();
    
    try {
        console.log('🏠 Processing apartment form submission...');
        console.log('Event:', e);
        
        // Clear previous validation errors
        console.log('Clearing validation errors...');
        clearValidationErrors();
        console.log('Validation errors cleared.');
        
        const formFields = {
            number: document.getElementById('apartment-number'),
            size: document.getElementById('apartment-size'),
            bedrooms: document.getElementById('apartment-bedrooms'),
            bathrooms: document.getElementById('apartment-bathrooms'),
            monthlyRate: document.getElementById('apartment-monthly-rate'),
            status: document.getElementById('apartment-status')
        };
        
        console.log('Form fields:', formFields);
        console.log('Form values:', {
            number: formFields.number?.value,
            size: formFields.size?.value,
            bedrooms: formFields.bedrooms?.value,
            bathrooms: formFields.bathrooms?.value,
            status: formFields.status?.value
        });
        
        // Validate form fields
        let isValid = true;
        
        const requiredFields = {
            number: 'Apartment Number',
            size: 'Size',
            bedrooms: 'Number of Bedrooms',
            bathrooms: 'Number of Bathrooms',
            monthlyRate: 'Standard Monthly Rate'
        };
        
        for (const [fieldId, fieldName] of Object.entries(requiredFields)) {
            const field = formFields[fieldId];
            const value = field ? String(field.value).trim() : '';
            console.log(`Validating ${fieldName} (${fieldId}):`, {
                fieldExists: !!field,
                rawValue: field?.value,
                stringValue: value,
                isEmpty: !value
            });
            if (!field || !value) {
                console.log(`❌ ${fieldName} validation failed`);
                showFieldError(field, `${fieldName} is required`);
                isValid = false;
            } else {
                console.log(`✅ ${fieldName} validation passed`);
            }
        }

        if (formFields.monthlyRate && String(formFields.monthlyRate.value).trim()) {
            const rate = Number(formFields.monthlyRate.value);
            if (!Number.isFinite(rate) || rate < 0) {
                showFieldError(formFields.monthlyRate, 'Standard monthly rate must be zero or greater');
                isValid = false;
            }
        }
        
        if (!isValid) {
            console.log('❌ Validation failed');
            // Show error in apartment-specific error div
            const generalError = document.getElementById('apartment-form-general-error');
            if (generalError) {
                generalError.textContent = 'Please fix the errors below before submitting';
                generalError.style.display = 'flex';
                generalError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        
        console.log('✅ Validation passed');
        
        const apartmentData = {
            number: formFields.number.value,
            size: parseFloat(formFields.size.value),
            bedrooms: parseInt(formFields.bedrooms.value),
            bathrooms: parseFloat(formFields.bathrooms.value),
            monthlyRate: parseFloat(formFields.monthlyRate.value),
            status: formFields.status.value
        };
        
        console.log('📋 Apartment data:', apartmentData);
        
        // Check if this is an edit operation
        const editId = document.getElementById('add-apartment-form').getAttribute('data-edit-id');
        console.log('Edit ID:', editId);
        
        let response;
        if (editId) {
            console.log('🔄 Updating apartment...');
            // Update existing apartment
            response = await api.updateApartment(editId, apartmentData);
        } else {
            console.log('➕ Creating new apartment...');
            // Create new apartment
            response = await api.createApartment(apartmentData);
        }
        
        console.log('API Response:', response);
        
        if (response.success) {
            console.log('✅ Apartment saved successfully');
            showMessage(editId ? 'Apartment updated successfully' : 'Apartment added successfully', 'success');
            
            // Close modal and reset form
            closeModal('add-apartment-modal');
            document.getElementById('add-apartment-form').reset();
            document.getElementById('add-apartment-form').removeAttribute('data-edit-id');
            
            // Reset modal title and button text
            document.getElementById('apartment-modal-title').textContent = 'Add New Apartment';
            document.getElementById('apartment-submit-btn').textContent = 'Add Apartment';
            
            // Reload apartments data
            await loadApartmentsFromAPI();
            renderApartmentsGrid();
            updateDashboard();
        } else {
            console.error('❌ Failed to save apartment:', response.message);
            showMessage('Failed to save apartment: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error saving apartment:', error);
        showMessage('Error saving apartment: ' + error.message, 'error');
    }
}

// Load apartments from API
async function loadApartmentsFromAPI() {
    try {
        const response = await api.getApartments();
        if (response.success) {
            // Map _id to id for easier reference
            apartments = response.data.map(apt => ({
                ...apt,
                id: apt._id || apt.id
            }));
            console.log(`✅ Loaded ${apartments.length} apartments`);
        }
    } catch (error) {
        console.error('❌ Error loading apartments from API:', error);
    }
}

// Apartment CRUD functions
async function viewApartmentDetails(apartmentId) {
    try {
        const response = await api.getApartment(apartmentId);
        if (response.success) {
            const apartment = response.data;
            
            // Get related data
            const inventoryResponse = await api.getApartmentInventory(apartmentId);
            const maintenanceResponse = await api.getApartmentMaintenance(apartmentId);
            
            const details = `
                <div style="padding: 20px;">
                    <h2>Apartment ${apartment.number} Details</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            <h3>Apartment Information</h3>
                            <p><strong>Size:</strong> ${apartment.size} sq ft</p>
                            <p><strong>Bedrooms:</strong> ${apartment.bedrooms}</p>
                            <p><strong>Bathrooms:</strong> ${apartment.bathrooms}</p>
                            <p><strong>Status:</strong> ${apartment.status}</p>
                        </div>
                        <div>
                            <h3>Current Tenant</h3>
                            ${apartment.currentTenant ? `
                                <p><strong>Name:</strong> ${apartment.currentTenant.name}</p>
                                <p><strong>Phone:</strong> ${apartment.currentTenant.phone}</p>
                                <p><strong>Email:</strong> ${apartment.currentTenant.email}</p>
                            ` : '<p>No tenant assigned</p>'}
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h3>Inventory Items (${inventoryResponse.success ? inventoryResponse.data.length : 0})</h3>
                        ${inventoryResponse.success && inventoryResponse.data.length > 0 ? 
                            inventoryResponse.data.map(item => `<p>• ${item.type} (${item.count})</p>`).join('') : 
                            '<p>No inventory items</p>'
                        }
                    </div>
                    <div style="margin-top: 20px;">
                        <h3>Maintenance Requests (${maintenanceResponse.success ? maintenanceResponse.data.length : 0})</h3>
                        ${maintenanceResponse.success && maintenanceResponse.data.length > 0 ? 
                            maintenanceResponse.data.map(m => `<p>• ${m.description} (${m.status})</p>`).join('') : 
                            '<p>No maintenance requests</p>'
                        }
                    </div>
                </div>
            `;
            
            // For now, show in alert - you can create a proper modal later
            alert(details.replace(/<[^>]*>/g, '')); // Strip HTML for alert
        } else {
            showMessage('Failed to load apartment details: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('Error loading apartment details:', error);
        showMessage('Error loading apartment details: ' + error.message, 'error');
    }
}

async function editApartment(apartmentId) {
    try {
        console.log('📝 Editing apartment:', apartmentId);
        const response = await api.getApartment(apartmentId);
        
        if (response.success) {
            const apartment = response.data;
            console.log('✅ Apartment data loaded:', apartment);
            
            // Clear any existing validation errors
            clearValidationErrors();
            
            // Populate form with apartment data
            document.getElementById('apartment-number').value = apartment.number;
            document.getElementById('apartment-size').value = apartment.size;
            document.getElementById('apartment-bedrooms').value = apartment.bedrooms;
            document.getElementById('apartment-bathrooms').value = apartment.bathrooms;
            document.getElementById('apartment-monthly-rate').value = apartment.monthlyRate === null || apartment.monthlyRate === undefined || apartment.monthlyRate === '' ? '' : apartment.monthlyRate;
            document.getElementById('apartment-status').value = apartment.status;
            
            // Store the apartment ID for update (use _id or id)
            const idToStore = apartment._id || apartment.id;
            document.getElementById('add-apartment-form').setAttribute('data-edit-id', idToStore);
            console.log('💾 Stored edit ID:', idToStore);
            
            // Update modal title and button text for edit mode
            document.getElementById('apartment-modal-title').textContent = 'Edit Apartment';
            document.getElementById('apartment-submit-btn').textContent = 'Update Apartment';
            
            // Show the modal
            showModal('add-apartment-modal');
        } else {
            showMessage('Failed to load apartment data: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('❌ Error loading apartment data:', error);
        showMessage('Error loading apartment data: ' + error.message, 'error');
    }
}

async function deleteApartment(apartmentId) {
    try {
        // Find the apartment to show its number in the confirmation
        const apartment = apartments.find(apt => apt.id === apartmentId || apt._id === apartmentId);
        const apartmentNumber = apartment ? apartment.number : 'this apartment';
        
        if (confirm(`Are you sure you want to delete Apartment ${apartmentNumber}?\n\nThis action cannot be undone.`)) {
            const response = await api.deleteApartment(apartmentId);
            if (response.success) {
                showMessage('Apartment deleted successfully', 'success');
                await loadApartmentsFromAPI();
                renderApartmentsGrid();
                updateDashboard();
            } else {
                showMessage('Failed to delete apartment: ' + response.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error deleting apartment:', error);
        showMessage('Error deleting apartment: ' + error.message, 'error');
    }
}

// Apartment detail functions
async function viewApartmentDetails(apartmentId) {
    try {
        console.log('📋 Viewing apartment details for ID:', apartmentId);
        
        // Find apartment by ID
        const apartment = apartments.find(a => a.id === apartmentId || a._id === apartmentId);
        
        if (!apartment) {
            showMessage('Apartment not found', 'error');
            return;
        }
        
        console.log('🏠 Found apartment:', apartment);
        
        // Get related data
        const tenant = tenants.find(t => t.apartmentNumber === apartment.number);
        const apartmentInventory = inventory.filter(item => item.apartmentNumber === apartment.number);
        const apartmentMaintenance = maintenanceRequests.filter(m => m.apartmentNumber === apartment.number);
        
        // Determine apartment status based on active tenant presence
        const apartmentStatus = isTenantActive(tenant) ? 'occupied' : 'available';
        
        // Populate apartment information
        document.getElementById('detail-apartment-number').textContent = apartment.number;
        document.getElementById('detail-apartment-size').textContent = `${apartment.size} sq ft`;
        document.getElementById('detail-apartment-bedrooms').textContent = apartment.bedrooms;
        document.getElementById('detail-apartment-bathrooms').textContent = apartment.bathrooms;
        document.getElementById('detail-apartment-monthly-rate').textContent = formatMoney(apartment.monthlyRate);
        
        const statusBadge = document.getElementById('detail-apartment-status');
        statusBadge.textContent = apartmentStatus;
        statusBadge.className = `status-badge apartment-status ${apartmentStatus}`;
        
        // Update modal title
        document.getElementById('apartment-details-title').textContent = `Apartment ${apartment.number} - Details`;
        
        // Populate tenant information
        const tenantInfoDiv = document.getElementById('detail-tenant-info');
        if (isTenantActive(tenant)) {
            tenantInfoDiv.innerHTML = `
                <div class="detail-item">
                    <label>Name:</label>
                    <span>${tenant.name}</span>
                </div>
                <div class="detail-item">
                    <label>Phone:</label>
                    <span>${tenant.phone}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${tenant.email}</span>
                </div>
                <div class="detail-item">
                    <label>Check-in:</label>
                    <span>${formatDate(tenant.checkinDate)}</span>
                </div>
                ${tenant.checkoutDate ? `
                <div class="detail-item">
                    <label>Check-out:</label>
                    <span>${formatDate(tenant.checkoutDate)}</span>
                </div>
                ` : ''}
            `;
        } else {
            tenantInfoDiv.innerHTML = '<p class="no-data">No tenant assigned</p>';
        }
        
        // Populate inventory items
        const inventoryDiv = document.getElementById('detail-apartment-inventory');
        if (apartmentInventory.length > 0) {
            inventoryDiv.innerHTML = apartmentInventory.map(item => `
                <div class="inventory-item">
                    <div class="inventory-item-info">
                        <h4>${item.type}</h4>
                        <p>${item.notes || 'No additional notes'}</p>
                    </div>
                    <span class="inventory-item-category">${item.category || 'General'}</span>
                    <span class="inventory-item-count">${item.count} ${item.count === 1 ? 'item' : 'items'}</span>
                </div>
            `).join('');
        } else {
            inventoryDiv.innerHTML = '<p class="no-data">No inventory items for this apartment</p>';
        }
        
        // Populate maintenance requests
        const maintenanceDiv = document.getElementById('detail-apartment-maintenance');
        if (apartmentMaintenance.length > 0) {
            maintenanceDiv.innerHTML = apartmentMaintenance.map(m => `
                <div class="maintenance-item">
                    <div class="maintenance-item-info">
                        <h4>${m.description}</h4>
                        <p>${m.type || 'General'} • Reported: ${formatDate(m.reportedDate)}${m.completedDate ? ` • Completed: ${formatDate(m.completedDate)}` : ''}</p>
                    </div>
                    <span class="maintenance-item-status ${m.status}">${m.status}</span>
                </div>
            `).join('');
        } else {
            maintenanceDiv.innerHTML = '<p class="no-data">No maintenance requests for this apartment</p>';
        }
        
        // Show the modal
        showModal('apartment-details-modal');
        
    } catch (error) {
        console.error('❌ Error viewing apartment details:', error);
        showMessage('Error loading apartment details: ' + error.message, 'error');
    }
}

function viewApartmentInventory(apartmentNumber) {
    // Navigate to inventory page and filter by apartment
    document.querySelector('[data-page="inventory"]').click();
    // You can add filtering logic here
    showMessage(`Showing inventory for Apartment ${apartmentNumber}`, 'info');
}

function viewApartmentMaintenance(apartmentNumber) {
    // Navigate to maintenance page and filter by apartment
    document.querySelector('[data-page="maintenance"]').click();
    // You can add filtering logic here
    showMessage(`Showing maintenance for Apartment ${apartmentNumber}`, 'info');
}

// Utility functions
function billingSummary(source) {
    if (window.tenantBilling) {
        return window.tenantBilling.billingSummary(source);
    }
    return '1 month of rent';
}

function calculateAmountDue(source) {
    if (window.tenantBilling) {
        return window.tenantBilling.calculateTenantAmountDue(source);
    }
    const rent = Number(source.rentAmount) || 0;
    const deposit = Number(source.deposit) || 0;
    const paid = Number(source.amountPaid) || 0;
    return rent + deposit - paid;
}

function formatTenantMoney(amount, currency) {
    const value = Number(amount);
    const safeValue = Number.isFinite(value) ? value : 0;
    const symbol = getCurrencySymbol(currency);
    const formatted = Math.abs(safeValue).toFixed(2);
    return safeValue < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function updateRentAmountLabel() {
    const basis = document.getElementById('rental-basis');
    const label = document.querySelector('label[for="rent-amount"]');
    if (!basis || !label) {
        return;
    }
    if (basis.value === 'daily') {
        label.textContent = 'Rent Amount (per day) *';
    } else if (basis.value === 'monthly') {
        label.textContent = 'Rent Amount (per month) *';
    } else {
        label.textContent = 'Rent Amount *';
    }
}

function updateAmountDue() {
    const dueField = document.getElementById('amount-due');
    if (!dueField) {
        return;
    }
    const source = {
        rentalBasis: document.getElementById('rental-basis') && document.getElementById('rental-basis').value,
        checkinDate: document.getElementById('checkin-date') && document.getElementById('checkin-date').value,
        checkoutDate: document.getElementById('checkout-date') && document.getElementById('checkout-date').value,
        rentAmount: document.getElementById('rent-amount') && document.getElementById('rent-amount').value,
        deposit: document.getElementById('deposit') && document.getElementById('deposit').value,
        amountPaid: document.getElementById('amount-paid') && document.getElementById('amount-paid').value
    };
    const due = calculateAmountDue(source);
    const currency = document.getElementById('currency') && document.getElementById('currency').value;
    dueField.value = formatTenantMoney(due, currency);
    const hint = document.getElementById('amount-due-hint');
    if (hint) {
        const summary = billingSummary(source);
        hint.textContent = source.rentalBasis === 'daily'
            ? summary + '. The first day is due at check-in, then one more day of rent is added each day.'
            : summary + '. The first month is due at check-in. Another month of rent is added on each monthly anniversary.';
    }
}

function formatMoney(amount) {
    if (amount === null || amount === undefined || amount === '') {
        return 'Not set';
    }
    const value = Number(amount);
    if (!Number.isFinite(value)) {
        return 'Not set';
    }
    return `Rs. ${value.toFixed(2)}`;
}

function readCost(input) {
    const raw = input && input.value ? input.value.trim() : '';
    if (raw === '') {
        return 0;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error('Cost must be zero or greater');
    }
    return value;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Helper function to check if a tenant is currently active (not checked out)
function isTenantActive(tenant) {
    if (!tenant) return false;
    
    // If no checkout date, tenant is still active
    if (!tenant.checkoutDate) return true;
    
    // If checkout date exists, check if it's in the future
    const checkoutDate = new Date(tenant.checkoutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    return checkoutDate >= today;
}

function getCurrencySymbol(currency) {
    const symbols = {
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'LKR': 'Rs'
    };
    return symbols[currency] || '$'; // Default to USD if currency is undefined
}

// Form validation helper functions
function clearValidationErrors() {
    // Remove error classes from all form elements
    document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(field => {
        field.classList.remove('error');
    });
    
    // Remove error messages
    document.querySelectorAll('.error-message').forEach(errorMsg => {
        errorMsg.remove();
    });
    
    // Hide general form errors (both tenant and apartment)
    const generalError = document.getElementById('form-general-error');
    if (generalError) {
        generalError.style.display = 'none';
    }
    
    const apartmentGeneralError = document.getElementById('apartment-form-general-error');
    if (apartmentGeneralError) {
        apartmentGeneralError.style.display = 'none';
    }
}

function showFieldError(field, message) {
    if (!field) return;
    
    // Add error class to field
    field.classList.add('error');
    
    // Remove existing error message for this field
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
}

function showGeneralFormError(message) {
    const generalError = document.getElementById('form-general-error');
    if (generalError) {
        generalError.textContent = message;
        generalError.style.display = 'flex';
        
        // Scroll to the error message
        generalError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function validateField(field) {
    if (!field) return;
    
    const fieldId = field.id;
    const value = field.value.trim();
    
    // Clear previous errors
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Required field validation
    const requiredFields = ['tenant-name', 'tenant-phone', 'tenant-email', 'tenant-apartment-number', 'checkin-date', 'rental-basis', 'currency', 'rent-amount'];
    const fieldNames = {
        'tenant-name': 'Full Name',
        'tenant-phone': 'Phone Number',
        'tenant-email': 'Email',
        'tenant-apartment-number': 'Apartment Number',
        'checkin-date': 'Check-in Date',
        'rental-basis': 'Rental Basis',
        'currency': 'Currency',
        'rent-amount': 'Rent Amount'
    };
    
    if (requiredFields.includes(fieldId) && !value) {
        showFieldError(field, `${fieldNames[fieldId]} is required`);
        showGeneralFormError('Please fill in all required fields');
        return false;
    }
    
    // Email validation
    if (fieldId === 'tenant-email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            showGeneralFormError('Please enter a valid email address');
            return false;
        }
    }
    
    // Phone validation (10 digits)
    if (fieldId === 'amount-paid' && value) {
        const paid = Number(value);
        if (!Number.isFinite(paid) || paid < 0) {
            showFieldError(field, 'Amount paid must be zero or greater');
            showGeneralFormError('Amount paid must be zero or greater');
            return false;
        }
    }

    if ((fieldId === 'tenant-phone' || fieldId === 'emergency-contact-phone') && value) {
        const phoneRegex = /^\d{10}$/;
        const cleanPhone = value.replace(/\D/g, ''); // Remove non-digits
        if (!phoneRegex.test(cleanPhone)) {
            showFieldError(field, 'Please enter a valid 10-digit phone number');
            showGeneralFormError('Please enter a valid 10-digit phone number');
            return false;
        }
    }
    
    return true;
}

let nicPhotoObjectUrl = null;
let detailNicObjectUrl = null;
let nicPreviewRequest = 0;

function resetNicPhotoField() {
    nicPreviewRequest += 1;
    const form = document.getElementById('add-tenant-form');
    const input = document.getElementById('tenant-nic-photo');
    if (input) {
        input.value = '';
    }
    if (form) {
        form.removeAttribute('data-remove-nic');
        form.removeAttribute('data-has-nic');
    }
    hideNicPreview();
}

function hideNicPreview() {
    if (nicPhotoObjectUrl) {
        URL.revokeObjectURL(nicPhotoObjectUrl);
        nicPhotoObjectUrl = null;
    }
    const img = document.getElementById('nic-photo-preview');
    const wrap = document.getElementById('nic-photo-preview-wrap');
    if (img) {
        img.removeAttribute('src');
    }
    if (wrap) {
        wrap.hidden = true;
    }
}

function showNicPreview(source) {
    const img = document.getElementById('nic-photo-preview');
    const wrap = document.getElementById('nic-photo-preview-wrap');
    if (!img || !wrap) {
        return;
    }
    if (nicPhotoObjectUrl) {
        URL.revokeObjectURL(nicPhotoObjectUrl);
        nicPhotoObjectUrl = null;
    }
    if (source instanceof Blob) {
        nicPhotoObjectUrl = URL.createObjectURL(source);
        img.src = nicPhotoObjectUrl;
    } else {
        img.src = source;
    }
    wrap.hidden = false;
}

async function loadExistingNicPreview(tenantId) {
    const requestId = ++nicPreviewRequest;
    try {
        const blob = await api.fetchNicPhoto(tenantId);
        if (requestId !== nicPreviewRequest || !blob) {
            return;
        }
        showNicPreview(blob);
    } catch (error) {
        console.error('Could not preview NIC photograph:', error);
    }
}

async function handleRemoveNicPhoto() {
    const form = document.getElementById('add-tenant-form');
    const input = document.getElementById('tenant-nic-photo');
    const hadNewFile = input && input.files && input.files.length > 0;
    if (input) {
        input.value = '';
    }
    if (hadNewFile && form && form.getAttribute('data-has-nic') === 'true' && form.getAttribute('data-remove-nic') !== 'true') {
        hideNicPreview();
        const tenantId = form.getAttribute('data-edit-id');
        if (tenantId) {
            loadExistingNicPreview(tenantId);
        }
        return;
    }
    if (form) {
        form.setAttribute('data-remove-nic', 'true');
    }
    hideNicPreview();
}

const recordPhotoFields = {
    maintenance: {
        formId: 'maintenance-form',
        inputId: 'maintenance-photo',
        wrapId: 'maintenance-photo-preview-wrap',
        imgId: 'maintenance-photo-preview',
        removeId: 'maintenance-photo-remove-btn',
        objectUrl: null,
        requestId: 0
    },
    inventory: {
        formId: 'inventory-form',
        inputId: 'inventory-photo',
        wrapId: 'inventory-photo-preview-wrap',
        imgId: 'inventory-photo-preview',
        removeId: 'inventory-photo-remove-btn',
        objectUrl: null,
        requestId: 0
    }
};

const cardPhotoUrls = new Map();
const cardPhotoGeneration = { maintenance: 0, inventory: 0 };

function bindRecordPhotoField(form, name) {
    const field = recordPhotoFields[name];
    form.addEventListener('change', function(e) {
        if (e.target.id !== field.inputId) {
            return;
        }
        const file = e.target.files && e.target.files[0];
        form.removeAttribute('data-remove-photo');
        if (!file) {
            return;
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            e.target.value = '';
            showFieldError(e.target, 'Photograph must be a JPEG, PNG, or WebP image');
            return;
        }
        showRecordPhoto(name, file);
    });

    form.addEventListener('click', function(e) {
        if (!e.target.closest('#' + field.removeId)) {
            return;
        }
        e.preventDefault();
        handleRemoveRecordPhoto(name);
    });
}

function resetRecordPhoto(name) {
    const field = recordPhotoFields[name];
    if (!field) {
        return;
    }
    field.requestId += 1;
    const form = document.getElementById(field.formId);
    const input = document.getElementById(field.inputId);
    if (input) {
        input.value = '';
    }
    if (form) {
        form.removeAttribute('data-remove-photo');
        form.removeAttribute('data-has-photo');
    }
    hideRecordPhoto(name);
}

function hideRecordPhoto(name) {
    const field = recordPhotoFields[name];
    if (field.objectUrl) {
        URL.revokeObjectURL(field.objectUrl);
        field.objectUrl = null;
    }
    const img = document.getElementById(field.imgId);
    const wrap = document.getElementById(field.wrapId);
    if (img) {
        img.removeAttribute('src');
    }
    if (wrap) {
        wrap.hidden = true;
    }
}

function showRecordPhoto(name, source) {
    const field = recordPhotoFields[name];
    const img = document.getElementById(field.imgId);
    const wrap = document.getElementById(field.wrapId);
    if (!img || !wrap) {
        return;
    }
    if (field.objectUrl) {
        URL.revokeObjectURL(field.objectUrl);
        field.objectUrl = null;
    }
    if (source instanceof Blob) {
        field.objectUrl = URL.createObjectURL(source);
        img.src = field.objectUrl;
    } else {
        img.src = source;
    }
    wrap.hidden = false;
}

async function prepareRecordPhoto(name) {
    const field = recordPhotoFields[name];
    const input = document.getElementById(field.inputId);
    const file = input && input.files && input.files[0];
    if (!file) {
        return null;
    }
    return compressNicPhoto(file, 'Photograph');
}

async function commitRecordPhoto(name, savedId, photoBlob) {
    const field = recordPhotoFields[name];
    const form = document.getElementById(field.formId);
    const removePhoto = form && form.getAttribute('data-remove-photo') === 'true';
    const hadPhoto = form && form.getAttribute('data-has-photo') === 'true';
    if (!savedId) {
        return '';
    }
    try {
        if (photoBlob) {
            await api.uploadRecordPhoto(name, savedId, photoBlob);
        } else if (removePhoto && hadPhoto) {
            await api.deleteRecordPhoto(name, savedId);
        }
        return '';
    } catch (error) {
        console.error('Photograph was not saved:', error);
        return photoBlob
            ? ' The record was saved, but the photograph could not be uploaded. Edit it and try the photo again.'
            : ' The record was saved, but the photograph could not be removed.';
    }
}

async function loadRecordPhoto(name, recordId) {
    const field = recordPhotoFields[name];
    const requestId = ++field.requestId;
    try {
        const blob = await api.fetchRecordPhoto(name, recordId);
        if (requestId !== field.requestId || !blob) {
            return;
        }
        showRecordPhoto(name, blob);
    } catch (error) {
        console.error('Could not preview photograph:', error);
    }
}

async function handleRemoveRecordPhoto(name) {
    const field = recordPhotoFields[name];
    const form = document.getElementById(field.formId);
    const input = document.getElementById(field.inputId);
    const hadNewFile = input && input.files && input.files.length > 0;
    if (input) {
        input.value = '';
    }
    if (hadNewFile && form && form.getAttribute('data-has-photo') === 'true' && form.getAttribute('data-remove-photo') !== 'true') {
        hideRecordPhoto(name);
        const recordId = form.getAttribute('data-edit-id');
        if (recordId) {
            loadRecordPhoto(name, recordId);
        }
        return;
    }
    if (form) {
        form.setAttribute('data-remove-photo', 'true');
    }
    hideRecordPhoto(name);
}

function revokeCardPhotos(kind) {
    for (const [key, url] of cardPhotoUrls) {
        if (key.startsWith(kind + ':')) {
            URL.revokeObjectURL(url);
            cardPhotoUrls.delete(key);
        }
    }
}

async function loadCardPhotos(kind) {
    const generation = ++cardPhotoGeneration[kind];
    revokeCardPhotos(kind);
    const images = Array.from(document.querySelectorAll('img[data-photo-kind="' + kind + '"]'));
    await Promise.all(images.map(async (img) => {
        try {
            const blob = await api.fetchRecordPhoto(kind, img.dataset.photoId);
            if (generation !== cardPhotoGeneration[kind] || !img.isConnected || !blob) {
                return;
            }
            const url = URL.createObjectURL(blob);
            cardPhotoUrls.set(kind + ':' + img.dataset.photoId, url);
            img.src = url;
            img.hidden = false;
        } catch (error) {
            console.error('Could not load photograph:', error);
        }
    }));
}

function compressNicPhoto(file, label = 'NIC photograph') {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
        return Promise.reject(new Error(label + ' must be a JPEG, PNG, or WebP image'));
    }
    if (file.size > 12 * 1024 * 1024) {
        return Promise.reject(new Error(label + ' must be under 12 MB'));
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function() {
            const maxEdge = 1600;
            const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            const tryQuality = function(quality) {
                canvas.toBlob(function(blob) {
                    if (!blob) {
                        reject(new Error('Could not read that photo. Use a JPEG, PNG, or WebP image.'));
                        return;
                    }
                    if (blob.size > 3.5 * 1024 * 1024 && quality > 0.5) {
                        tryQuality(quality - 0.15);
                        return;
                    }
                    if (blob.size > 4 * 1024 * 1024) {
                        reject(new Error(label + ' is still too large. Try a smaller image.'));
                        return;
                    }
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            tryQuality(0.82);
        };
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that photo. Use a JPEG, PNG, or WebP image.'));
        };
        img.src = url;
    });
}

let detailNicRequest = 0;

function clearDetailNicPhoto() {
    if (detailNicObjectUrl) {
        URL.revokeObjectURL(detailNicObjectUrl);
        detailNicObjectUrl = null;
    }
    const img = document.getElementById('detail-nic-photo');
    if (img) {
        img.removeAttribute('src');
        img.hidden = true;
    }
}

function revokeDetailNicPhoto() {
    detailNicRequest += 1;
    clearDetailNicPhoto();
}

async function showNicPhotoInDetails(tenant) {
    const requestId = ++detailNicRequest;
    const img = document.getElementById('detail-nic-photo');
    const empty = document.getElementById('detail-nic-empty');
    clearDetailNicPhoto();
    if (!img || !empty) {
        return;
    }
    empty.textContent = 'No NIC photograph on file';
    if (!tenant.nicPhoto || !tenant.nicPhoto.key) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    try {
        const blob = await api.fetchNicPhoto(tenant._id || tenant.id);
        if (requestId !== detailNicRequest) {
            return;
        }
        if (!blob) {
            empty.hidden = false;
            return;
        }
        detailNicObjectUrl = URL.createObjectURL(blob);
        img.src = detailNicObjectUrl;
        img.hidden = false;
    } catch (error) {
        if (requestId !== detailNicRequest) {
            return;
        }
        console.error('Could not load NIC photograph:', error);
        empty.textContent = 'NIC photograph could not be loaded';
        empty.hidden = false;
    }
}

function showModal(modalId) {
    console.log(`🔓 Opening modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log(`✅ Modal ${modalId} opened successfully`);
        
        // Check if form exists in modal
        const form = modal.querySelector('form');
        if (form) {
            console.log(`✅ Form found in modal:`, form.id);
        } else {
            console.error(`❌ No form found in modal ${modalId}`);
        }
    } else {
        console.error(`❌ Modal ${modalId} not found!`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';

        if (modalId === 'tenant-details-modal') {
            revokeDetailNicPhoto();
        }
        if (modalId === 'inventory-details-modal') {
            revokeDetailInventoryPhoto();
        }
        if (modalId === 'maintenance-details-modal') {
            revokeDetailMaintenancePhoto();
        }
        
        // Reset form if it's a form modal
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            form.removeAttribute('data-edit-id');
            
            // Reset modal title and button text for add tenant modal
            if (modalId === 'add-tenant-modal') {
                const modalTitle = modal.querySelector('.modal-header h2');
                const submitButton = modal.querySelector('button[type="submit"]');
                
                modalTitle.textContent = 'Add New Tenant';
                submitButton.textContent = 'Add Tenant';
                resetNicPhotoField();
            }
            
            // Reset modal title and button text for maintenance modal
            if (modalId === 'maintenance-modal') {
                const modalTitle = modal.querySelector('.modal-header h2');
                const submitButton = modal.querySelector('button[type="submit"]');
                
                modalTitle.textContent = 'New Maintenance Request';
                submitButton.textContent = 'Submit Request';
                resetRecordPhoto('maintenance');
            }
            
            // Reset modal title and button text for inventory modal
            if (modalId === 'inventory-modal') {
                const modalTitle = modal.querySelector('.modal-header h2');
                const submitButton = modal.querySelector('button[type="submit"]');
                
                modalTitle.textContent = 'Add Inventory Item';
                submitButton.textContent = 'Add Item';
                resetRecordPhoto('inventory');
            }
            
            // Reset modal title and button text for apartment modal
            if (modalId === 'add-apartment-modal') {
                const modalTitle = modal.querySelector('#apartment-modal-title');
                const submitButton = modal.querySelector('#apartment-submit-btn');
                
                if (modalTitle) modalTitle.textContent = 'Add New Apartment';
                if (submitButton) submitButton.textContent = 'Add Apartment';
                
                // Clear validation errors
                clearValidationErrors();
            }
        }
    }
}

function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = `message message-${type}`;
        messageContainer.style.display = 'block';
        
        // Reset transform for animation
        messageContainer.style.transform = 'translateX(100%)';
        
        // Trigger animation
        setTimeout(() => {
            messageContainer.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
}

// Note: Functions are now accessed through event delegation instead of global window assignment
