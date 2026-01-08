/**
 * Blackshot Toy Store - Central Data Store
 * Handles all interactions with localStorage
 */

const PRODUCTS_KEY = 'blackshot_products';
const REVIEWS_KEY = 'blackshot_reviews';

const DEFAULT_PRODUCTS = [
    {
        id: 1700000000001,
        name: "Speedster Racing Car",
        description: "High-speed remote control car with durable tires and rechargeable battery.",
        price: 1499,
        oldPrice: 1999,
        category: "Remote Control",
        image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=800&auto=format&fit=crop",
        specifications: ["Material: Plastic", "Battery: 1200mAh", "Speed: 15km/h"]
    },
    {
        id: 1700000000002,
        name: "Cuddly Brown Bear",
        description: "Ultra-soft plush toy perfect for hugging. Safe for all ages.",
        price: 899,
        oldPrice: 1299,
        category: "Soft Toys",
        image: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=800&auto=format&fit=crop",
        specifications: ["Size: 40cm", "Material: Cotton", "Washable: Yes"]
    },
    {
        id: 1700000000003,
        name: "Mega Building Blocks",
        description: "500-piece building set to unleash creativity. Compatible with major brands.",
        price: 2499,
        oldPrice: 3499,
        category: "Educational",
        image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=800&auto=format&fit=crop",
        specifications: ["Pieces: 500", "Material: ABS", "Age: 5+"]
    },
    {
        id: 1700000000004,
        name: "Superhero Action Figure",
        description: "Poseable action figure with accessories. A must-have for collectors.",
        price: 799,
        oldPrice: 999,
        category: "Action Figures",
        image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?q=80&w=800&auto=format&fit=crop",
        specifications: ["Height: 15cm", "Points of Articulation: 10", "Material: PVC"]
    }
];

