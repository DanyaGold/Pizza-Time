const API_URL = 'http://127.0.0.1:8000/api/'; 

// Инициализируем события после загрузки документа
document.addEventListener('DOMContentLoaded', () => {
    // Вешаем клик на кнопку ОДИН раз, прямо при загрузке страницы
    const orderBtn = document.getElementById('order-btn');
    console.log("DOM загрузился!");
    console.log("Результат поиска кнопки:", orderBtn);
    if (orderBtn) {
        orderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Кнопка нажата, ура!');
            checkout();
        });
    }

    // Запускаем первичную загрузку данных корзины
    fetchCartData();
});

async function fetchCartData() {
    const cartTableBody = document.querySelector('tbody');
    const totalPriceElements = document.querySelectorAll('.text-primary.fs-5, .col-lg-4 span:last-child');
    const orderBtn = document.getElementById('order-btn');

    try {
        // Замени URL на свой, если он отличается
        const response = await fetch(`${API_URL}cart/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        const data = await response.json();
        console.log("Данные корзины от сервера:", data); // Для отладки

        // 1. Очищаем таблицу перед заполнением
        cartTableBody.innerHTML = '';

        // 2. Если корзина пуста
        if (data.items.length === 0) {
            cartTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="mb-3">
                            <i class="bi bi-cart-x" style="font-size: 3rem; color: #dee2e6;"></i>
                        </div>
                        <h5 class="text-muted">Ваша корзина пуста</h5>
                        <p class="small text-secondary">Похоже, вы еще не выбрали свою идеальную пиццу.</p>
                        <a href="index.html" class="btn btn-primary btn-sm mt-2 px-4 rounded-pill">
                            Перейти к выбору пиццы
                        </a>
                    </td>
                </tr>
            `;
            document.getElementById('total-price-display').innerText = `0 ₽`;

            // Если есть кнопка "Оформить заказ", её тоже стоит заблокировать
            if (orderBtn) orderBtn.disabled = true;
            
            return;
        }
        
        if (orderBtn) orderBtn.disabled = false;

        // 3. Заполняем товары
        data.items.forEach(item => {
            const pizza = item.product;
            const row = `
                <tr id="item-${item.id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${pizza.image}" alt="${pizza.name}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
                            <div>
                                <h6 class="mb-0">${pizza.name}</h6>
                                <small class="text-muted">${pizza.category}</small>
                            </div>
                        </div>
                    </td>
                    <td>${pizza.price} ₽</td>
                    <td style="width: 100px;">
                        <input type="number" class="form-control form-control-sm" 
                               value="${item.quantity}" 
                               onchange="updateQuantity(${item.id}, this.value)">
                    </td>
                    <td class="fw-bold">${(pizza.price * item.quantity).toFixed(2)} ₽</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            cartTableBody.innerHTML += row;
        });

        // 4. Обновляем итоговую цену
        document.getElementById('total-price-display').innerText = `${data.get_total_price} ₽`;

    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
    }
}

// Функция удаления товара
async function deleteItem(itemId) {
    try {
        const response = await fetch(`${API_URL}cartitem/${itemId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Важно для Django!
            }
        });

        if (response.ok) {
            fetchCartData(); // Перерисовываем корзину
        }
    } catch (error) {
        console.error('Ошибка при удалении:', error);
    }
}

async function updateQuantity(itemId, newQuantity) {
    const token = localStorage.getItem('accessToken');
    
    // Проверка, чтобы не отправить отрицательное число или ноль
    if (newQuantity < 1) {
        deleteItem(itemId); // Если количество меньше 1, удаляем товар
        fetchCartData(); // Возвращаем старое значение в интерфейс
        return;
    }

    try {
        const response = await fetch(`${API_URL}cartitem/${itemId}/`, {
            method: 'PATCH', // Обновляем только одно поле
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantity: parseInt(newQuantity) // Отправляем новое количество
            })
        });

        if (response.ok) {
            fetchCartData(); // Перерисовываем корзину, чтобы обновилась итоговая цена
        }
    } catch (error) {
        console.error('Ошибка обновления:', error);
    }
}

async function checkout() {
    const token = localStorage.getItem('accessToken');
    console.log("Отправка запроса на создание заказа...");
    
    try {
        const response = await fetch(`${API_URL}orders/create/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Успешный ответ. Перенаправление на:", data.payment_url);
            if (data.payment_url) {
                window.location.href = data.payment_url; 
            } else {
                alert("Ошибка: бэкенд не вернул ссылку на оплату");
            }
        } else {
            console.error("Ошибка сервера при создании заказа:", response.status);
            alert("Ошибка при оформлении заказа");
        }
    } catch (error) {
        console.error("Сетевая ошибка при оформлении:", error);
    }
}