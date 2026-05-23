const API_URL = 'http://127.0.0.1:8000/api/users/profile/'; 
const editBtn = document.getElementById('edit-mode-btn');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editActions = document.getElementById('edit-actions');
const avatarInput = document.getElementById('avatar-input');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const displayAvatar = document.getElementById('display-avatar');

let initialData = {}; // Здесь будем хранить копию данных
// Переносим поиск инпутов внутрь функций или обновляем динамически
let inputs = document.querySelectorAll('#profile-form input');

async function authFetch(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    return await fetch(url, options);
}

// 1. ЗАГРУЗКА ДАННЫХ
async function loadProfile() {
    try {
        const response = await authFetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('display-username').textContent = `@${data.username}`;
            // Если используешь генерацию через массив PROFILE_FIELDS, 
            // то ID должны совпадать с ключами JSON
            document.getElementById('first_name').value = data.first_name || '';
            document.getElementById('last_name').value = data.last_name || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('date_birth').value = data.date_birth.split('T')[0] || '';
            document.getElementById('phone').value = data.phone || '';
            
            const avatarImg = document.getElementById('display-avatar');
        
            if (data.avatar) {
                // Если у пользователя загружено свое фото — показываем его
                avatarImg.src = data.avatar;
            } else {
                // Если фото нет — генерируем аватарку по имени
                // Используем имя и фамилию для инициалов
                const nameForAvatar = data.first_name || data.username || "User";
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random&color=fff&size=128`;
            }
            
            // Сохраняем текущий аватар в initialData для отмены
            initialData.avatar = avatarImg.src;
        } else if (response.status === 401) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error("Критическая ошибка сети:", err);
    }
}

// 2. РЕЖИМЫ (READ / EDIT)
function setEditMode(isEdit) {
    inputs = document.querySelectorAll('#profile-form input'); // Обновляем список инпутов
    
    // Переключаем основную кнопку "Редактировать"
    editBtn.classList.toggle('d-none', isEdit);
    changeAvatarBtn.classList.toggle('d-none', !isEdit);
    
    // Переключаем ВЕСЬ блок с кнопками "Сохранить" и "Отмена"
    // Мы объявляли его выше как editActions
    if (editActions) {
        editActions.classList.toggle('d-none', !isEdit);
    }

    inputs.forEach(input => {
        if (input.id === 'username') return; // Логин обычно не редактируется

        if (isEdit) {
            input.removeAttribute('readonly');
            input.classList.replace('form-control-plaintext', 'form-control');
            input.classList.remove('border-bottom');
        } else {
            input.setAttribute('readonly', true);
            input.classList.replace('form-control', 'form-control-plaintext');
            input.classList.add('border-bottom');
        }
    });
}


changeAvatarBtn.addEventListener('click', () => avatarInput.click());

avatarInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => displayAvatar.src = e.target.result;
        reader.readAsDataURL(file);
    }
});

// Нажатие на "Редактировать"
editBtn.addEventListener('click', () => {
    // 1. Запоминаем текущие значения полей
    inputs.forEach(input => {
        initialData[input.id] = input.value;
    });
    
    // 2. Включаем режим правки
    setEditMode(true);
});

// Нажатие на "Отмена"
cancelBtn.addEventListener('click', () => {
    // 1. Возвращаем старые значения из initialData
    inputs.forEach(input => {
        if (initialData[input.id] !== undefined) {
            input.value = initialData[input.id];
        }
    });
    document.getElementById('display-avatar').src = initialData.avatar;
    // 2. Выключаем режим правки
    setEditMode(false);
});

// 3. СОХРАНЕНИЕ (Один обработчик!)
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedData = {
        first_name: document.getElementById('first_name').value,
        last_name: document.getElementById('last_name').value,
        email: document.getElementById('email').value,
        date_birth: document.getElementById('date_birth').value || null, // Django любит null вместо ""
        phone: document.getElementById('phone').value,
    };

    try {
        const response = await authFetch(API_URL, {
            method: 'PATCH',
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert('Профиль успешно обновлен!');
            setEditMode(false);
        } else {
            const errorData = await response.json();
            console.log("Ошибки от Django:", errorData);
            alert('Ошибка при обновлении. Проверь консоль.');
        }
    } catch (err) {
        alert('Сервер недоступен. Проверь терминал Django.');
    }
});

// 4. УДАЛЕНИЕ
document.getElementById('delete-profile-btn').addEventListener('click', async () => {
    if (confirm('Удалить профиль навсегда?')) {
        const response = await authFetch(API_URL, { method: 'DELETE' });
        if (response.ok) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    }
});

loadProfile();