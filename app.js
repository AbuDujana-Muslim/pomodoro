// ============================================================
// تطبيق بومودورو MR - النسخة المعدلة بالكامل
// تم إصلاح الصوت وربط المؤقت بالمهام مع عدد الجولات
// مع الحفاظ الكامل على التصميم الأصلي
// ============================================================

// ---------- المتغيرات العامة ----------
let tasks = [];              // { id, name, minutesPerSession, totalRounds, remainingRounds }
let completedTasks = [];     // { id, name, totalRounds, completedDate }
let currentTaskId = null;    // id المهمة النشطة الحالية
let timer = null;
let isRunning = false;
let currentMode = "focus";   // 'focus' أو 'break'
let timeLeft = 0;            // بالثواني
let currentFocusSeconds = 0; // مدة التركيز الحالية (المستخدمة في ضبط الوقت)
let isBreak = false;         // بديل
let autoBreak = false;       // الإعدادات
let autoSession = false;
let currentPlantEmoji = "🌱";
let plantMessages = [
    "أهلاً بك يا بطل! لنبدأ جلسة تركيز قوية 🌿",
    "أنت مذهل! واصل التركيز 💪",
    "نبتتك تنمو مع كل جولة 🌻",
    "قمة التركيز! ارفع من طاقتك 🚀"
];
let xp = 0;
let level = 1;
let completedRoundsCount = 0;   // إجمالي الجولات المنجزة (للاستعراض)
let totalCompletedTasks = 0;

// عناصر DOM (بناءً على الـ HTML المقدم)
const timerDisplay = document.getElementById('timerDisplay');
const timerLabel = document.getElementById('timerLabel');
const sessionCounter = document.getElementById('sessionCounter');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');
const addMinuteBtn = document.getElementById('addMinuteBtn');
const resetBtn = document.getElementById('resetBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
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

// ---------- دوال الصوت (تعمل بدون ملفات) ----------
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
    } catch(e) {
        console.warn("تعذر تشغيل الصوت", e);
    }
}

// ---------- دوال النظام والإشعارات الداخلية ----------
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
    let focusText = "ممتاز";
    if (completedRoundsCount < 5) focusText = "جيد";
    if (completedRoundsCount === 0) focusText = "لم تبدأ بعد";
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
        let percent = (xp / (level * 1000)) * 100;
        xpBar.style.width = percent + "%";
    }
    updateStatsUI();
}

function addXP(amount) {
    xp += amount;
    updateLevelAndXP();
}

// ---------- حفظ وتحميل البيانات ----------
function saveData() {
    const data = {
        tasks, completedTasks, currentTaskId, currentMode, timeLeft, isRunning,
        xp, level, completedRoundsCount, totalCompletedTasks,
        autoBreak, autoSession, currentPlantEmoji
    };
    localStorage.setItem('pomodoro_mr_data', JSON.stringify(data));
}

function loadData() {
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
            currentPlantEmoji = data.currentPlantEmoji || "🌱";
            if (autoBreakToggle) autoBreakToggle.checked = autoBreak;
            if (autoSessionToggle) autoSessionToggle.checked = autoSession;
        } catch(e) {}
    }
    if (!tasks.length && !completedTasks.length) {
        // بيانات افتراضية للعرض
        tasks = [];
        completedTasks = [];
    }
    updateTasksUI();
    updateCompletedUI();
    updateLevelAndXP();
    applyCurrentTaskToTimer();
    if (timeLeft === 0 && currentMode === "focus") applyCurrentTaskToTimer();
    else updateTimerDisplay();
    if (isRunning) {
        // لا نستأنف المؤقت تلقائياً حفاظاً على تجربة المستخدم
        isRunning = false;
        if (timer) clearInterval(timer);
        if (startBtn) startBtn.innerText = "ابدأ ▶";
    }
}

