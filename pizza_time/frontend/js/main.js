const API_URL = 'http://127.0.0.1:8000/api/';
const pizzaUrl = `${API_URL}pizza/`;

// Элементы интерфейса
const list = document.getElementById('pizza-list');
const searchInput = document.getElementById('search');
const orderingSelect = document.getElementById('ordering');
const btnLoad = document.getElementById('load');
const btnNext = document.getElementById('next');
const btnPrev = document.getElementById('prev');
const categoryContainer = document.getElementById('categories');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const resetBtn = document.getElementById('reset-filters');
const pageInfo = document.getElementById('page-info');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');

const cartContainer = document.getElementById('cart-aside-container');
const pizzaContent = document.getElementById('pizza-content');
const cartBtn = document.getElementById('cart-button');
const historyBtn = document.getElementById('history-btn');

const token = localStorage.getItem('accessToken');

// Состояние
let currentPage = 1;
let currentCategory = '';
let nextPage = null;
let prevPage = null;


// --- ЛОГИКА ЗАГРУЗКИ ---

async function loadPizzas(url = pizzaUrl) {
    try {
        const res = await fetch(url);
        const data = await res.json();

        nextPage = data.next;
        prevPage = data.previous;

        // Управление состоянием кнопок пагинации (Bootstrap стили)
        btnNext.parentElement.classList.toggle('disabled', !nextPage);
        btnPrev.parentElement.classList.toggle('disabled', !prevPage);

        const urlObj = new URL(url, window.location.origin);
        currentPage = Number(urlObj.searchParams.get('page')) || 1;
        pageInfo.textContent = currentPage;

        renderPizzas(data.results);
    } catch (err) {
        list.innerHTML = '<div class="alert alert-danger">Ошибка загрузки данных</div>';
    }
}

// --- РЕНДЕР ПИЦЦ ---

function renderPizzas(pizzas) {
    list.innerHTML = '';

    pizzas.forEach(pizza => {
        const col = document.createElement('div');
        col.className = 'col'; // Элемент сетки (row-cols-md-2 из HTML)

        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0">
                <img src="${pizza.image}" class="card-img-top p-2 rounded-4" alt="${pizza.name}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title h6 fw-bold">${pizza.name}</h5>
                    <p class="card-text text-muted small flex-grow-1">${pizza.description}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="fw-bold text-primary">${pizza.price} ₽</span>
                        <button class="btn btn-primary btn-sm rounded-pill px-3 buy-btn">Заказать</button>
                    </div>
                </div>
            </div>
        `;

        col.querySelector('.buy-btn').addEventListener('click', () => addToCart(pizza.id));
        list.appendChild(col);
    });
}

// --- КОРЗИНА ---
async function fetchCart() {
    try {
        const response = await fetch(`${API_URL}cart/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        
        // В твоем DRF сериализаторе товары лежат в data.items
        renderCart(data.items, data.get_total_price); 
    } catch (error) {
        console.error('Ошибка при загрузке корзины:', error);
    }
}


function renderCart(items=[], totalPrice) {
    const countElement = document.getElementById('cart-count');
    console.log(items.length);
    if (countElement) {
        countElement.textContent = items.length;
        countElement.classList.toggle('d-none', items.length === 0);
    }

    if (items.length === 0) {
        cartContainer.classList.add('d-none');
        return;
    }

    cartContainer.classList.remove('d-none');
    cartItemsContainer.innerHTML = '';

    items.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-group-item d-flex align-items-center justify-content-between border-0 border-bottom px-0 py-2';

        // ВАЖНО: используем item.product, так как CartItemSerializer вложенный
        itemDiv.innerHTML = `
            <div class="d-flex align-items-center overflow-hidden">
                <img src="${item.product.image}" class="rounded shadow-sm flex-shrink-0" width="45" height="45">
                <div class="ms-2 text-truncate">
                    <div class="fw-bold small text-truncate" style="max-width: 130px;">${item.product.name}</div>
                    <div class="small text-muted">${item.product.price} ₽ x ${item.quantity}</div>
                </div>
            </div>
            <button class="btn btn-link text-danger p-0 ms-2 remove-btn">
                <i class="bi bi-x-circle">×</i>
            </button>
        `;

        // Удаляем теперь не по индексу массива, а по ID записи в базе (item.id)
        itemDiv.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.id));
        cartItemsContainer.appendChild(itemDiv);
    });

    totalPriceElement.textContent = totalPrice;
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function buildUrl() {
    const params = new URLSearchParams();
    if (searchInput.value) params.append('search', searchInput.value);
    if (orderingSelect.value) params.append('ordering', orderingSelect.value);
    if (currentCategory) params.append('category__slug', currentCategory);
    if (minPriceInput.value) params.append('price__gte', minPriceInput.value);
    if (maxPriceInput.value) params.append('price__lte', maxPriceInput.value);

    return `${pizzaUrl}?${params.toString()}`;
}

async function addToCart(pizzaId) {
    const token = localStorage.getItem('accessToken');
    
    await fetch(`${API_URL}cartitem/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            product_id: pizzaId, // Отправляем ID пиццы
            quantity: 1          // И количество
        })
    });

    // После того как сервер сохранил пиццу, 
    // запрашиваем обновленный список и перерисовываем
    fetchCart(); 
}

async function removeFromCart(itemId) {
    await fetch(`${API_URL}cartitem/${itemId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    fetchCart(); // Просто перекачиваем корзину заново после удаления
}

// --- СОБЫТИЯ ---

btnLoad.addEventListener('click', () => loadPizzas(buildUrl()));

resetBtn.addEventListener('click', () => {
    currentCategory = '';
    searchInput.value = '';
    minPriceInput.value = '';
    maxPriceInput.value = '';
    orderingSelect.value = 'name';

    document.querySelectorAll('#categories button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === "") btn.classList.add('active');
    });

    loadPizzas(pizzaUrl);
});

categoryContainer.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    currentCategory = button.dataset.category;
    document.querySelectorAll('#categories button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
});

checkoutBtn.addEventListener('click', () => {
    window.location.href = 'cart.html';
});

cartBtn.addEventListener('click', () => {
    window.location.href = 'cart.html';
});

cartBtn.addEventListener('click', () => {
    window.location.href = 'cart.html';
});

historyBtn.addEventListener('click', () => {
    window.location.href = 'history.html';
});

btnNext.addEventListener('click', (e) => {
    e.preventDefault();
    if (nextPage) loadPizzas(nextPage);
});

btnPrev.addEventListener('click', (e) => {
    e.preventDefault();
    if (prevPage) loadPizzas(prevPage);
});



// Старт
loadPizzas();
fetchCart();