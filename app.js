// ========================
// البيانات والمتغيرات العامة
// ========================
let tasks = [];
let currentTaskId = null;
let timerInterval = null;
let isRunning = false;
let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
let timeLeft = 25 * 60; // 25 دقيقة بالثواني
let pomodorosCompletedToday = 0;
let pomodoroCountForTask = {}; // لتتبع عدد بومودورو لكل مهمة

// العناصر DOM
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const pomodoroBtn = document.getElementById('pomodoroBtn');
const shortBreakBtn = document.getElementById('shortBreakBtn');
const longBreakBtn = document.getElementById('longBreakBtn');
const taskList = document.getElementById('taskList');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const notification = document.getElementById('notification');

// ========================
// دوال الصوت (تم إصلاحها)
// ========================
function playSoftBell() {
    try {
        // تأكد من وجود ملف bell.mp3 في نفس المجلد
        const audio = new Audio('bell.mp3');
        audio.load();
        // محاولة التشغيل مع التعامل مع أخطاء سياسة المتصفح
        audio.play().catch(error => {
            console.warn('فشل تشغيل الصوت تلقائياً:', error);
            // محاولة بديلة: عرض إشعار فقط
        });
    } catch (e) {
        console.error('خطأ في إنشاء الصوت:', e);
    }
}

// ========================
// دوال المؤقت
// ========================
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            // انتهاء الوقت
            clearInterval(timerInterval);
            isRunning = false;
            handleTimerEnd();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    setTimeByMode();
    updateDisplay();
}

function setTimeByMode() {
    if (currentMode === 'pomodoro') {
        timeLeft = 25 * 60;
    } else if (currentMode === 'shortBreak') {
        timeLeft = 5 * 60;
    } else if (currentMode === 'longBreak') {
        timeLeft = 15 * 60;
    }
}

function switchMode(mode) {
    currentMode = mode;
    setTimeByMode();
    updateDisplay();
    pauseTimer();
    // تحديث الشكل النشط للأزرار
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'pomodoro') pomodoroBtn.classList.add('active');
    else if (mode === 'shortBreak') shortBreakBtn.classList.add('active');
    else if (mode === 'longBreak') longBreakBtn.classList.add('active');
}

// ========================
// معالجة نهاية المؤقت (الحدث الرئيسي)
// ========================
function handleTimerEnd() {
    playSoftBell(); // تشغيل صوت التنبيه
    notifyUser(`انتهى وقت ${getModeName()}!`);
    
    if (currentMode === 'pomodoro') {
        // زيادة عدد البومودورو للمهمة الحالية
        if (currentTaskId) {
            pomodoroCountForTask[currentTaskId] = (pomodoroCountForTask[currentTaskId] || 0) + 1;
            saveData();
            updateTaskList(); // تحديث عرض المهام ليعرض عدد البومودورو
        }
        
        // بعد إكمال بومودورو، يمكن الانتقال تلقائيًا للمهمة التالية (اختياري)
        loadNextIncompleteTask();
        
        // تلقائياً انتقل إلى استراحة قصيرة (حسب رغبتك)
        // switchMode('shortBreak');
        // startTimer();
    } else {
        // إذا كانت استراحة، عد إلى وضع البومودورو
        switchMode('pomodoro');
    }
}

function getModeName() {
    if (currentMode === 'pomodoro') return 'جلسة بومودورو';
    if (currentMode === 'shortBreak') return 'استراحة قصيرة';
    return 'استراحة طويلة';
}

function notifyUser(message) {
    // عرض إشعار في واجهة المستخدم
    if (notification) {
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }
    // إشعار المتصفح
    if (Notification.permission === 'granted') {
        new Notification('مؤقت بومودورو', { body: message });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// ========================
// إدارة المهام (To-Do List) وربطها بالمؤقت
// ========================
function loadNextIncompleteTask() {
    const incompleteTasks = tasks.filter(task => !task.completed);
    if (incompleteTasks.length === 0) {
        notifyUser('مبروك! لا توجد مهام متبقية.');
        return;
    }
    // اختر أول مهمة غير مكتملة
    const nextTask = incompleteTasks[0];
    currentTaskId = nextTask.id;
    updateTaskList();
    notifyUser(`المهمة التالية: ${nextTask.text}`);
}

function addTask(taskText) {
    if (!taskText.trim()) return;
    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        pomodoros: 0
    };
    tasks.push(newTask);
    pomodoroCountForTask[newTask.id] = 0;
    if (!currentTaskId || tasks.find(t => t.id === currentTaskId)?.completed) {
        currentTaskId = newTask.id;
    }
    saveData();
    updateTaskList();
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed && currentTaskId === taskId) {
            // إذا اكتملت المهمة الحالية، انتقل للتالية
            loadNextIncompleteTask();
        }
        saveData();
        updateTaskList();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    delete pomodoroCountForTask[taskId];
    if (currentTaskId === taskId) {
        loadNextIncompleteTask();
    }
    saveData();
    updateTaskList();
}

function updateTaskList() {
    if (!taskList) return;
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.id === currentTaskId ? 'active-task' : ''} ${task.completed ? 'completed' : ''}`;
        
        const checkBox = document.createElement('input');
        checkBox.type = 'checkbox';
        checkBox.checked = task.completed;
        checkBox.addEventListener('change', () => toggleTaskComplete(task.id));
        
        const taskTextSpan = document.createElement('span');
        taskTextSpan.textContent = `${task.text} (${pomodoroCountForTask[task.id] || 0} بومودورو)`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✖';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        li.appendChild(checkBox);
        li.appendChild(taskTextSpan);
        li.appendChild(deleteBtn);
        
        // عند النقر على المهمة، اجعلها الحالية
        li.addEventListener('click', (e) => {
            if (e.target !== checkBox && e.target !== deleteBtn) {
                currentTaskId = task.id;
                updateTaskList();
                notifyUser(`تم التبديل إلى المهمة: ${task.text}`);
            }
        });
        
        taskList.appendChild(li);
    });
}

// ========================
// حفظ وتحميل البيانات (localStorage)
// ========================
function saveData() {
    const data = {
        tasks,
        currentTaskId,
        pomodoroCountForTask,
        currentMode,
        timeLeft,
        isRunning,
        pomodorosCompletedToday
    };
    localStorage.setItem('pomodoroData', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('pomodoroData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            tasks = data.tasks || [];
            currentTaskId = data.currentTaskId || null;
            pomodoroCountForTask = data.pomodoroCountForTask || {};
            currentMode = data.currentMode || 'pomodoro';
            timeLeft = data.timeLeft || 25 * 60;
            isRunning = false; // لا نريد تشغيل المؤقت تلقائياً عند التحميل
            pomodorosCompletedToday = data.pomodorosCompletedToday || 0;
            updateDisplay();
            switchMode(currentMode);
            updateTaskList();
        } catch(e) { console.error('خطأ في تحميل البيانات', e); }
    }
}

// ========================
// ربط الأزرار والأحداث عند تحميل الصفحة
// ========================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDisplay();
    
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    pomodoroBtn.addEventListener('click', () => switchMode('pomodoro'));
    shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
    longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
    addTaskBtn.addEventListener('click', () => {
        addTask(newTaskInput.value);
        newTaskInput.value = '';
    });
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask(newTaskInput.value);
            newTaskInput.value = '';
        }
    });
    
    // طلب إذن الإشعارات
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
