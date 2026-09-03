// Aurora Tenant Management System - Animations and Enhanced Interactions

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    setupScrollAnimations();
    setupHoverEffects();
    setupFormAnimations();
    setupLoadingStates();
});

// Initialize all animations
function initializeAnimations() {
    // Animate stat cards on load
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animate dashboard cards
    const dashboardCards = document.querySelectorAll('.dashboard-card');
    dashboardCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 500 + (index * 200));
    });
}

// Setup scroll animations
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('.stat-card, .dashboard-card, .maintenance-item, .inventory-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });
}

// Setup hover effects
function setupHoverEffects() {
    // Card hover effects
    const cards = document.querySelectorAll('.stat-card, .dashboard-card, .maintenance-item, .inventory-item');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
            this.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn-primary, .action-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Setup form animations
function setupFormAnimations() {
    const formInputs = document.querySelectorAll('input, select, textarea');
    
    formInputs.forEach(input => {
        // Focus animation
        input.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.borderColor = '#4AA0BA';
            this.style.boxShadow = '0 0 0 3px rgba(74, 160, 186, 0.1)';
        });
        
        // Blur animation
        input.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            this.style.boxShadow = 'none';
        });
        
        // Input animation
        input.addEventListener('input', function() {
            if (this.value.length > 0) {
                this.style.borderColor = '#98C454';
            } else {
                this.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            }
        });
    });
}

// Setup loading states
function setupLoadingStates() {
    // Add loading animation to buttons when clicked
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.form && this.form.checkValidity()) {
                this.innerHTML = '<span class="loading"></span> Processing...';
                this.disabled = true;
                
                // Re-enable after a delay (simulating processing)
                setTimeout(() => {
                    this.innerHTML = this.getAttribute('data-original-text') || 'Submit';
                    this.disabled = false;
                }, 2000);
            }
        });
    });
}

// Enhanced modal animations
function enhanceModalAnimations() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        const content = modal.querySelector('.modal-content');
        
        // Modal open animation
        modal.addEventListener('show', function() {
            content.style.transform = 'scale(0.8) translateY(-50px)';
            content.style.opacity = '0';
            
            setTimeout(() => {
                content.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                content.style.transform = 'scale(1) translateY(0)';
                content.style.opacity = '1';
            }, 10);
        });
        
        // Modal close animation
        modal.addEventListener('hide', function() {
            content.style.transition = 'all 0.3s ease';
            content.style.transform = 'scale(0.8) translateY(-50px)';
            content.style.opacity = '0';
        });
    });
}

// Table row animations
function animateTableRows() {
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    
    tableRows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.5s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        }, index * 100);
    });
}

// Status badge animations
function animateStatusBadges() {
    const badges = document.querySelectorAll('.status-badge');
    
    badges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        badge.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) rotate(0deg)';
        });
    });
}

// Navigation link animations
function enhanceNavigationAnimations() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(5deg)';
            }
        });
        
        link.addEventListener('mouseleave', function() {
            const icon = this.querySelector('i');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
}

// Search input animations
function enhanceSearchAnimations() {
    const searchInput = document.getElementById('tenant-search');
    
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 3px rgba(74, 160, 186, 0.1)';
        });
        
        searchInput.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
        });
    }
}

// Tab button animations
function enhanceTabAnimations() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Animate the active button
            this.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

// Message animations
function animateMessage(messageElement) {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        messageElement.style.transition = 'all 0.5s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto-remove animation
    setTimeout(() => {
        messageElement.style.transition = 'all 0.3s ease';
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }, 3000);
}

// Enhanced showMessage function
function enhancedShowMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Position the message
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '100px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '3000';
    messageDiv.style.minWidth = '300px';
    
    document.body.appendChild(messageDiv);
    animateMessage(messageDiv);
}

// Page transition animations
function animatePageTransition(targetPage) {
    const currentPage = document.querySelector('.page.active');
    const newPage = document.getElementById(targetPage);
    
    if (currentPage && newPage) {
        // Fade out current page
        currentPage.style.transition = 'all 0.3s ease';
        currentPage.style.opacity = '0';
        currentPage.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            currentPage.classList.remove('active');
            
            // Fade in new page
            newPage.classList.add('active');
            newPage.style.opacity = '0';
            newPage.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                newPage.style.transition = 'all 0.3s ease';
                newPage.style.opacity = '1';
                newPage.style.transform = 'translateY(0)';
            }, 10);
        }, 300);
    }
}

// Enhanced form validation animations
function enhanceFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const invalidInputs = form.querySelectorAll(':invalid');
            
            invalidInputs.forEach(input => {
                input.style.animation = 'shake 0.5s ease';
                
                setTimeout(() => {
                    input.style.animation = '';
                }, 500);
            });
        });
    });
}

// Initialize all enhanced animations
document.addEventListener('DOMContentLoaded', function() {
    enhanceModalAnimations();
    animateStatusBadges();
    enhanceNavigationAnimations();
    enhanceSearchAnimations();
    enhanceTabAnimations();
    enhanceFormValidation();
    
    // Override the original showMessage function
    window.showMessage = enhancedShowMessage;
    
    // Override page transition
    const originalHandleNavigation = window.handleNavigation;
    if (originalHandleNavigation) {
        window.handleNavigation = function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            animatePageTransition(targetPage);
            
            // Update active navigation link
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        };
    }
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    @keyframes slideInFromRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .animate-pulse {
        animation: pulse 2s infinite;
    }
    
    .animate-slide-in {
        animation: slideInFromRight 0.5s ease;
    }
`;
document.head.appendChild(style);

// Export enhanced functions
window.enhancedShowMessage = enhancedShowMessage;
window.animatePageTransition = animatePageTransition;
window.animateTableRows = animateTableRows;
