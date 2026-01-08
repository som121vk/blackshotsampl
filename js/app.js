/**
 * Blackshot Toy Store - Main App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartCount();
});

function renderProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    const products = Store.getProducts();

    if (products.length === 0) {
        productList.innerHTML = '<p>No products found. Please add some from the Admin Panel.</p>';
        return;
    }

    productList.innerHTML = products.map(product => `
        <div class="product-card">
            <a href="product.html?id=${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-image">
            </a>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-title">
                    <a href="product.html?id=${product.id}">${product.name}</a>
                </div>
                <div class="price-wrapper">
                    <div>
                        <span class="old-price">${Store.formatPrice(product.oldPrice)}</span>
                        <span class="current-price">${Store.formatPrice(product.price)}</span>
                    </div>
                    <button class="btn-add-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function addToCart(productId) {
    Store.addToCart(productId, 1);
    updateCartCount();

    // Show a nicer notification
    const product = Store.getProduct(productId);
    alert(`✓ ${product.name} added to cart!`);
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        countEl.textContent = Store.getCartCount();
    }
}
