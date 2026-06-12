// ============================================================
// تطبيق بومودورو MR - الإصدار النهائي مع استعادة البيانات من 'pomodoroMR_Data'
// ============================================================

let tasks = [];
let completedTasks = [];
let currentTaskId = null;
let timer = null;
let isRunning = false;
let currentMode = "focus";
let timeLeft = 0;
let autoBreak = false;
let autoSession = false;
let xp = 0;
let level = 1;
let completedRoundsCount = 0;
let totalCompletedTasks = 0;
let plantMessages = [
    "أهلاً بك يا بطل! لنبدأ جلسة تركيز قوية 🌿",
    "أنت مذهل! واصل التركيز 💪",
    "نبتتك تنمو مع كل جولة 🌻",
    "قمة التركيز! ارفع من طاقتك 🚀"
];

// عناصر DOM
const timerDisplay = document.getElementById('timerDisplay');
const timerLabel = document.getElementById('timerLabel');
const sessionCounter = document.getElementById('sessionCounter');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const addMinuteBtn = document.getElementById('addMinuteBtn');
const resetBtn = document.getElementById('resetBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const plantSpeech = document.getElementById('plantSpeech');
const mainPlantDisplay = document.getElementById('mainPlantDisplay');
const userLevelDisplay = document.getElementById('userLevelDisplay');
const xpDisplaySpan = document.getElementById('xpDisplay');
const xpBar = document.getElementById('xpBar');
const pendingTaskList = document.getElementById('pendingTaskList');
const completedTaskList = document.getElementById('completedTaskList');
const pendingTasksCountSpan = document.getElementById('pendingTasksCount');
const completedTasksCountSpan = document.getElementById('completedTasksCount');
const statTasksSpan = document.getElementById('statTasks');
const statRoundsSpan = document.getElementById('statRounds');
const statFocusSpan = document.getElementById('statFocus');
const statUserSpan = document.getElementById('statUser');
const autoBreakToggle = document.getElementById('autoBreakToggle');
const autoSessionToggle = document.getElementById('autoSessionToggle');
const taskNameInput = document.getElementById('taskNameInput');
const taskMinInput = document.getElementById('taskMinInput');
const taskRoundsInput = document.getElementById('taskRoundsInput');
const taskSubmitBtn = document.getElementById('taskSubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// ---------- دالة الصوت ----------
function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 500);
    } catch(e) { console.warn(e); }
}

// ---------- دوال مساعدة ----------
function showSpeechMessage(msg) {
    if (plantSpeech) plantSpeech.innerText = msg;
    setTimeout(() => {
        if (plantSpeech && plantSpeech.innerText === msg) {
            plantSpeech.innerText = plantMessages[Math.floor(Math.random() * plantMessages.length)];
        }
    }, 4000);
}

function updateStatsUI() {
    if (statTasksSpan) statTasksSpan.innerText = totalCompletedTasks;
    if (statRoundsSpan) statRoundsSpan.innerText = completedRoundsCount;
    if (statUserSpan) statUserSpan.innerText = `Lv. ${level}`;
    let focusText = completedRoundsCount === 0 ? "لم تبدأ بعد" : (completedRoundsCount < 5 ? "جيد" : "ممتاز");
    if (statFocusSpan) statFocusSpan.innerText = focusText;
}

function updateLevelAndXP() {
    const neededXP = level * 1000;
    if (xp >= neededXP) {
        xp -= neededXP;
        level++;
        showSpeechMessage(`🎉 رفعت مستواك إلى ${level}! 🎉`);
    }
    if (userLevelDisplay) userLevelDisplay.innerText = `مستوى المستخدم Lv. ${level}`;
    if (xpDisplaySpan) xpDisplaySpan.innerText = `${xp} / ${level * 1000} XP`;
    if (xpBar) {
        xpBar.style.width = (xp / (level * 1000)) * 100 + "%";
    }
    updateStatsUI();
}

function addXP(amount) {
    xp += amount;
    updateLevelAndXP();
}

