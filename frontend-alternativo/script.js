document.addEventListener('DOMContentLoaded', () => {
    const products = [
        {
            id: "item-1",
            title: "Premium Widget",
            description: "High-quality widget with advanced features",
            quantity: 1,
            unit_price: 800
        },
        {
            id: "item-2",
            title: "Standard Gadget",
            description: "Reliable gadget for everyday use",
            quantity: 1,
            unit_price: 900
        }
    ];

    const productsContainer = document.getElementById('products-container');

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <h2>${product.title}</h2>
            <p class="description">${product.description}</p>
            <p>Quantity: ${product.quantity}</p>
            <p class="price">Price: $${product.unit_price.toFixed(2)}</p>
            <button class="purchase-button" data-product-id="${product.id}">Buy</button>
        `;

        const purchaseButton = card.querySelector('.purchase-button');
        purchaseButton.addEventListener('click', () => handlePurchase(product));

        return card;
    }

    function renderProducts() {
        products.forEach(product => {
            productsContainer.appendChild(createProductCard(product));
        });
    }

    const API_URL = 'https://mi-backend-prueba.onrender.com';


    async function handlePurchase(product) {
        console.log('Attempting to purchase:', product);
        try {
            const response = await fetch('${API_URL}/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ product }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment session');
            }

            const data = await response.json();
            console.log('Payment URL received:', data.paymentUrl);
            window.location.href = data.paymentUrl; // Redirect to Vexor payment page

        } catch (error) {
            console.error('Error during purchase:', error);
            alert('Error during purchase: ' + error.message);
        }
    }

    renderProducts();
});
