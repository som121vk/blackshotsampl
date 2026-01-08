/**
 * Blackshot Admin Logic
 */

let isEditing = false;
let editingId = null;

// --- Authentication ---
// --- Authentication ---
function checkLogin() {
    const pwd = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('login-error');

    // 1. Check Password
    if (pwd === Store.getAdminPassword()) {
        errorMsg.style.display = 'none';

        // 2. Check if 2FA is enabled
        if (Store.get2FAStatus()) {
            // Show 2FA Step
            document.getElementById('login-step-1').style.display = 'none';
            document.getElementById('login-step-2').style.display = 'block';
            document.getElementById('admin-2fa-code').focus();
        } else {
            // No 2FA, Login directly
            completeLogin();
        }
    } else {
        errorMsg.textContent = 'Incorrect Password';
        errorMsg.style.display = 'block';
    }
}

function verifyLogin2FA() {
    const code = document.getElementById('admin-2fa-code').value;
    const errorMsg = document.getElementById('login-error');

    // Simple 6-digit check (In production, verify TOTP against secret)
    // Also check against backup codes logic if needed

    // For this mock implementation, we accept any 6-digit code OR a valid backup code
    const isValidFormat = /^\d{6}$/.test(code);
    const backupCodes = Store.get2FABackupCodes();
    const isBackupCode = backupCodes.includes(code);

    if (isValidFormat || isBackupCode) {
        completeLogin();

        // If backup code used, remove it (optional simulation)
        if (isBackupCode) {
            alert('Backup code used!');
        }
    } else {
        errorMsg.textContent = 'Invalid 2FA Code';
        errorMsg.style.display = 'block';
    }
}

function completeLogin() {
    document.getElementById('login-overlay').style.display = 'none';
    sessionStorage.setItem('isAdmin', 'true');
    loadProducts();
    loadUpiSettings();
    loadBanners();
    loadCategories();
    loadPendingOrders();
    updatePendingCount();
    switchTab('products');
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    location.reload();
}

// Check session on load
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isAdmin') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
        loadProducts();
        loadCategories();
        loadBanners();
        loadUpiSettings();
        loadPendingOrders();
        updatePendingCount();
        switchTab('products');
    }
});