// ---------- إدارة المهام والجولات ----------
function applyCurrentTaskToTimer() {
    if (currentMode === "focus") {
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            const minutes = task.minutesPerSession || 25;
            timeLeft = minutes * 60;
            currentFocusSeconds = timeLeft;
            if (sessionCounter) {
                sessionCounter.innerText = `${task.name} (${task.remainingRounds}/${task.totalRounds})`;
                sessionCounter.style.display = "inline-block";
            }
            if (timerLabel) timerLabel.innerText = "وقت التركيز";
        } else {
            if (sessionCounter) sessionCounter.innerText = "اختر مهمة 📋";
            timeLeft = 25 * 60;
            currentFocusSeconds = timeLeft;
        }
    } else {
        // وقت استراحة
        timeLeft = 5 * 60;
        if (timerLabel) timerLabel.innerText = "استراحة قصيرة";
        if (sessionCounter) sessionCounter.innerText = "استراحة ☕";
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (!timerDisplay) return;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTasksUI() {
    if (!pendingTaskList) return;
    pendingTaskList.innerHTML = "";
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${currentTaskId === task.id ? 'active' : ''}`;
        li.setAttribute('data-id', task.id);
        const taskTextSpan = document.createElement('span');
        taskTextSpan.innerText = `${task.name} (${task.remainingRounds}/${task.totalRounds} جولة • ${task.minutesPerSession} د)`;
        const actionsDiv = document.createElement('div');
        actionsDiv.className = "task-actions";
        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = '<i class="fa-regular fa-circle-check"></i>';
        completeBtn.className = "action-btn complete";
        completeBtn.title = "إنهاء الجولة الحالية يدوياً";
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
        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(taskTextSpan);
        li.appendChild(actionsDiv);
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
        startBtn.disabled = true;
    } else {
        startBtn.disabled = false;
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
        const taskInfo = document.createElement('span');
        taskInfo.innerText = `${task.name} (${task.totalRounds} جولة) - ${task.completedDate}`;
        li.appendChild(checkSpan);
        li.appendChild(taskInfo);
        completedTaskList.appendChild(li);
    });
    completedTasksCountSpan.innerText = `${completedTasks.length} مهام`;
}

function selectTask(taskId) {
    currentTaskId = taskId;
    if (currentMode === "focus") {
        applyCurrentTaskToTimer();
        if (isRunning) {
            stopTimer();
            startTimer();
        }
    } else {
        // إذا كان في وضع استراحة، يمكن التبديل لكن الأفضل إيقاف المؤقت
        if (isRunning) stopTimer();
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
        applyCurrentTaskToTimer();
    }
    updateTasksUI();
    saveData();
    showSpeechMessage(`تم اختيار المهمة: ${tasks.find(t=>t.id===taskId)?.name}`);
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
            // إكمال المهمة
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
            showSpeechMessage(`🎉 أكملت المهمة "${task.name}" بنجاح! 🎉`);
            addXP(150);
        }
        updateTasksUI();
        applyCurrentTaskToTimer();
        saveData();
        if (!isRunning && currentMode === "focus") updateTimerDisplay();
    }
}

function deleteTask(taskId) {
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
    if (!currentTaskId) {
        currentTaskId = newTask.id;
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
    if (timer) clearInterval(timer);
    isRunning = true;
    startBtn.innerText = "⏸ إيقاف";
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
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
    startBtn.innerText = "ابدأ ▶";
}

function resetTimer() {
    stopTimer();
    if (currentMode === "focus") {
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            timeLeft = task.minutesPerSession * 60;
            currentFocusSeconds = timeLeft;
        } else {
            timeLeft = 25 * 60;
        }
    } else {
        timeLeft = 5 * 60;
    }
    updateTimerDisplay();
}

function addExtraMinute() {
    if (currentMode === "focus") {
        timeLeft += 60;
        updateTimerDisplay();
        showSpeechMessage("➕ أضفت دقيقة إضافية");
    }
}

function skipToNext() {
    if (currentMode === "focus") {
        handleTimerEnd(); // سينهي الجولة الحالية
    } else {
        // إنهاء الاستراحة مبكراً
        if (timer) clearInterval(timer);
        isRunning = false;
        startBtn.innerText = "ابدأ ▶";
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
        applyCurrentTaskToTimer();
        if (autoSession) startTimer();
        showSpeechMessage("انتهت الاستراحة مبكراً، نبدأ التركيز");
    }
}

function handleTimerEnd() {
    playBeep();
    if (currentMode === "focus") {
        // انتهاء جولة تركيز
        if (currentTaskId) {
            const task = tasks.find(t => t.id === currentTaskId);
            if (task && task.remainingRounds > 0) {
                task.remainingRounds--;
                completedRoundsCount++;
                addXP(50);
                showSpeechMessage(`✅ جولة كاملة! متبقي ${task.remainingRounds} من ${task.totalRounds}`);
                if (task.remainingRounds === 0) {
                    // إكمال المهمة
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
                }
                updateTasksUI();
                saveData();
            }
        }
        // بعد التركيز ننتقل إلى الاستراحة تلقائياً أو يدوياً حسب الإعداد
        if (autoBreak) {
            currentMode = "break";
            document.querySelector('.timer-circle')?.classList.add('break-mode');
            timeLeft = 5 * 60;
            if (timerLabel) timerLabel.innerText = "استراحة قصيرة";
            if (sessionCounter) sessionCounter.innerText = "استراحة ☕";
            updateTimerDisplay();
            if (autoSession) startTimer();
            else showSpeechMessage("استراحة قصيرة. استرخِ قليلاً");
        } else {
            stopTimer();
            currentMode = "break";
            document.querySelector('.timer-circle')?.classList.add('break-mode');
            timeLeft = 5 * 60;
            if (timerLabel) timerLabel.innerText = "استراحة قصيرة";
            if (sessionCounter) sessionCounter.innerText = "استراحة ☕";
            updateTimerDisplay();
            showSpeechMessage("انتهت الجولة، حان وقت الاستراحة");
        }
    } else {
        // انتهاء الاستراحة
        stopTimer();
        currentMode = "focus";
        document.querySelector('.timer-circle')?.classList.remove('break-mode');
        applyCurrentTaskToTimer();
        if (autoSession && tasks.length > 0 && currentTaskId) {
            startTimer();
        }
        showSpeechMessage("استراحة انتهت! لنكمل تركيزنا");
    }
    saveData();
}

// ---------- أحداث الواجهة والإعدادات ----------
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
            const name = taskNameInput.value;
            const minutes = parseInt(taskMinInput.value) || 25;
            const rounds = parseInt(taskRoundsInput.value) || 1;
            addTask(name, minutes, rounds);
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
    // تبديل الأقسام (القائمة الجانبية)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
            if (viewId === 'view-timer') document.getElementById('view-timer')?.classList.add('active');
            if (viewId === 'view-history') document.getElementById('view-history')?.classList.add('active');
            if (viewId === 'view-settings') document.getElementById('view-settings')?.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
    // تخصيص الألوان والخلفيات (من الإعدادات الموجودة)
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
    // استعادة الألوان المحفوظة
    const savedColor = localStorage.getItem('pomodoro_theme_color');
    if (savedColor) document.documentElement.style.setProperty('--theme-color', savedColor);
    const savedMain = localStorage.getItem('pomodoro_bg_main');
    const savedPanel = localStorage.getItem('pomodoro_bg_panel');
    if (savedMain) document.documentElement.style.setProperty('--bg-main', savedMain);
    if (savedPanel) document.documentElement.style.setProperty('--bg-panel', savedPanel);
}

// ---------- بدء التشغيل ----------
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initSettings();
    updateTasksUI();
    updateCompletedUI();
    applyCurrentTaskToTimer();
    updateLevelAndXP();
    updateStatsUI();
    // إذا لم تكن هناك مهمة حالية ووجدت مهام، اختر الأولى
    if (!currentTaskId && tasks.length) {
        currentTaskId = tasks[0].id;
        applyCurrentTaskToTimer();
        updateTasksUI();
    }
    if (tasks.length === 0) startBtn.disabled = true;
    else startBtn.disabled = false;
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
});
