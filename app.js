const AppState = {
    tasks: [],
    currentTaskIndex: -1,
    currentRound: 1,
    timeLeft: 0,
    timerId: null,
    isRunning: false,
    isBreakTime: false,
    totalXP: 0,
    statRoundsCount: 0,
    statTasksCompleted: 0,
    autoStartBreak: false,
    autoStartSession: false,
    editingTaskIndex: -1,
    needsRender: false,
    expectedEndTime: 0 // متغير أساسي مضاف لضبط دقة الوقت اللحظي في الخلفية
};

const elements = {
    sidebar: document.getElementById('mainSidebar'),
    navItems: Array.from(document.querySelectorAll('.nav-item')),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    skipBtn: document.getElementById('skipBtn'),
    startBtn: document.getElementById('startBtn'),
    addMinuteBtn: document.getElementById('addMinuteBtn'),
    resetBtn: document.getElementById('resetBtn'),
    taskNameInput: document.getElementById('taskNameInput'),
    taskMinInput: document.getElementById('taskMinInput'),
    taskRoundsInput: document.getElementById('taskRoundsInput'),
    taskSubmitBtn: document.getElementById('taskSubmitBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    pendingTaskList: document.getElementById('pendingTaskList'),
    completedTaskList: document.getElementById('completedTaskList'),
    sessionCounter: document.getElementById('sessionCounter'),
    timerRing: document.getElementById('timerRing'),
    timerLabel: document.getElementById('timerLabel'),
    timerDisplay: document.getElementById('timerDisplay'),
    plantSpeech: document.getElementById('plantSpeech'),
    userLevelDisplay: document.getElementById('userLevelDisplay'),
    xpDisplay: document.getElementById('xpDisplay'),
    xpBar: document.getElementById('xpBar'),
    statUser: document.getElementById('statUser'),
    statRounds: document.getElementById('statRounds'),
    statTasks: document.getElementById('statTasks'),
    pendingTasksCount: document.getElementById('pendingTasksCount'),
    completedTasksCount: document.getElementById('completedTasksCount'),
    colorPicker: document.getElementById('colorPicker'),
    bgPicker: document.getElementById('bgPicker'),
    autoBreakToggle: document.getElementById('autoBreakToggle'),
    autoSessionToggle: document.getElementById('autoSessionToggle'),
    sidebarToggle: document.getElementById('sidebarToggle')
};

function init() {
    bindEvents();
    loadData();
    requestRender();
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function bindEvents() {
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    elements.navItems.forEach(item => item.addEventListener('click', () => switchView(item.dataset.view, item)));
    elements.fullscreenBtn.addEventListener('click', toggleFullscreenTimer);
    elements.skipBtn.addEventListener('click', skipRound);
    elements.startBtn.addEventListener('click', toggleTimer);
    elements.addMinuteBtn.addEventListener('click', addMinute);
    elements.resetBtn.addEventListener('click', resetTimer);
    elements.taskSubmitBtn.addEventListener('click', handleTaskFormSubmit);
    elements.cancelEditBtn.addEventListener('click', cancelTaskEdit);
    elements.colorPicker.addEventListener('click', handleColorClick);
    elements.bgPicker.addEventListener('click', handleBgClick);
    elements.autoBreakToggle.addEventListener('change', event => toggleAutoBreak(event.target.checked));
    elements.autoSessionToggle.addEventListener('change', event => toggleAutoSession(event.target.checked));
    elements.pendingTaskList.addEventListener('click', handleTaskActionClick);
    elements.completedTaskList.addEventListener('click', handleTaskActionClick);
    document.addEventListener('keydown', handleKeyboardActivation);
}

function handleKeyboardActivation(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (target.matches('.color-dot, .bg-box')) {
        event.preventDefault();
        target.click();
    }
}

function toggleSidebar() {
    if (window.innerWidth > 1024) elements.sidebar.classList.toggle('collapsed');
}

function switchView(viewId, navElement) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    elements.navItems.forEach(item => item.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    navElement.classList.add('active');
}

function setThemeColor(color, element) {
    document.documentElement.style.setProperty('--theme-color', color);
    elements.colorPicker.querySelectorAll('.color-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.color === color));
    if (element) element.classList.add('active');
    saveData();
}

function setThemeBg(mainBg, panelBg, element) {
    document.documentElement.style.setProperty('--bg-main', mainBg);
    document.documentElement.style.setProperty('--bg-panel', panelBg);
    elements.bgPicker.querySelectorAll('.bg-box').forEach(box => box.classList.toggle('active', box.dataset.main === mainBg && box.dataset.panel === panelBg));
    if (element) element.classList.add('active');
    saveData();
}

function handleColorClick(event) {
    const dot = event.target.closest('.color-dot');
    if (!dot) return;
    setThemeColor(dot.dataset.color, dot);
}

function handleBgClick(event) {
    const box = event.target.closest('.bg-box');
    if (!box) return;
    setThemeBg(box.dataset.main, box.dataset.panel, box);
}

function updateThemeSelector() {
    const currentColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    const currentBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim();
    const currentPanel = getComputedStyle(document.documentElement).getPropertyValue('--bg-panel').trim();
    elements.colorPicker.querySelectorAll('.color-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.color === currentColor));
    elements.bgPicker.querySelectorAll('.bg-box').forEach(box => box.classList.toggle('active', box.dataset.main === currentBg && box.dataset.panel === currentPanel));
}

function toggleFullscreenTimer() {
    const container = document.querySelector('.app-container');
    const icon = document.querySelector('.btn-fullscreen i');
    container.classList.toggle('fullscreen-timer');
    icon.className = container.classList.contains('fullscreen-timer') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
}

function playSoftBell() {
    // صوت التنبيه معطل لأن ميزة الصوت أُزلت.
}

function requestRender() {
    if (AppState.needsRender) return;
    AppState.needsRender = true;
    requestAnimationFrame(() => {
        AppState.needsRender = false;
        renderUI();
    });
}

function renderUI() {
    updateDisplay();
    renderTasks();
    updateTaskFormState();
}

function updateDisplay() {
    const minutes = Math.floor(AppState.timeLeft / 60);
    const seconds = AppState.timeLeft % 60;
    elements.timerDisplay.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    updatePlantEvolution();
}

function updatePlantEvolution() {
    const plantDisplay = document.getElementById('mainPlantDisplay');
    if (!plantDisplay) return;
    if (AppState.currentTaskIndex === -1) {
        plantDisplay.textContent = '🌱';
        plantDisplay.style.fontSize = window.innerWidth > 1024 ? '110px' : '85px';
        return;
    }
    const task = AppState.tasks[AppState.currentTaskIndex];
    const totalSecondsPerRound = Math.floor(task.minutes * 60);
    let progress;
    if (AppState.isBreakTime) {
        progress = (AppState.currentRound - 1 + 1) / task.rounds;
    } else {
        const elapsed = totalSecondsPerRound - AppState.timeLeft;
        progress = ((AppState.currentRound - 1) + elapsed / totalSecondsPerRound) / task.rounds;
    }
    progress = Math.min(Math.max(progress, 0), 1);
    const stages = ['🌱', '🌿', '🪴', '🌳'];
    let stageIndex = Math.floor(progress * (stages.length - 1));
    if (progress >= 1) stageIndex = stages.length - 1;
    plantDisplay.textContent = stages[stageIndex];
    plantDisplay.style.fontSize = stageIndex === stages.length - 1 ? (window.innerWidth > 1024 ? '160px' : '110px') : (window.innerWidth > 1024 ? '110px' : '85px');
}

function handleTaskFormSubmit(event) {
    event.preventDefault();
    if (AppState.editingTaskIndex === -1) {
        addNewTask();
    } else {
        saveTaskEdit();
    }
}

// بناء دالة إضافة المهام المفقودة باحترافية كاملة مع ربطها التلقائي بالمؤقت
function addNewTask() {
    const name = elements.taskNameInput.value.trim();
    const minutes = Math.floor(parseInt(elements.taskMinInput.value, 10));
    const rounds = Math.floor(parseInt(elements.taskRoundsInput.value, 10));
    
    if (!name || isNaN(minutes) || isNaN(rounds) || minutes <= 0 || rounds <= 0) {
        alert('الرجاء إدخال بيانات صحيحة وكاملة للمهمة! ⚠️');
        return;
    }

    const newTask = {
        name: name,
        minutes: minutes,
        rounds: rounds,
        completed: false
    };

    AppState.tasks.push(newTask);
    
    elements.taskNameInput.value = '';
    elements.taskMinInput.value = '';
    elements.taskRoundsInput.value = '';

    renderTasks();
    saveData();

    if (AppState.currentTaskIndex === -1) {
        loadNextIncompleteTask(0);
    }
}

// بناء دالة إضافة الدقيقة المفقودة بدقة متوافقة مع المحرك الزمني الجديد
function addMinute() {
    if (AppState.currentTaskIndex === -1) return;
    AppState.timeLeft += 60;
    if (AppState.isRunning) {
        AppState.expectedEndTime += 60000;
    }
    requestRender();
}

// بناء دالات التبديل التلقائي المفقودة لحفظ الخيارات في الذاكرة
function toggleAutoBreak(checked) {
    AppState.autoStartBreak = checked;
    saveData();
}

function toggleAutoSession(checked) {
    AppState.autoStartSession = checked;
    saveData();
}

function updateTaskFormState() {
    if (AppState.editingTaskIndex === -1) {
        elements.taskSubmitBtn.textContent = 'إضافة المهمة ➕';
        elements.cancelEditBtn.classList.add('hidden');
    } else {
        elements.taskSubmitBtn.textContent = 'حفظ التعديل ✅';
        elements.cancelEditBtn.classList.remove('hidden');
    }
}

function editTask(index) {
    const task = AppState.tasks[index];
    if (!task || task.completed) return;
    AppState.editingTaskIndex = index;
    elements.taskNameInput.value = task.name;
    elements.taskMinInput.value = task.minutes;
    elements.taskRoundsInput.value = task.rounds;
    updateTaskFormState();
    elements.taskNameInput.focus();
}

function saveTaskEdit() {
    const name = elements.taskNameInput.value.trim();
    const minutes = Math.floor(parseInt(elements.taskMinInput.value, 10));
    const rounds = Math.floor(parseInt(elements.taskRoundsInput.value, 10));
    if (!name || isNaN(minutes) || isNaN(rounds) || minutes <= 0 || rounds <= 0) return;
    const task = AppState.tasks[AppState.editingTaskIndex];
    if (!task) return;
    task.name = name;
    task.minutes = minutes;
    task.rounds = rounds;
    if (AppState.currentTaskIndex === AppState.editingTaskIndex && !AppState.isBreakTime) {
        AppState.timeLeft = Math.floor(minutes * 60);
        if (AppState.isRunning) {
            AppState.expectedEndTime = Date.now() + AppState.timeLeft * 1000;
        }
    }
    AppState.editingTaskIndex = -1;
    elements.taskNameInput.value = '';
    elements.taskMinInput.value = '';
    elements.taskRoundsInput.value = '';
    updateTaskFormState();
    renderTasks();
    saveData();
}

function cancelTaskEdit(event) {
    event.preventDefault();
    AppState.editingTaskIndex = -1;
    elements.taskNameInput.value = '';
    elements.taskMinInput.value = '';
    elements.taskRoundsInput.value = '';
    updateTaskFormState();
}

function handleTaskActionClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const index = Number(actionButton.dataset.index);
    if (action === 'edit') editTask(index);
    if (action === 'delete') deleteTask(index);
    if (action === 'complete') toggleTaskCompletion(index);
}

function deleteTask(index) {
    if (!AppState.tasks[index]) return;
    const confirmed = confirm('هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن العملية.');
    if (!confirmed) return;
    const isCurrent = index === AppState.currentTaskIndex;
    AppState.tasks.splice(index, 1);
    if (AppState.editingTaskIndex === index) cancelTaskEdit(new Event('click'));
    if (isCurrent) {
        if (AppState.isRunning) toggleTimer();
        loadNextIncompleteTask(0);
    } else if (index < AppState.currentTaskIndex) {
        AppState.currentTaskIndex -= 1;
    }
    renderTasks();
    saveData();
}

function renderTasks() {
    let pendingList = elements.pendingTaskList;
    let completedList = elements.completedTaskList;
    if (!pendingList || !completedList) return;
    pendingList.innerHTML = '';
    completedList.innerHTML = '';
    let pendingCount = 0;
    AppState.statTasksCompleted = 0;

    AppState.tasks.forEach((task, index) => {
        const taskClass = task.completed ? 'completed-task' : (index === AppState.currentTaskIndex ? 'active' : '');
        const controls = `
            <div class="task-actions">
                ${task.completed ? '' : `<button class="action-btn complete" data-action="complete" data-index="${index}" aria-label="إنهاء المهمة">✔</button>`}
                ${task.completed ? '' : `<button class="action-btn edit" data-action="edit" data-index="${index}" aria-label="تعديل المهمة">✏</button>`}
                <button class="action-btn delete" data-action="delete" data-index="${index}" aria-label="حذف المهمة">🗑</button>
            </div>`;
        const htmlStr = `
            <li class="task-item ${taskClass}">
                <div style="display: flex; gap: 10px; align-items: center; width: 100%; justify-content: space-between;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px; ${task.completed ? 'text-decoration: line-through;' : ''}">${task.name}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${task.minutes} د | ${task.rounds} جولات</div>
                    </div>
                    ${task.completed ? '<div class="check-circle"><i class="fa-solid fa-check"></i></div>' : ''}
                </div>
                ${controls}
            </li>`;
        if (task.completed) {
            AppState.statTasksCompleted += 1;
            completedList.insertAdjacentHTML('beforeend', htmlStr);
        } else {
            pendingCount += 1;
            pendingList.insertAdjacentHTML('beforeend', htmlStr);
        }
    });
    elements.pendingTasksCount.innerText = `${pendingCount} مهام`;
    elements.completedTasksCount.innerText = `${AppState.statTasksCompleted} مهام`;
    elements.statTasks.innerText = Math.floor(AppState.statTasksCompleted);
}

function toggleTaskCompletion(index) {
    if (!AppState.tasks[index] || AppState.tasks[index].completed) return;
    AppState.tasks[index].completed = true;
    saveData();
    if (index === AppState.currentTaskIndex) {
        if (AppState.isRunning) toggleTimer();
        handleTimerEnd(true);
    } else {
        renderTasks();
    }
}

function loadNextIncompleteTask(startIndex = 0) {
    let nextIndex = -1;
    for (let i = startIndex; i < AppState.tasks.length; i++) {
        if (!AppState.tasks[i].completed) {
            nextIndex = i;
            break;
        }
    }
    if (nextIndex !== -1) {
        AppState.currentTaskIndex = nextIndex;
        AppState.currentRound = 1;
        AppState.isBreakTime = false;
        elements.timerRing.classList.remove('break-mode');
        elements.timerLabel.innerText = 'وقت التركيز';
        const task = AppState.tasks[nextIndex];
        AppState.timeLeft = Math.floor(task.minutes * 60);
        elements.sessionCounter.innerText = `⏳ ${task.name} (جولة ${AppState.currentRound}/${task.rounds})`;
        elements.startBtn.disabled = false;
        elements.plantSpeech.innerText = 'ركز الآن، سنرتاح لاحقاً! 🎯';
    } else {
        AppState.currentTaskIndex = -1;
        AppState.timeLeft = 0;
        elements.sessionCounter.innerText = 'لا توجد مهام معلقة! 🏆';
        elements.startBtn.disabled = true;
        elements.timerLabel.innerText = 'انتهى العمل';
        elements.plantSpeech.innerText = 'عمل رائع! لقد أنجزت كل المهام المدرجة 🌟';
        const plantDisplay = document.getElementById('mainPlantDisplay');
        if (plantDisplay) {
            plantDisplay.textContent = '🌳';
            plantDisplay.style.fontSize = window.innerWidth > 1024 ? '160px' : '110px';
        }
    }
    updateDisplay();
    renderTasks();
}

// ترقية وتطوير المؤقت ليعمل بالطوابع الزمنية عالية الدقة لمنع تجميده عند التنقل بين التبويبات
function toggleTimer() {
    if (AppState.currentTaskIndex === -1) return;
    if (AppState.isRunning) {
        clearInterval(AppState.timerId);
        AppState.timerId = null;
        AppState.isRunning = false;
        elements.startBtn.innerHTML = 'استئناف ▶';
    } else {
        AppState.isRunning = true;
        elements.startBtn.innerHTML = 'إيقاف ⏸';
        
        // حساب الطابع الزمني الدقيق الذي يجب أن ينتهي عنده العداد
        AppState.expectedEndTime = Date.now() + AppState.timeLeft * 1000;
        
        AppState.timerId = setInterval(() => {
            const msLeft = AppState.expectedEndTime - Date.now();
            if (msLeft > 0) {
                AppState.timeLeft = Math.ceil(msLeft / 1000);
                requestRender();
            } else {
                AppState.timeLeft = 0;
                clearInterval(AppState.timerId);
                AppState.timerId = null;
                AppState.isRunning = false;
                elements.startBtn.innerHTML = 'متابعة ▶';
                handleTimerEnd();
            }
        }, 250); // فحص متكرر فائق السرعة لضمان السلاسة المطلقة
    }
}

function skipRound() {
    const shouldSkip = confirm('هل تريد تخطي الجولة الحالية؟ سيتم الانتقال إلى المرحلة التالية.');
    if (!shouldSkip) return;
    if (AppState.isRunning) toggleTimer();
    if (AppState.currentTaskIndex !== -1) handleTimerEnd(true);
}

function resetTimer() {
    if (AppState.currentTaskIndex !== -1) {
        const shouldReset = confirm('هل تريد إعادة ضبط المؤقت؟ سيتم فقد التقدم الحالي.');
        if (!shouldReset) return;
        if (AppState.isRunning) toggleTimer();
        const task = AppState.tasks[AppState.currentTaskIndex];
        AppState.timeLeft = AppState.isBreakTime ? Math.floor(Math.ceil(task.minutes * 0.2) * 60) : Math.floor(task.minutes * 60);
        requestRender();
        notifyUser('تم إعادة ضبط المؤقت', 'يمكنك بدء الجلسة مجدداً في أي وقت.');
    }
}

function handleTimerEnd(forceEnd = false) {
    playSoftBell();
    const task = AppState.tasks[AppState.currentTaskIndex];
    if (!task) return;
    if (!AppState.isBreakTime || forceEnd) {
        if (!AppState.isBreakTime) {
            AppState.statRoundsCount += 1;
            elements.statRounds.innerText = Math.floor(AppState.statRoundsCount);
            gainXP(task.minutes);
            saveData();
        }
        if (!AppState.isBreakTime && AppState.currentRound < task.rounds) {
            AppState.isBreakTime = true;
            const breakMins = Math.floor(Math.max(1, Math.ceil(task.minutes * 0.2)));
            AppState.timeLeft = Math.floor(breakMins * 60);
            elements.timerRing.classList.add('break-mode');
            elements.timerLabel.innerText = 'وقت الاستراحة';
            elements.sessionCounter.innerText = `☕ استراحة (${breakMins} دقائق)`;
            elements.plantSpeech.innerText = 'استرخِ قليلاً، خذ نفساً عميقاً 😌';
            notifyUser('استراحة قصيرة', `أكملت جولة ${AppState.currentRound}. وقت الاستراحة الآن.`);
            requestRender();
            if (AppState.autoStartBreak) setTimeout(toggleTimer, 200);
            return;
        }
        if (AppState.isBreakTime) {
            AppState.isBreakTime = false;
            AppState.currentRound += 1;
            AppState.timeLeft = Math.floor(task.minutes * 60);
            elements.timerRing.classList.remove('break-mode');
            elements.timerLabel.innerText = 'وقت التركيز';
            elements.sessionCounter.innerText = `⏳ ${task.name} (جولة ${AppState.currentRound}/${task.rounds})`;
            elements.plantSpeech.innerText = 'عدنا للعمل! 💪';
            notifyUser('انتهت الاستراحة', 'حان وقت التركيز مرة أخرى.');
            requestRender();
            if (AppState.autoStartSession) setTimeout(toggleTimer, 200);
            return;
        }
        task.completed = true;
        AppState.statTasksCompleted += 1;
        renderTasks();
        saveData();
        loadNextIncompleteTask(0);
        if (AppState.currentTaskIndex !== -1 && AppState.autoStartSession) setTimeout(toggleTimer, 200);
        notifyUser('مهمة مكتملة', `لقد أنجزت المهمة: ${task.name}`);
        return;
    }
}

function gainXP(minutes) {
    AppState.totalXP += Math.floor(minutes * 10);
    updateXPUI();
}

function updateXPUI() {
    const lvl = Math.floor((1 + Math.sqrt(1 + 0.008 * AppState.totalXP)) / 2);
    const xpForCurrentLvl = Math.floor(500 * lvl * (lvl - 1));
    const xpNeededForNextLvl = Math.floor(lvl * 1000);
    const currentLevelXP = Math.max(0, Math.floor(AppState.totalXP - xpForCurrentLvl));
    const percentage = xpNeededForNextLvl ? Math.floor((currentLevelXP * 100) / xpNeededForNextLvl) : 0;
    elements.userLevelDisplay.innerText = `مستوى المستخدم Lv. ${lvl}`;
    elements.statUser.innerText = `Lv. ${lvl}`;
    elements.xpBar.style.width = `${percentage}%`;
    elements.xpDisplay.innerText = `${currentLevelXP} / ${xpNeededForNextLvl} XP`;
}

function saveData() {
    const data = {
        tasks: AppState.tasks,
        totalXP: Math.floor(AppState.totalXP),
        statRounds: Math.floor(AppState.statRoundsCount),
        themeColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim(),
        themeMainBg: getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim(),
        themePanelBg: getComputedStyle(document.documentElement).getPropertyValue('--bg-panel').trim(),
        autoStartBreak: AppState.autoStartBreak,
        autoStartSession: AppState.autoStartSession
    };
    localStorage.setItem('pomodoroMR_Data', JSON.stringify(data));
}

function loadData() {
    const savedData = localStorage.getItem('pomodoroMR_Data');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        AppState.tasks = parsed.tasks || [];
        AppState.totalXP = Math.floor(parsed.totalXP || 0);
        AppState.statRoundsCount = Math.floor(parsed.statRounds || 0);
        AppState.autoStartBreak = parsed.autoStartBreak || false;
        AppState.autoStartSession = parsed.autoStartSession || false;
        elements.autoBreakToggle.checked = AppState.autoStartBreak;
        elements.autoSessionToggle.checked = AppState.autoStartSession;
        if (parsed.themeColor) document.documentElement.style.setProperty('--theme-color', parsed.themeColor);
        if (parsed.themeMainBg) document.documentElement.style.setProperty('--bg-main', parsed.themeMainBg);
        if (parsed.themePanelBg) document.documentElement.style.setProperty('--bg-panel', parsed.themePanelBg);
        updateThemeSelector();
        elements.statRounds.innerText = Math.floor(AppState.statRoundsCount);
        updateXPUI();
        renderTasks();
        loadNextIncompleteTask(0);
    } else {
        updateXPUI();
    }
}

function notifyUser(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('Service Worker Error:', err));
    });
}

window.addEventListener('DOMContentLoaded', init);