// --- Tab Management ---
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.style.display = 'none';
    });

    // Reset all tab buttons (Add new tabs here)
    document.querySelectorAll('#tab-products, #tab-upi, #tab-orders, #tab-history, #tab-security, #tab-categories, #tab-design, #tab-help, #tab-policies').forEach(btn => {
        btn.style.background = 'transparent';
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    document.getElementById(`tab-${tabName}`).style.background = 'rgba(255,255,255,0.2)';

    // Load specific data
    if (tabName === 'history') loadOrderHistory();
    if (tabName === 'security') load2FAStatus();
    if (tabName === 'categories') loadCategories();
    if (tabName === 'design') loadBanners();
    if (tabName === 'help') loadTickets();
    if (tabName === 'policies') loadPolicies();
}

// Update pending orders count
function updatePendingCount() {
    const orders = Store.getPendingOrders().filter(o => o.status === 'pending');
    document.getElementById('pending-count').textContent = orders.length;
}

// --- Product Management ---
function loadProducts() {
    const tbody = document.getElementById('product-table-body');
    const products = Store.getProducts();

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image}" class="thumbnail" alt="img"></td>
            <td>${p.name}</td>
            <td>${Store.formatPrice(p.price)}</td>
            <td>${p.category}</td>
            <td>
                <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="editProduct(${p.id})">Edit</button>
                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem; border-color: #dc3545; color: #dc3545;" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- Modal & Form ---
function openModal() {
    document.getElementById('product-modal').style.display = 'flex';
    document.getElementById('product-form').reset();
    document.getElementById('modal-title').textContent = 'Add Product';
    isEditing = false;
    editingId = null;
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// Edit Mode
window.editProduct = function (id) {
    const product = Store.getProduct(id);
    if (!product) return;

    openModal();
    document.getElementById('modal-title').textContent = 'Edit Product';
    isEditing = true;
    editingId = id;

    // Populate fields
    document.getElementById('p-name').value = product.name;
    document.getElementById('p-category').value = product.category;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-old-price').value = product.oldPrice || '';
    document.getElementById('p-desc').value = product.description;
    document.getElementById('p-image-url').value = product.image.startsWith('data:') ? '' : product.image;
    document.getElementById('p-specs').value = product.specifications ? product.specifications.join(', ') : '';
};

// Delete
window.deleteProduct = function (id) {
    if (confirm('Are you sure you want to delete this product?')) {
        Store.deleteProduct(id);
        loadProducts();
    }
};

// Form Submission
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('p-name').value;
    const category = document.getElementById('p-category').value;
    const price = Number(document.getElementById('p-price').value);
    const oldPrice = Number(document.getElementById('p-old-price').value);
    const description = document.getElementById('p-desc').value;
    const specs = document.getElementById('p-specs').value.split(',').map(s => s.trim()).filter(s => s);

    // Image Handling (File > URL)
    let image = document.getElementById('p-image-url').value;
    const fileInput = document.getElementById('p-image-file');

    if (fileInput.files && fileInput.files[0]) {
        try {
            image = await toBase64(fileInput.files[0]);
        } catch (err) {
            console.error('Image upload failed', err);
            alert('Error processing image');
            return;
        }
    } else if (!image && isEditing) {
        // Keep existing image if no new one provided
        const existing = Store.getProduct(editingId);
        image = existing.image;
    } else if (!image) {
        image = 'https://placehold.co/600x400?text=No+Image';
    }

    const productData = {
        name, category, price, oldPrice, description, image, specifications: specs
    };

    if (isEditing) {
        Store.updateProduct(editingId, productData);
    } else {
        Store.addProduct(productData);
    }

    closeModal();
    loadProducts();
});