const Store = {
    init() {
        if (!localStorage.getItem(PRODUCTS_KEY)) {
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem('blackshot_cart')) {
            localStorage.setItem('blackshot_cart', '[]');
            localStorage.setItem('cartCount', '0');
        }
        if (!localStorage.getItem(REVIEWS_KEY)) {
            localStorage.setItem(REVIEWS_KEY, JSON.stringify([]));
        }
        // Initialize Default Categories
        if (!localStorage.getItem('blackshot_categories')) {
            localStorage.setItem('blackshot_categories', JSON.stringify([
                'Action Figures', 'Dolls', 'Board Games', 'Outdoor', 'Educational', 'Soft Toys', 'Arts & Crafts'
            ]));
        }
        // Initialize Banners
        // Initialize Banners (Force defaults if empty)
        let banners = [];
        try {
            banners = JSON.parse(localStorage.getItem('blackshot_banners') || '[]');
        } catch (e) {
            banners = [];
        }

        if (banners.length === 0) {
            const defaultBanners = [
                { id: 1, image: 'images/hero.png', link: '#', section: 'hero' },
                { id: 2, image: 'images/promo1.png', link: '#', section: 'middle' },
                { id: 3, image: 'images/promo2.png', link: '#', section: 'middle' }
            ];
            localStorage.setItem('blackshot_banners', JSON.stringify(defaultBanners));
        }
    },

    // --- Products ---
    getProducts() {
        return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    },

    getProduct(id) {
        const products = this.getProducts();
        return products.find(p => p.id == id);
    },

    addProduct(product) {
        const products = this.getProducts();
        const newProduct = {
            id: Date.now(),
            ...product
        };
        products.push(newProduct);
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        return newProduct;
    },

    updateProduct(id, updatedData) {
        const products = this.getProducts();
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updatedData };
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
            return products[index];
        }
        return null;
    },

    deleteProduct(id) {
        let products = this.getProducts();
        products = products.filter(p => p.id != id);
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    },

    // --- Reviews ---
    getReviews(productId) {
        const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
        return reviews.filter(r => r.productId == productId);
    },

    addReview(review) {
        const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
        const newReview = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            ...review
        };
        reviews.push(newReview);
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
        return newReview;
    },

    // --- Cart Management ---
    getCart() {
        return JSON.parse(localStorage.getItem('blackshot_cart') || '[]');
    },

    addToCart(productId, quantity = 1) {
        const cart = this.getCart();
        const product = this.getProduct(productId);

        if (!product) return null;

        const existingItem = cart.find(item => item.productId == productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity
            });
        }

        localStorage.setItem('blackshot_cart', JSON.stringify(cart));
        return cart;
    },

    removeFromCart(productId) {
        let cart = this.getCart();
        cart = cart.filter(item => item.productId != productId);
        localStorage.setItem('blackshot_cart', JSON.stringify(cart));
        return cart;
    },

    updateCartQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.find(item => item.productId == productId);

        if (item) {
            if (quantity <= 0) {
                return this.removeFromCart(productId);
            }
            item.quantity = quantity;
            localStorage.setItem('blackshot_cart', JSON.stringify(cart));
        }

        return cart;
    },

    clearCart() {
        localStorage.setItem('blackshot_cart', JSON.stringify([]));
        localStorage.setItem('cartCount', '0');
    },

    getCartTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    getCartCount() {
        const cart = this.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    },

    // --- UPI Settings ---
    saveUpiSettings(upiId, qrCodeImage) {
        localStorage.setItem('upi_id', upiId);
        localStorage.setItem('upi_qr_code', qrCodeImage);
    },

    getUpiSettings() {
        return {
            upiId: localStorage.getItem('upi_id') || '',
            qrCode: localStorage.getItem('upi_qr_code') || ''
        };
    },

    // --- User Authentication ---
    getUsers() {
        return JSON.parse(localStorage.getItem('blackshot_users') || '[]');
    },

    registerUser(name, email, password) {
        const users = this.getUsers();
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already exists' };
        }
        const newUser = {
            id: 'U' + Date.now(),
            name,
            email,
            password
        };
        users.push(newUser);
        localStorage.setItem('blackshot_users', JSON.stringify(users));
        this.setCurrentUser(newUser);
        return { success: true, user: newUser };
    },

    validateUser(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            this.setCurrentUser(user);
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password' };
    },

    checkUserExists(email) {
        const users = this.getUsers();
        return !!users.find(u => u.email === email);
    },

    setCurrentUser(user) {
        // Don't save password in session
        const { password, ...safeUser } = user;
        localStorage.setItem('blackshot_current_user', JSON.stringify(safeUser));
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('blackshot_current_user') || 'null');
    },

    logoutUser() {
        localStorage.removeItem('blackshot_current_user');
    },

    // --- Pending Orders (Updated for User Link) ---
    addPendingOrder(orderData) {
        const orders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        const currentUser = this.getCurrentUser();

        const newOrder = {
            orderId: 'BKS' + Date.now(),
            userId: currentUser ? currentUser.id : 'guest', // Link order to user
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        orders.push(newOrder);
        localStorage.setItem('pending_orders', JSON.stringify(orders));
        return newOrder;
    },

    getUserOrders(userId) {
        const orders = this.getPendingOrders();
        // Return orders for specific user, sorted by date desc
        return orders.filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    getPendingOrders() {
        return JSON.parse(localStorage.getItem('pending_orders') || '[]');
    },

    approveOrder(orderId) {
        const orders = this.getPendingOrders();
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = 'approved';
            order.approvedAt = new Date().toISOString();
            localStorage.setItem('pending_orders', JSON.stringify(orders));
        }
        return order;
    },

    cancelOrder(orderId) {
        const orders = this.getPendingOrders();
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = 'cancelled';
            order.cancelledAt = new Date().toISOString();
            localStorage.setItem('pending_orders', JSON.stringify(orders));
        }
        return order;
    },

    updateOrderStatus(orderId, newStatus, customStatus = '') {
        const orders = this.getPendingOrders();
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
            order.status = newStatus === 'custom' ? customStatus : newStatus;
            order.updatedAt = new Date().toISOString();
            localStorage.setItem('pending_orders', JSON.stringify(orders));
        }
        return order;
    },

    getAllOrders() {
        return this.getPendingOrders();
    },

    getOrdersByStatus(status) {
        const orders = this.getPendingOrders();
        return orders.filter(o => o.status === status);
    },

    // --- Support Tickets ---
    addTicket(ticketData) {
        const tickets = JSON.parse(localStorage.getItem('blackshot_tickets') || '[]');
        const currentUser = this.getCurrentUser();

        const newTicket = {
            id: 'TKT' + Date.now(),
            userId: currentUser ? currentUser.id : 'guest',
            userName: currentUser ? currentUser.name : ticketData.name,
            userEmail: currentUser ? currentUser.email : ticketData.email,
            ...ticketData,
            status: 'open', // open, resolved
            createdAt: new Date().toISOString()
        };
        tickets.push(newTicket);
        localStorage.setItem('blackshot_tickets', JSON.stringify(tickets));
        return newTicket;
    },

    getTickets() {
        return JSON.parse(localStorage.getItem('blackshot_tickets') || '[]');
    },

    getUserTickets(userId) {
        return this.getTickets().filter(t => t.userId === userId);
    },

    resolveTicket(ticketId) {
        const tickets = this.getTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'resolved';
            localStorage.setItem('blackshot_tickets', JSON.stringify(tickets));
            return true;
        }
        return false;
    },

    // --- Policies ---
    getPolicies() {
        const policies = JSON.parse(localStorage.getItem('blackshot_policies'));
        if (policies) return policies;

        // Default Content (Initial Setup)
        return {
            shipping: `
                <div class="policy-section">
                    <h2><i class="fas fa-truck" style="color: var(--primary-bg);"></i> 1. Shipping Overview</h2>
                    <p>At Blackshot, we strive to deliver your orders as quickly and safely as possible. We partner with reliable courier services to ensure your toys arrive in perfect condition.</p>
                </div>
                <div class="policy-section">
                    <h2><i class="fas fa-clock" style="color: var(--primary-bg);"></i> 2. Processing Time</h2>
                    <p>All orders are processed within <strong>1-2 business days</strong>. Orders are not shipped or delivered on weekends or holidays.</p>
                </div>
                <div class="policy-section">
                    <h2><i class="fas fa-shipping-fast" style="color: var(--primary-bg);"></i> 3. Shipping Rates</h2>
                    <ul>
                        <li><strong>Standard Shipping (5-7 days):</strong> Free for orders over ₹999.</li>
                        <li><strong>Express Shipping (2-3 days):</strong> ₹150 flat rate.</li>
                    </ul>
                </div>`,
            refund: `
                <div class="video-alert">
                    <h3><i class="fas fa-video"></i> MANDATORY REQUIREMENT</h3>
                    <p><strong>An Unboxing Video is COMPULSORY for any Return or Refund Request.</strong></p>
                    <p style="margin-bottom: 0;">Please record a clear video while opening the package. The video must show the shipping label and the condition of the product clearly.</p>
                </div>
                <div class="policy-section">
                    <h2><i class="fas fa-undo"></i> 1. Return Window</h2>
                    <p>We accept returns up to <strong>7 days</strong> after delivery.</p>
                </div>
                <div class="policy-section">
                    <h2><i class="fas fa-check-circle"></i> 2. Eligibility</h2>
                    <p>To be eligible for a return, your item must be unused and in the same condition that you received it.</p>
                </div>`
        };
    },

    savePolicies(policies) {
        localStorage.setItem('blackshot_policies', JSON.stringify(policies));
        return { success: true };
    },

    // --- Security Settings ---
    getAdminPassword() {
        return localStorage.getItem('admin_password') || 'admin123';
    },

    setAdminPassword(newPassword) {
        localStorage.setItem('admin_password', newPassword);
    },

    get2FAStatus() {
        return localStorage.getItem('admin_2fa_enabled') === 'true';
    },

    enable2FA(secret) {
        localStorage.setItem('admin_2fa_enabled', 'true');
        localStorage.setItem('admin_2fa_secret', secret);
    },

    disable2FA() {
        localStorage.setItem('admin_2fa_enabled', 'false');
        localStorage.removeItem('admin_2fa_secret');
        localStorage.removeItem('admin_2fa_backup_codes');
    },

    get2FASecret() {
        return localStorage.getItem('admin_2fa_secret') || '';
    },

    save2FABackupCodes(codes) {
        localStorage.setItem('admin_2fa_backup_codes', JSON.stringify(codes));
    },

    get2FABackupCodes() {
        return JSON.parse(localStorage.getItem('admin_2fa_backup_codes') || '[]');
    },

    // --- Category Management ---
    getCategories() {
        let cats = JSON.parse(localStorage.getItem('blackshot_categories') || '[]');
        // Migration: Convert old strings to objects
        if (cats.length > 0 && typeof cats[0] === 'string') {
            cats = cats.map(c => ({
                id: Date.now() + Math.random(),
                name: c,
                image: 'https://placehold.co/150x150?text=' + c
            }));
            localStorage.setItem('blackshot_categories', JSON.stringify(cats));
        }
        return cats;
    },

    addCategory(name, image) {
        const categories = this.getCategories();
        if (!categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            categories.push({
                id: Date.now(),
                name: name,
                image: image || 'https://placehold.co/150x150?text=' + name
            });
            localStorage.setItem('blackshot_categories', JSON.stringify(categories));
            return true;
        }
        return false;
    },

    deleteCategory(id) {
        let categories = this.getCategories();
        // Handle deletion by ID or Name (for backward compatibility if needed)
        categories = categories.filter(c => c.id != id && c.name !== id);
        localStorage.setItem('blackshot_categories', JSON.stringify(categories));
    },

    // --- Banner Management ---
    getBanners() {
        return JSON.parse(localStorage.getItem('blackshot_banners') || '[]');
    },

    addBanner(image, link, section) {
        const banners = this.getBanners();
        const newBanner = {
            id: Date.now(),
            image,
            link,
            section // 'hero' or 'middle'
        };
        banners.push(newBanner);
        localStorage.setItem('blackshot_banners', JSON.stringify(banners));
        return newBanner;
    },

    deleteBanner(id) {
        let banners = this.getBanners();
        banners = banners.filter(b => b.id != id);
        localStorage.setItem('blackshot_banners', JSON.stringify(banners));
    },

    // --- Utils ---
    formatPrice(price) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(price);
    }
};

// Initialize on load
Store.init();