// حساب مدة الاستراحة بناءً على مدة الجلسة
function getBreakDurationFromSession(minutes) {
    if (minutes === 25) return 5;
    if (minutes === 50) return 10;
    let br = Math.floor(minutes / 5);
    return br < 2 ? 2 : br;
}

// ========== ترحيل البيانات القديمة (ذكي وشامل) ==========
function migrateAllOldData() {
    let oldData = null;
    // قائمة بجميع المفاتيح المحتملة - مع وضع مفتاحك الأصلي في البداية
    const possibleKeys = [
        'pomodoroMR_Data_v2',   // مفتاحك الأصلي
    ];
    for (let key of possibleKeys) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.tasks || parsed.completedTasks || parsed.xp !== undefined)) {
                    oldData = parsed;
                    console.log(`تم العثور على بيانات قديمة من المفتاح: ${key}`);
                    break;
                }
            }
        } catch(e) {}
    }
    
    if (!oldData) return false;
    
    // استعادة المهام النشطة
    if (oldData.tasks && Array.isArray(oldData.tasks)) {
        tasks = oldData.tasks.map(task => {
            return {
                id: task.id || Date.now() + Math.random(),
                name: task.name || task.text || "مهمة",
                minutesPerSession: task.minutesPerSession || task.minutes || task.duration || 25,
                totalRounds: task.totalRounds || task.remainingRounds || task.rounds || 1,
                remainingRounds: task.remainingRounds !== undefined ? task.remainingRounds : (task.totalRounds || 1)
            };
        });
    }
    
    // استعادة المهام المنجزة
    if (oldData.completedTasks && Array.isArray(oldData.completedTasks)) {
        completedTasks = oldData.completedTasks.map(t => ({
            id: t.id || Date.now(),
            name: t.name || t.text || "مهمة",
            totalRounds: t.totalRounds || t.rounds || 1,
            completedDate: t.completedDate || t.date || new Date().toLocaleString('ar-EG')
        }));
        totalCompletedTasks = completedTasks.length;
    }
    
    // استعادة المتغيرات الأخرى
    if (oldData.currentTaskId) currentTaskId = oldData.currentTaskId;
    if (oldData.currentMode) currentMode = oldData.currentMode;
    if (oldData.timeLeft) timeLeft = oldData.timeLeft;
    if (oldData.xp !== undefined) xp = oldData.xp;
    if (oldData.level) level = oldData.level;
    if (oldData.completedRoundsCount !== undefined) completedRoundsCount = oldData.completedRoundsCount;
    if (oldData.totalCompletedTasks !== undefined) totalCompletedTasks = oldData.totalCompletedTasks;
    if (oldData.autoBreak !== undefined) autoBreak = oldData.autoBreak;
    if (oldData.autoSession !== undefined) autoSession = oldData.autoSession;
    
    // حفظ البيانات المهاجرة فوراً بالمفتاح الجديد
    saveData();
    return true;
}

// ---------- حفظ وتحميل البيانات ----------
function saveData() {
    const data = { tasks, completedTasks, currentTaskId, currentMode, timeLeft, isRunning, xp, level, completedRoundsCount, totalCompletedTasks, autoBreak, autoSession };
    localStorage.setItem('pomodoro_mr_data', JSON.stringify(data));
}

