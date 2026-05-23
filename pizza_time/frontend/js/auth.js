const authUrl = `${API_URL}users/`;
const btnLogout = document.getElementById('logout-btn');

// 1. ИНИЦИАЛИЗАЦИЯ МОДАЛОК (Делаем один раз!)
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));

// 2. УНИВЕРСАЛЬНЫЙ FETCH (С обновлением токена)
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

// 3. ЛОГИКА РЕГИСТРАЦИИ
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;
    const passwordConfirm = document.getElementById('reg-pass-confirm').value;
    const email = document.getElementById('reg-email').value;

    const response = await fetch(`${authUrl}register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, password_confirm: passwordConfirm, email })
    });

    if (response.ok) {
        alert('Регистрация успешна!');
        registerModal.hide();
        // Убедись, что фокус ушел с кнопки закрытия на что-то другое (например, на body или кнопку "Войти")
        // document.body.focus();
        loginModal.show(); // Сразу предлагаем войти
    } else {
        alert('Ошибка регистрации. Возможно, имя уже занято.');
    }
});

// 4. ЛОГИКА ВХОДА (ЛОГИН)
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;

    const response = await fetch(`${authUrl}token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('refreshToken', data.refresh);

        loginModal.hide(); // Закрываем красивое окно Bootstrap
        showProfile();     // Обновляем интерфейс
    } else {
        alert('Неверный логин или пароль');
    }
});

// 5. ОТОБРАЖЕНИЕ ПРОФИЛЯ (Интерфейс)
async function showProfile() {
    const response = await authenticatedFetch(`${authUrl}profile/`);

    if (response.ok) {
        const userData = await response.json();
            localStorage.setItem('username', userData.username); // Сохраняем имя
            document.getElementById('user-greeting').textContent = `Привет, ${userData.username}!`;
            updateUI(); // На всякий случай обновляем видимость
        }
}

function updateUI() {
    const token = localStorage.getItem('accessToken');
    const guestContent = document.getElementById('guest-content');
    const userContent = document.getElementById('user-content');
    const userGreeting = document.getElementById('user-greeting');

    if (token) {
        // ПОЛЬЗОВАТЕЛЬ ЗАЛОГИНЕН
        guestContent.classList.add('d-none');     // Скрываем "Войти"
        userContent.classList.remove('d-none');  // Показываем профиль и корзину
        userContent.classList.add('d-flex');     // Возвращаем флекс для выравнивания
        
        // Пытаемся достать имя из сохраненных данных (чтобы не ждать fetch)
        const savedName = localStorage.getItem('username');
        if (savedName) {
            userGreeting.textContent = `Привет, ${savedName}!`;
        }
    } else {
        // ПОЛЬЗОВАТЕЛЬ — ГОСТЬ
        guestContent.classList.remove('d-none');
        userContent.classList.add('d-none');
        userContent.classList.remove('d-flex');
    }
}

// 6. ВЫХОД
btnLogout.addEventListener('click', (e) => {
    e.preventDefault(); // На всякий случай предотвращаем стандартное поведение
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username'); // Если сохранял имя
        
        // Вместо жесткой перезагрузки можно просто вызвать обновление UI
        updateUI(); 
        window.location.href = '/'; 
});

// 7. СТАРТ ПРИ ЗАГРУЗКЕ
window.addEventListener('DOMContentLoaded', () => {
    updateUI();
    if (localStorage.getItem('accessToken')) {
        showProfile();
    }
});