// Helper: File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// --- UPI Settings ---
function loadUpiSettings() {
    const settings = Store.getUpiSettings();
    const preview = document.getElementById('current-qr-preview');

    if (settings.upiId) {
        document.getElementById('upi-id-input').value = settings.upiId;
    }

    if (settings.qrCode) {
        preview.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 10px; font-weight: 600;">Current QR Code:</p>
                <img src="${settings.qrCode}" alt="Current QR" style="max-width: 200px; border: 2px solid #ddd; border-radius: 8px;">
            </div>
        `;
        // Make file input optional if QR exists
        document.getElementById('upi-qr-upload').required = false;
    }
}

document.getElementById('upi-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const upiId = document.getElementById('upi-id-input').value;
    const fileInput = document.getElementById('upi-qr-upload');

    let qrCode = Store.getUpiSettings().qrCode; // Keep existing if not updated

    if (fileInput.files && fileInput.files[0]) {
        try {
            qrCode = await toBase64(fileInput.files[0]);
        } catch (err) {
            alert('Error processing QR code image');
            return;
        }
    }

    if (!qrCode) {
        alert('Please upload a QR code image');
        return;
    }

    Store.saveUpiSettings(upiId, qrCode);
    alert('UPI settings saved successfully!');
    loadUpiSettings();
});

// --- Pending Orders ---
function loadPendingOrders() {
    const orders = Store.getPendingOrders();
    const container = document.getElementById('pending-orders-list');

    const pendingOrders = orders.filter(o => o.status === 'pending');

    if (pendingOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No pending orders</p>';
        return;
    }

    container.innerHTML = pendingOrders.map(order => `
        <div style="background: #fff; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="margin-bottom: 5px;">Order ID: ${order.orderId}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        ${new Date(order.createdAt).toLocaleString()}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-red);">
                        ${Store.formatPrice(order.total)}
                    </div>
                    <div style="background: #ffc107; color: #000; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-top: 5px;">
                        PENDING
                    </div>
                </div>
            </div>
            
            <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 10px;">Order Items:</h4>
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>${item.name} x${item.quantity}</span>
                        <span>${Store.formatPrice(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 10px;">Customer Details:</h4>
                <p><strong>Name:</strong> ${order.shippingInfo.fullname}</p>
                <p><strong>Email:</strong> ${order.shippingInfo.email}</p>
                <p><strong>Phone:</strong> ${order.shippingInfo.phone}</p>
                <p><strong>Address:</strong> ${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}</p>
            </div>
            
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #4caf50;">
                <h4 style="margin-bottom: 10px; color: #2e7d32;">Payment Information:</h4>
                <p><strong>Method:</strong> ${order.paymentMethod}</p>
                <p><strong>UTR/Reference:</strong> <code style="background: white; padding: 2px 8px; border-radius: 4px;">${order.utrNumber}</code></p>
                ${order.screenshot ? `
                    <p style="margin-top: 10px;"><strong>Payment Screenshot:</strong></p>
                    <img src="${order.screenshot}" alt="Payment Proof" style="max-width: 100%; max-height: 400px; border: 2px solid #ddd; border-radius: 8px; margin-top: 10px;">
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-outline" style="border-color: #dc3545; color: #dc3545;" onclick="handleCancelOrder('${order.orderId}')">
                    <i class="fas fa-times"></i> Cancel Order
                </button>
                <button class="btn btn-primary" onclick="handleApproveOrder('${order.orderId}')">
                    <i class="fas fa-check"></i> Approve Order
                </button>
            </div>
        </div>
    `).join('');
}

window.handleApproveOrder = function (orderId) {
    if (confirm('Approve this order? Customer will be notified.')) {
        Store.approveOrder(orderId);
        alert('Order approved successfully!');
        loadPendingOrders();
        updatePendingCount();
    }
};

window.handleCancelOrder = function (orderId) {
    if (confirm('Cancel this order? This action cannot be undone.')) {
        Store.cancelOrder(orderId);
        alert('Order cancelled!');
        loadPendingOrders();
        updatePendingCount();
    }
};

// --- Order History ---
function loadOrderHistory() {
    const filter = document.getElementById('status-filter').value;
    const container = document.getElementById('order-history-list');

    let orders = Store.getAllOrders();

    // Filter out pending orders
    orders = orders.filter(o => o.status !== 'pending');

    // Apply status filter
    if (filter !== 'all') {
        orders = orders.filter(o => o.status === filter);
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No orders found</p>';
        return;
    }

    container.innerHTML = orders.map(order => {
        const statusColors = {
            'approved': '#4caf50',
            'cancelled': '#f44336',
            'returned': '#ff9800',
            'failed': '#9e9e9e',
            'damaged': '#e91e63'
        };

        const color = statusColors[order.status] || '#2196f3';

        return `
        <div style="background: #fff; border: 2px solid ${color}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="margin-bottom: 5px;">Order ID: ${order.orderId}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        ${new Date(order.createdAt).toLocaleString()}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary-red);">
                        ${Store.formatPrice(order.total)}
                    </div>
                    <div style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-top: 5px; text-transform: uppercase;">
                        ${order.status}
                    </div>
                </div>
            </div>
            
            <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 10px;">Order Items:</h4>
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>${item.name} x${item.quantity}</span>
                        <span>${Store.formatPrice(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="background: var(--bg-light); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 10px;">Customer: ${order.shippingInfo.fullname}</h4>
                <p style="font-size: 0.9rem;">${order.shippingInfo.email} | ${order.shippingInfo.phone}</p>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-outline" style="border-color: var(--primary-red); color: var(--primary-red);" onclick="editOrderStatus('${order.orderId}', '${order.status}')">
                    <i class="fas fa-edit"></i> Edit Status
                </button>
                <button class="btn btn-outline" onclick="viewOrderDetails('${order.orderId}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `}).join('');
}

window.editOrderStatus = function (orderId, currentStatus) {
    const newStatus = prompt(
        `Edit order status for ${orderId}\n\nCurrent Status: ${currentStatus}\n\nEnter new status:\n- approved\n- cancelled\n- returned\n- failed\n- damaged\n- Or type your own custom status`,
        currentStatus
    );

    if (newStatus && newStatus.trim() !== '') {
        const trimmedStatus = newStatus.trim().toLowerCase();
        const validStatuses = ['approved', 'cancelled', 'returned', 'failed', 'damaged'];

        if (validStatuses.includes(trimmedStatus)) {
            Store.updateOrderStatus(orderId, trimmedStatus);
        } else {
            // Custom status
            Store.updateOrderStatus(orderId, 'custom', trimmedStatus);
        }

        alert(`Order status updated to: ${newStatus.trim()}`);
        loadOrderHistory();
    }
};

window.viewOrderDetails = function (orderId) {
    const order = Store.getAllOrders().find(o => o.orderId === orderId);
    if (!order) return;

    const details = `
Order ID: ${order.orderId}
Status: ${order.status}
Date: ${new Date(order.createdAt).toLocaleString()}

Customer:
${order.shippingInfo.fullname}
${order.shippingInfo.email}
${order.shippingInfo.phone}
${order.shippingInfo.address}
${order.shippingInfo.city}, ${order.shippingInfo.state} - ${order.shippingInfo.pincode}

Payment: ${order.paymentMethod}
${order.utrNumber ? 'UTR: ' + order.utrNumber : ''}

Items:
${order.items.map(item => `${item.name} x${item.quantity} - ${Store.formatPrice(item.price * item.quantity)}`).join('\n')}

Total: ${Store.formatPrice(order.total)}
    `;

    alert(details);
};

// --- Security Settings ---
function load2FAStatus() {
    const is2FAEnabled = Store.get2FAStatus();
    const statusText = document.getElementById('2fa-status-text');
    const toggleBtn = document.getElementById('toggle-2fa-btn');

    if (is2FAEnabled) {
        statusText.textContent = '✓ Enabled';
        statusText.style.color = '#4caf50';
        statusText.style.fontWeight = '600';
        toggleBtn.textContent = 'Disable 2FA';
        toggleBtn.className = 'btn btn-outline';
        toggleBtn.style.borderColor = '#dc3545';
        toggleBtn.style.color = '#dc3545';
    } else {
        statusText.textContent = 'Disabled';
        statusText.style.color = '#999';
        toggleBtn.textContent = 'Enable 2FA';
        toggleBtn.className = 'btn btn-primary';
    }
}

// Change Password
document.getElementById('change-password-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const currentPwd = document.getElementById('current-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;

    if (currentPwd !== Store.getAdminPassword()) {
        alert('Current password is incorrect!');
        return;
    }

    if (newPwd !== confirmPwd) {
        alert('New passwords do not match!');
        return;
    }

    if (newPwd.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    Store.setAdminPassword(newPwd);
    alert('Password updated successfully!');
    e.target.reset();
});

// 2FA Toggle
window.toggle2FA = function () {
    const is2FAEnabled = Store.get2FAStatus();

    if (is2FAEnabled) {
        if (confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            Store.disable2FA();
            alert('2FA has been disabled');
            load2FAStatus();
            document.getElementById('2fa-setup').style.display = 'none';
        }
    } else {
        // Show setup
        document.getElementById('2fa-setup').style.display = 'block';
        generate2FASecret();
    }
};

function generate2FASecret() {
    // Generate valid Base32 secret (A-Z, 2-7)
    // Authenticator apps fail if secret contains 0, 1, 8, 9
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate QR code (using a QR code API)
    const qrSection = document.getElementById('2fa-qr-section');
    const otpauthUrl = `otpauth://totp/Blackshot:admin?secret=${secret}&issuer=Blackshot`;

    qrSection.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block;">
            <p style="margin-bottom: 10px; font-weight: 600;">Scan this QR Code</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}" alt="2FA QR Code">
            <p style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">Secret: ${secret}</p>
        </div>
    `;

    window.tempSecret = secret;
};

window.verify2FA = function () {
    const code = document.getElementById('2fa-verify-code').value;

    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }

    // In production, you would verify the code against the secret using TOTP algorithm
    // For this mock implementation, we'll accept any 6-digit code
    if (!/^\d{6}$/.test(code)) {
        alert('Code must be 6 digits');
        return;
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        backupCodes.push(code);
    }

    Store.enable2FA(window.tempSecret);
    Store.save2FABackupCodes(backupCodes);

    // Show backup codes
    const backupSection = document.getElementById('backup-codes-section');
    const backupCodesDiv = document.getElementById('backup-codes');
    backupCodesDiv.innerHTML = backupCodes.map(c => `<div>${c}</div>`).join('');
    backupSection.style.display = 'block';

    alert('2FA enabled successfully! Please save your backup codes.');

    setTimeout(() => {
        document.getElementById('2fa-setup').style.display = 'none';
        load2FAStatus();
    }, 5000);
};

window.cancel2FASetup = function () {
    document.getElementById('2fa-setup').style.display = 'none';
    document.getElementById('2fa-verify-code').value = '';
    document.getElementById('backup-codes-section').style.display = 'none';
};

// --- Category Management ---
function loadCategories() {
    const categories = Store.getCategories();
    const list = document.getElementById('categories-list');

    list.innerHTML = categories.map(cat => `
        <div style="background: white; border-radius: 12px; border: 1px solid #eee; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <div style="height: 120px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${cat.image}" alt="${cat.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="padding: 15px;">
                <h3 style="margin-bottom: 10px; font-size: 1.1rem;">${cat.name}</h3>
                <div style="display: flex; gap: 8px;">
                     <button onclick="addProductToCategory('${cat.name}')" class="btn btn-outline" style="flex: 1; font-size: 0.8rem; padding: 5px;">
                        <i class="fas fa-plus"></i> Add item
                    </button>
                    <button onclick="deleteCategory('${cat.id}')" class="btn btn-outline" style="border-color: #dc3545; color: #dc3545; padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Also populate product modal dropdown
    const dropdown = document.getElementById('p-category');
    if (dropdown) {
        dropdown.innerHTML = categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
    }
}

document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-category-name');
    const fileInput = document.getElementById('cat-image-file');
    const name = input.value.trim();

    let image = null;
    if (fileInput.files && fileInput.files[0]) {
        try {
            image = await window.toBase64(fileInput.files[0]);
        } catch (err) {
            alert('Failed to process image');
            return;
        }
    }

    if (name) {
        const success = Store.addCategory(name, image);
        if (success) {
            input.value = '';
            fileInput.value = '';
            loadCategories();
            alert('Category created successfully!');
        } else {
            alert('Category already exists!');
        }
    }
});

window.deleteCategory = function (id) {
    if (confirm(`Are you sure you want to delete this category?`)) {
        Store.deleteCategory(id);
        loadCategories();
    }
};

window.addProductToCategory = function (catName) {
    switchTab('products');
    openModal();
    // Pre-select the category
    const dropdown = document.getElementById('p-category');
    if (dropdown) {
        dropdown.value = catName;
    }
    // Update modal title
    document.getElementById('modal-title').textContent = `Add Product to ${catName}`;
};

// --- Banner Management ---
function loadBanners() {
    const banners = Store.getBanners();
    const heroList = document.getElementById('hero-banners-list');
    const middleList = document.getElementById('middle-banners-list');

    const heroBanners = banners.filter(b => b.section === 'hero');
    const middleBanners = banners.filter(b => b.section === 'middle');

    const renderBanner = (b) => `
        <div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
            <img src="${b.image}" style="width: 100%; height: 150px; object-fit: cover;">
            <div style="padding: 10px; background: white; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; color: #999;">ID: ${b.id}</span>
                <button onclick="deleteBanner(${b.id})" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.8rem; color: #dc3545; border-color: #dc3545;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    heroList.innerHTML = heroBanners.length ? heroBanners.map(renderBanner).join('') : '<p class="text-muted">No hero banners</p>';
    middleList.innerHTML = middleBanners.length ? middleBanners.map(renderBanner).join('') : '<p class="text-muted">No middle banners</p>';
}

// Helper: File to Base64 (With Compression)
window.toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            // Resize image to max width 1000px to save LocalStorage space
            const maxWidth = 1000;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.7 quality
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = error => reject(error);
});

document.getElementById('hero-banner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('hero-banner-file');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select an image file first.');
        return;
    }

    try {
        const image = await window.toBase64(file);
        Store.addBanner(image, '#', 'hero');
        document.getElementById('hero-banner-form').reset();
        loadBanners();
        alert('Hero banner added successfully!');
    } catch (err) {
        console.error('Hero banner upload failed:', err);
        // Show specific error (e.g., QuotaExceededError)
        alert('Upload Failed: ' + (err.message || err.name || 'Unknown Error') + '\n\nTry a smaller image or clear some browser data.');
    }
});

document.getElementById('middle-banner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('middle-banner-file');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select an image file first.');
        return;
    }

    try {
        const image = await window.toBase64(file);
        Store.addBanner(image, '#', 'middle');
        document.getElementById('middle-banner-form').reset();
        loadBanners();
        alert('Middle banner added successfully!');
    } catch (err) {
        console.error('Middle banner upload failed:', err);
        alert('Upload Failed: ' + (err.message || err.name || 'Unknown Error'));
    }
});

window.deleteBanner = function (id) {
    if (confirm('Delete this banner?')) {
        Store.deleteBanner(id);
        loadBanners();
    }
};

// --- Help & Support ---
function loadTickets() {
    const tickets = Store.getTickets();
    const tbody = document.getElementById('tickets-table-body');

    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No tickets found</td></tr>';
        return;
    }

    // Sort by Date Descending
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    tbody.innerHTML = tickets.map(t => `
        <tr>
            <td>${new Date(t.createdAt).toLocaleDateString()} ${new Date(t.createdAt).toLocaleTimeString()}</td>
            <td>
                <strong>${t.userName || 'Guest'}</strong><br>
                <small>${t.userEmail || ''}</small>
            </td>
            <td>${t.subject}</td>
            <td>${t.message}</td>
            <td><span class="status-badge" style="background:${t.status === 'open' ? '#cfe2ff' : '#d1e7dd'}; color:${t.status === 'open' ? '#0d6efd' : '#198754'}; padding:2px 8px; border-radius:4px;">${t.status}</span></td>
            <td>
                ${t.status === 'open' ? `<button onclick="resolveTicket('${t.id}')" class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;">Mark Resolved</button>` : '<i class="fas fa-check" style="color:green;"></i>'}
            </td>
        </tr>
    `).join('');
}

window.resolveTicket = function (ticketId) {
    if (confirm('Mark this ticket as resolved?')) {
        Store.resolveTicket(ticketId);
        loadTickets();
    }
};

// --- Policies ---
function loadPolicies() {
    const policies = Store.getPolicies();
    document.getElementById('policy-shipping').value = policies.shipping;
    document.getElementById('policy-refund').value = policies.refund;
}

window.savePolicies = function () {
    const shipping = document.getElementById('policy-shipping').value;
    const refund = document.getElementById('policy-refund').value;

    Store.savePolicies({ shipping, refund });
    alert('Policies updated successfully!');
};