function loadData() {
    // أولاً: محاولة تحميل من المفتاح الجديد
    const saved = localStorage.getItem('pomodoro_mr_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            tasks = data.tasks || [];
            completedTasks = data.completedTasks || [];
            currentTaskId = data.currentTaskId || null;
            currentMode = data.currentMode || "focus";
            timeLeft = data.timeLeft || 0;
            xp = data.xp || 0;
            level = data.level || 1;
            completedRoundsCount = data.completedRoundsCount || 0;
            totalCompletedTasks = data.totalCompletedTasks || 0;
            autoBreak = data.autoBreak || false;
            autoSession = data.autoSession || false;
            if (autoBreakToggle) autoBreakToggle.checked = autoBreak;
            if (autoSessionToggle) autoSessionToggle.checked = autoSession;
        } catch(e) {}
    } else {
        // ثانياً: لا توجد بيانات جديدة، نحاول الترحيل من القديم
        const migrated = migrateAllOldData();
        if (!migrated) {
            // لا بيانات على الإطلاق، نبدأ من الصفر
            tasks = [];
            completedTasks = [];
            currentTaskId = null;
            currentMode = "focus";
            timeLeft = 0;
            xp = 0;
            level = 1;
            completedRoundsCount = 0;
            totalCompletedTasks = 0;
        }
    }
    
    // التأكد من صحة البيانات
    if (!Array.isArray(tasks)) tasks = [];
    if (!Array.isArray(completedTasks)) completedTasks = [];
    if (!currentTaskId && tasks.length) currentTaskId = tasks[0].id;
    
    // تحديث واجهات المستخدم
    updateTasksUI();
    updateCompletedUI();
    updateLevelAndXP();
    applyCurrentTaskToTimer();
    if (isRunning) stopTimer();
    if (startBtn) startBtn.disabled = (tasks.length === 0);
    
    // حفظ البيانات بعد التحميل (لضمان تحديث التخزين)
    saveData();
}

