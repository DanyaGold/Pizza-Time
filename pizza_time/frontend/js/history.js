// Настройки API — замените URL на ваши актуальные эндпоинты
const ORDERS_API_URL = 'http://127.0.0.1:8000/api/orders/history/'; // Эндпоинт для получения истории заказов

// Словарь для красивого отображения статусов и цветов Bootstrap
const STATUS_MAPPING = {
    'pending': { text: 'Создан', class: 'bg-warning text-dark' },
    'paid': { text: 'Оплачен', class: 'bg-success' },
    'cooking': { text: 'Готовится', class: 'bg-info text-dark' },
    'delivery': { text: 'В пути', class: 'bg-primary' },
    'completed': { text: 'Доставлен', class: 'bg-secondary' },
    'canceled': { text: 'Отменен', class: 'bg-danger' }
};

// Хелпер для форматирования даты (например: 22 мая 2026 г., 14:05)
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Хелпер для красивого вывода валюты
function formatPrice(price) {
    return parseFloat(price).toLocaleString('ru-RU') + ' ₽';
}

// УНИВЕРСАЛЬНЫЙ FETCH (С обновлением токена)
async function authenticatedFetch(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    let response = await fetch(url, options);

    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            const refreshResponse = await fetch(`${authUrl}token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                localStorage.setItem('accessToken', data.access);
                options.headers['Authorization'] = `Bearer ${data.access}`;
                return await fetch(url, options);
            }
        }
        logout();
    }
    return response;
}

// Главная функция загрузки истории
async function loadOrdersHistory() {
    const spinner = document.getElementById('loading-spinner');
    const emptyMessage = document.getElementById('empty-orders');
    const accordion = document.getElementById('ordersAccordion');

    try {
        // Используем вашу функцию authenticatedFetch, которая сама прокидывает токены
        const response = await authenticatedFetch(ORDERS_API_URL);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить историю заказов');
        }

        const orders = await response.json();
        spinner.classList.add('d-none'); // Прячем спиннер

        if (orders.length === 0) {
            emptyMessage.classList.remove('d-none'); // Показываем "Заказов нет"
            return;
        }

        // Перебираем полученные заказы и строим HTML
        orders.forEach((order, index) => {
            const statusInfo = STATUS_MAPPING[order.status] || { text: order.status, class: 'bg-dark' };
            const formattedDate = formatDate(order.created_at);
            const formattedTotal = formatPrice(order.total_price);

            // 1. ПРОВЕРКА НА ОПЛАТУ: если заказ новый, создаем кнопку
            let paymentButtonHtml = '';
            if (order.status === 'pending' && order.payment_url) {
                // Делаем кнопку побольше (btn-md) и добавляем отступ сверху (mt-4)
                paymentButtonHtml = `
                    <div class="text-end mt-4 border-top pt-3">
                        <span class="text-muted me-3 small">Заказ ожидает оплаты:</span>
                        <a href="${order.payment_url}" target="_blank" class="btn btn-success rounded-pill px-4">
                            <i class="bi bi-credit-card-2-front me-2"></i> Оплатить заказ
                        </a>
                    </div>
                `;
            }

            // Генерируем строки таблицы товаров внутри этого заказа
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `
                    <tr>
                        <td>${item.product_name}</td>
                        <td class="text-center">${item.quantity} шт.</td>
                        <td class="text-end text-nowrap">${formatPrice(item.price)}</td>
                    </tr>
                `;
            });

            // Создаем элемент аккордеона (Элемент №${order.id})
            const orderItemHtml = `
                    <div class="accordion-item mb-3 border rounded shadow-sm">
                        <h2 class="accordion-header" id="heading-${order.id}">
                            <!-- Вернули простую и чистую шапку Bootstrap без абсолютных позиций -->
                            <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${order.id}" aria-expanded="false" aria-controls="collapse-${order.id}">
                                <!-- Главный контейнер строки -->
                                <div class="d-flex flex-column flex-sm-row w-100 justify-content-between align-items-sm-center pe-4">
                                    
                                    <!-- Левая часть: Номер заказа и дата -->
                                    <div class="mb-2 mb-sm-0">
                                        <strong class="fs-5">Заказ №${order.id}</strong>
                                        <span class="text-muted d-block small">${formattedDate}</span>
                                    </div>
                                    
                                    <!-- Правая часть: Статус и Цена (Они больше не влияют друг на друга) -->
                                    <div class="d-flex align-items-center justify-content-between justify-content-sm-end gap-3" style="min-width: 240px;">
                                        <!-- Задаем фиксированную ширину бэджу (например, 110px), чтобы он не сжимался -->
                                        <span class="badge ${statusInfo.class} py-2 rounded-pill text-truncate" style="width: 110px; text-align: center; display: inline-block;">
                                            ${statusInfo.text}
                                        </span>
                                        <!-- Цена выравнивается по правому краю и имеет фиксированный отступ от статуса -->
                                        <span class="fw-bold fs-5 text-nowrap text-end flex-grow-1" style="min-width: 90px;">
                                            ${formattedTotal}
                                        </span>
                                    </div>

                                </div>
                            </button>
                        </h2>
                        <div id="collapse-${order.id}" class="accordion-collapse collapse" aria-labelledby="heading-${order.id}" data-bs-parent="#ordersAccordion">
                            <div class="accordion-body bg-white pt-0">
                                <hr class="mt-0">
                                <div class="table-responsive">
                                    <table class="table table-borderless align-middle mb-0">
                                        <thead>
                                            <tr class="text-muted small border-bottom">
                                                <th>Наименование</th>
                                                <th class="text-center">Кол-во</th>
                                                <th class="text-end">Цена</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- КНОПКА ОПЛАТЫ ТЕПЕРЬ ТУТ: Она плавно появляется внизу при раскрытии -->
                                ${paymentButtonHtml}
                            </div>
                        </div>
                    </div>
                `;
                
                accordion.insertAdjacentHTML('beforeend', orderItemHtml);
            });

    } catch (error) {
        console.error(error);
        spinner.classList.add('d-none');
        accordion.innerHTML = `
            <div class="alert alert-danger text-center" role="alert">
                <i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i>
                Ошибка при загрузке данных. Пожалуйста, обновите страницу или попробуйте позже.
            </div>
        `;
    }
}

// Запускаем скрипт сразу после загрузки DOM дерева страницы
document.addEventListener('DOMContentLoaded', loadOrdersHistory);