// ---------- إدارة المهام والجولات ----------
function applyCurrentTaskToTimer() {
    if (currentMode === "focus") {
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            timeLeft = (task.minutesPerSession || 25) * 60;
            if (sessionCounter) sessionCounter.innerText = `${task.name} (${task.remainingRounds}/${task.totalRounds})`;
            if (timerLabel) timerLabel.innerText = "وقت التركيز";
        } else {
            timeLeft = 0;
            if (sessionCounter) sessionCounter.innerText = "لا توجد مهام";
            if (timerLabel) timerLabel.innerText = "أضف مهمة";
        }
    } else {
        const task = tasks.find(t => t.id === currentTaskId);
        let breakMinutes = 5;
        if (task) breakMinutes = getBreakDurationFromSession(task.minutesPerSession || 25);
        else if (tasks.length > 0) breakMinutes = getBreakDurationFromSession(tasks[0].minutesPerSession || 25);
        timeLeft = breakMinutes * 60;
        if (timerLabel) timerLabel.innerText = `استراحة ${breakMinutes} دقائق`;
        if (sessionCounter) sessionCounter.innerText = `☕ استراحة`;
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (timerDisplay) {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function updateTasksUI() {
    if (!pendingTaskList) return;
    pendingTaskList.innerHTML = "";
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${currentTaskId === task.id ? 'active' : ''}`;
        const span = document.createElement('span');
        span.innerText = `${task.name} (${task.remainingRounds}/${task.totalRounds} جولة • ${task.minutesPerSession} د)`;
        const actions = document.createElement('div');
        actions.className = "task-actions";
        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = '<i class="fa-regular fa-circle-check"></i>';
        completeBtn.className = "action-btn complete";
        completeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            completeOneRound(task.id);
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
        deleteBtn.className = "action-btn delete";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        actions.appendChild(completeBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(span);
        li.appendChild(actions);
        li.addEventListener('click', () => selectTask(task.id));
        pendingTaskList.appendChild(li);
    });
    pendingTasksCountSpan.innerText = `${tasks.length} مهام`;
    if (tasks.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.innerText = "✨ لا توجد مهام معلقة. أضف مهمة جديدة";
        emptyLi.style.textAlign = "center";
        emptyLi.style.opacity = "0.6";
        pendingTaskList.appendChild(emptyLi);
        currentTaskId = null;
        applyCurrentTaskToTimer();
        if (startBtn) startBtn.disabled = true;
    } else {
        if (startBtn) startBtn.disabled = false;
        if (!currentTaskId || !tasks.find(t => t.id === currentTaskId)) {
            currentTaskId = tasks[0].id;
            applyCurrentTaskToTimer();
        }
    }
}

function updateCompletedUI() {
    if (!completedTaskList) return;
    completedTaskList.innerHTML = "";
    completedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = "completed-task";
        const checkSpan = document.createElement('span');
        checkSpan.className = "check-circle";
        checkSpan.innerHTML = '<i class="fa-solid fa-check"></i>';
        const info = document.createElement('span');
        info.innerText = `${task.name} (${task.totalRounds} جولة) - ${task.completedDate}`;
        li.appendChild(checkSpan);
        li.appendChild(info);
        completedTaskList.appendChild(li);
    });
    completedTasksCountSpan.innerText = `${completedTasks.length} مهام`;
}

function selectTask(taskId) {
    if (isRunning) stopTimer();
    currentTaskId = taskId;
    if (currentMode !== "focus") {
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
    }
    applyCurrentTaskToTimer();
    updateTasksUI();
    saveData();
    const task = tasks.find(t => t.id === taskId);
    if (task) showSpeechMessage(`تم اختيار المهمة: ${task.name}`);
}

function completeOneRound(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.remainingRounds > 0) {
        task.remainingRounds--;
        completedRoundsCount++;
        addXP(50);
        showSpeechMessage(`🎯 أتممت جولة في "${task.name}"! متبقي ${task.remainingRounds} جولة`);
        if (task.remainingRounds === 0) {
            const completedTask = {
                id: task.id,
                name: task.name,
                totalRounds: task.totalRounds,
                completedDate: new Date().toLocaleString('ar-EG')
            };
            completedTasks.unshift(completedTask);
            tasks = tasks.filter(t => t.id !== taskId);
            totalCompletedTasks++;
            if (currentTaskId === taskId) {
                currentTaskId = tasks.length > 0 ? tasks[0].id : null;
            }
            updateCompletedUI();
            showSpeechMessage(`🎉 أكملت المهمة "${task.name}"! 🎉`);
            addXP(150);
        }
        updateTasksUI();
        applyCurrentTaskToTimer();
        saveData();
        if (!isRunning && currentMode === "focus") updateTimerDisplay();
    }
}

function deleteTask(taskId) {
    if (isRunning) stopTimer();
    tasks = tasks.filter(t => t.id !== taskId);
    if (currentTaskId === taskId) {
        currentTaskId = tasks.length > 0 ? tasks[0].id : null;
        applyCurrentTaskToTimer();
    }
    updateTasksUI();
    saveData();
    showSpeechMessage("تم حذف المهمة.");
}

function addTask(name, minutes, rounds) {
    if (!name.trim()) {
        showSpeechMessage("يرجى إدخال اسم المهمة");
        return;
    }
    if (isNaN(minutes) || minutes < 1) minutes = 25;
    if (isNaN(rounds) || rounds < 1) rounds = 1;
    const newTask = {
        id: Date.now(),
        name: name.trim(),
        minutesPerSession: Math.min(120, minutes),
        totalRounds: rounds,
        remainingRounds: rounds
    };
    tasks.push(newTask);
    if (!currentTaskId || tasks.length === 1) {
        currentTaskId = newTask.id;
        if (currentMode !== "focus") {
            currentMode = "focus";
            document.querySelector('.timer-circle')?.classList.remove('break-mode');
        }
        applyCurrentTaskToTimer();
    }
    updateTasksUI();
    saveData();
    showSpeechMessage(`تمت إضافة "${name}" (${rounds} جولة)`);
    taskNameInput.value = "";
    taskMinInput.value = "";
    taskRoundsInput.value = "";
}

// ---------- دوال المؤقت ----------
function startTimer() {
    if (tasks.length === 0) {
        showSpeechMessage("أضف مهمة أولاً");
        return;
    }
    if (timer) clearInterval(timer);
    isRunning = true;
    startBtn.innerText = "⏸ إيقاف";
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
            timer = null;
            isRunning = false;
            startBtn.innerText = "ابدأ ▶";
            handleTimerEnd();
        }
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    isRunning = false;
    if (startBtn) startBtn.innerText = "ابدأ ▶";
}

function resetTimer() {
    stopTimer();
    applyCurrentTaskToTimer();
}

function addExtraMinute() {
    if (currentMode === "focus" && timeLeft > 0) {
        timeLeft += 60;
        updateTimerDisplay();
        showSpeechMessage("➕ أضفت دقيقة إضافية");
    }
}

function skipToNext() {
    stopTimer();
    if (currentMode === "focus") {
        handleTimerEnd();
    } else {
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
        applyCurrentTaskToTimer();
        showSpeechMessage("انتهت الاستراحة مبكراً، نبدأ التركيز");
        if (autoSession && tasks.length > 0 && currentTaskId) startTimer();
    }
}

function handleTimerEnd() {
    playBeep();
    if (currentMode === "focus") {
        if (currentTaskId) {
            const task = tasks.find(t => t.id === currentTaskId);
            if (task && task.remainingRounds > 0) {
                task.remainingRounds--;
                completedRoundsCount++;
                addXP(50);
                showSpeechMessage(`✅ جولة كاملة! متبقي ${task.remainingRounds} من ${task.totalRounds}`);
                if (task.remainingRounds === 0) {
                    const completedTask = {
                        id: task.id,
                        name: task.name,
                        totalRounds: task.totalRounds,
                        completedDate: new Date().toLocaleString('ar-EG')
                    };
                    completedTasks.unshift(completedTask);
                    tasks = tasks.filter(t => t.id !== task.id);
                    totalCompletedTasks++;
                    if (currentTaskId === task.id) {
                        currentTaskId = tasks.length > 0 ? tasks[0].id : null;
                    }
                    updateCompletedUI();
                    showSpeechMessage(`🎉 أنهيت المهمة "${task.name}"! 🎉`);
                    addXP(150);
                    updateTasksUI();
                    saveData();
                    currentMode = "focus";
                    document.querySelector('.timer-circle')?.classList.remove('break-mode');
                    applyCurrentTaskToTimer();
                    stopTimer();
                    return;
                }
                updateTasksUI();
                saveData();
            }
        }
        if (autoBreak) {
            currentMode = "break";
            document.querySelector('.timer-circle')?.classList.add('break-mode');
            const currentTask = tasks.find(t => t.id === currentTaskId);
            let breakMinutes = 5;
            if (currentTask) breakMinutes = getBreakDurationFromSession(currentTask.minutesPerSession || 25);
            else if (tasks.length > 0) breakMinutes = getBreakDurationFromSession(tasks[0].minutesPerSession || 25);
            timeLeft = breakMinutes * 60;
            if (timerLabel) timerLabel.innerText = `استراحة ${breakMinutes} دقائق`;
            if (sessionCounter) sessionCounter.innerText = `☕ استراحة`;
            updateTimerDisplay();
            if (autoSession && tasks.length > 0 && currentTaskId) {
                startTimer();
            } else {
                showSpeechMessage(`استراحة ${breakMinutes} دقائق. استرخِ قليلاً`);
            }
        } else {
            stopTimer();
            showSpeechMessage("انتهت الجولة، اضغط بدء لمواصلة التركيز");
        }
    } else {
        stopTimer();
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
        applyCurrentTaskToTimer();
        if (autoSession && tasks.length > 0 && currentTaskId) {
            startTimer();
        } else {
            showSpeechMessage("استراحة انتهت! اضغط بدء لبدء التركيز");
        }
    }
    saveData();
}

// ---------- إعدادات الواجهة ----------
function initSidebar() {
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
}

function initSettings() {
    if (autoBreakToggle) autoBreakToggle.addEventListener('change', (e) => {
        autoBreak = e.target.checked;
        saveData();
    });
    if (autoSessionToggle) autoSessionToggle.addEventListener('change', (e) => {
        autoSession = e.target.checked;
        saveData();
    });
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const container = document.querySelector('.app-container');
            if (!document.fullscreenElement) {
                container?.requestFullscreen();
                container?.classList.add('fullscreen-timer');
            } else {
                document.exitFullscreen();
                container?.classList.remove('fullscreen-timer');
            }
        });
        document.addEventListener('fullscreenchange', () => {
            const container = document.querySelector('.app-container');
            if (!document.fullscreenElement) container?.classList.remove('fullscreen-timer');
        });
    }
    if (startBtn) startBtn.addEventListener('click', () => {
        if (tasks.length === 0) {
            showSpeechMessage("أضف مهمة أولاً");
            return;
        }
        if (isRunning) stopTimer();
        else startTimer();
    });
    if (skipBtn) skipBtn.addEventListener('click', skipToNext);
    if (addMinuteBtn) addMinuteBtn.addEventListener('click', addExtraMinute);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
    if (taskSubmitBtn) {
        taskSubmitBtn.addEventListener('click', () => {
            addTask(taskNameInput.value, parseInt(taskMinInput.value) || 25, parseInt(taskRoundsInput.value) || 1);
        });
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            taskNameInput.value = "";
            taskMinInput.value = "";
            taskRoundsInput.value = "";
            cancelEditBtn.classList.add('hidden');
        });
    }
    taskNameInput?.addEventListener('input', () => {
        if (taskNameInput.value.trim() !== "") cancelEditBtn?.classList.remove('hidden');
        else cancelEditBtn?.classList.add('hidden');
    });
    // التنقل بين الأقسام
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            if (viewId === 'view-timer') document.getElementById('view-timer')?.classList.add('active');
            if (viewId === 'view-history') document.getElementById('view-history')?.classList.add('active');
            if (viewId === 'view-settings') document.getElementById('view-settings')?.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
    // تخصيص الألوان والخلفيات
    const colorDots = document.querySelectorAll('.color-dot');
    const bgBoxes = document.querySelectorAll('.bg-box');
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const color = dot.getAttribute('data-color');
            document.documentElement.style.setProperty('--theme-color', color);
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            localStorage.setItem('pomodoro_theme_color', color);
        });
    });
    bgBoxes.forEach(bg => {
        bg.addEventListener('click', () => {
            const mainColor = bg.getAttribute('data-main');
            const panelColor = bg.getAttribute('data-panel');
            if (mainColor) document.documentElement.style.setProperty('--bg-main', mainColor);
            if (panelColor) document.documentElement.style.setProperty('--bg-panel', panelColor);
            bgBoxes.forEach(b => b.classList.remove('active'));
            bg.classList.add('active');
            localStorage.setItem('pomodoro_bg_main', mainColor);
            localStorage.setItem('pomodoro_bg_panel', panelColor);
        });
    });
    const savedColor = localStorage.getItem('pomodoro_theme_color');
    if (savedColor) document.documentElement.style.setProperty('--theme-color', savedColor);
    const savedMain = localStorage.getItem('pomodoro_bg_main');
    const savedPanel = localStorage.getItem('pomodoro_bg_panel');
    if (savedMain) document.documentElement.style.setProperty('--bg-main', savedMain);
    if (savedPanel) document.documentElement.style.setProperty('--bg-panel', savedPanel);
}

function initPlantAnimation() {
    setInterval(() => {
        if (mainPlantDisplay) {
            let progress = 0;
            if (currentMode === "focus" && tasks.length && currentTaskId) {
                const task = tasks.find(t => t.id === currentTaskId);
                if (task) {
                    const completed = task.totalRounds - task.remainingRounds;
                    progress = (completed / task.totalRounds) * 100;
                }
            }
            if (progress >= 100) mainPlantDisplay.innerText = "🌸🌳";
            else if (progress >= 66) mainPlantDisplay.innerText = "🌻🌿";
            else if (progress >= 33) mainPlantDisplay.innerText = "🌱🍃";
            else mainPlantDisplay.innerText = "🌱";
        }
    }, 1000);
}

// ---------- بدء التشغيل ----------
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initSidebar();
    initSettings();
    initPlantAnimation();
    updateTasksUI();
    updateCompletedUI();
    applyCurrentTaskToTimer();
    updateLevelAndXP();
    if (!currentTaskId && tasks.length) {
        currentTaskId = tasks[0].id;
        applyCurrentTaskToTimer();
        updateTasksUI();
    }
    if (startBtn) startBtn.disabled = (tasks.length === 0);
});
