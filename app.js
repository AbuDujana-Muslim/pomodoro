// المتغيرات المركزية وإدارة الحالة
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
    audioCtx: null,
    currentSound: ''
};

const audioFiles = {
    'rain': './rain.mp3',
    'wind': './wind.mp3',
    'brown': './brown.mp3',
    'white': './white.mp3',
    'pink': './pink.mp3',
    'cafe': './cafe.mp3'
};

const focusPlayer = document.getElementById('focusAudio');
const display = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const sessionCounter = document.getElementById('sessionCounter');
const timerRing = document.getElementById('timerRing');
const timerLabel = document.getElementById('timerLabel');

// دوال التنقل بين الواجهات
function toggleSidebar() {
    if (window.innerWidth > 1024) document.getElementById('mainSidebar').classList.toggle('collapsed');
}

function switchView(viewId, navElement) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    navElement.classList.add('active');
}

// تخصيص المظهر
function setThemeColor(color, el) {
    document.documentElement.style.setProperty('--theme-color', color);
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if(el) el.classList.add('active');
    saveData(); 
}

function setThemeBg(mainBg, panelBg, el) {
    document.documentElement.style.setProperty('--bg-main', mainBg);
    document.documentElement.style.setProperty('--bg-panel', panelBg);
    document.querySelectorAll('.bg-box').forEach(b => b.classList.remove('active'));
    if(el) el.classList.add('active');
    saveData(); 
}

function toggleFullscreenTimer() {
    const container = document.querySelector('.app-container');
    const icon = document.querySelector('.btn-fullscreen i');
    container.classList.toggle('fullscreen-timer');
    icon.className = container.classList.contains('fullscreen-timer') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
}

// نظام الإعدادات التلقائية
function toggleAutoBreak(checked) { AppState.autoStartBreak = checked; saveData(); }
function toggleAutoSession(checked) { AppState.autoStartSession = checked; saveData(); }

// إدارة الأصوات
function toggleAudio(type, element) {
    document.querySelectorAll('.sound-card').forEach(c => c.classList.remove('active'));
    if (AppState.currentSound === type) {
        if (focusPlayer.paused) { focusPlayer.play(); element.classList.add('active'); } 
        else { focusPlayer.pause(); }
    } else {
        focusPlayer.src = audioFiles[type];
        focusPlayer.play();
        AppState.currentSound = type;
        element.classList.add('active');
    }
}

function changeVolume(val) { focusPlayer.volume = val; }

function playSoftBell() {
    if (!AppState.audioCtx) AppState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (AppState.audioCtx.state === 'suspended') AppState.audioCtx.resume();
    
    const osc = AppState.audioCtx.createOscillator();
    const gain = AppState.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(AppState.audioCtx.destination);
    
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(523, AppState.audioCtx.currentTime);
    gain.gain.setValueAtTime(0, AppState.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, AppState.audioCtx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, AppState.audioCtx.currentTime + 3);
    
    osc.start(AppState.audioCtx.currentTime);
    osc.stop(AppState.audioCtx.currentTime + 3);
}

// تحديثات الشاشة ونمو النبتة
function updateDisplay() {
    let m = Math.floor(AppState.timeLeft / 60);
    let s = Math.floor(AppState.timeLeft % 60);
    display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
    updatePlantEvolution(); 
}

function addMinute() {
    if (AppState.currentTaskIndex !== -1 && AppState.timeLeft >= 0) {
        AppState.timeLeft += 60;
        updateDisplay();
    }
}

function updatePlantEvolution() {
    const plantDisplay = document.getElementById('mainPlantDisplay');
    if (AppState.currentTaskIndex === -1) {
        plantDisplay.textContent = '🌱';
        if(window.innerWidth > 1024) plantDisplay.style.fontSize = '110px';
        return;
    }

    let task = AppState.tasks[AppState.currentTaskIndex];
    let totalSecondsPerRound = Math.floor(task.minutes * 60);
    let currentRoundProgress = Math.floor((totalSecondsPerRound - AppState.timeLeft) * 100 / totalSecondsPerRound) / 100;
    if (AppState.isBreakTime) currentRoundProgress = 1; 

    let totalProgress = Math.floor(((AppState.currentRound - 1) + currentRoundProgress) * 100 / task.rounds) / 100;
    if (totalProgress > 1) totalProgress = 1;
    if (totalProgress < 0) totalProgress = 0;

    const stages = ['🌱', '🌿', '🪴', '🌳'];
    let stageIndex = Math.floor(totalProgress * (stages.length - 1));
    if (totalProgress >= 1) stageIndex = stages.length - 1;

    plantDisplay.textContent = stages[stageIndex];
    plantDisplay.style.fontSize = (stageIndex === stages.length - 1) 
        ? (window.innerWidth > 1024 ? '160px' : '110px') 
        : (window.innerWidth > 1024 ? '110px' : '85px');
}

// نظام إدارة المهام
function addNewTask() {
    let name = document.getElementById('taskNameInput').value;
    let mins = Math.floor(parseInt(document.getElementById('taskMinInput').value));
    let rounds = Math.floor(parseInt(document.getElementById('taskRoundsInput').value));

    if (!name || isNaN(mins) || isNaN(rounds) || mins <= 0 || rounds <= 0) return;

    AppState.tasks.push({ name, minutes: mins, rounds: rounds, completed: false });
    
    document.getElementById('taskNameInput').value = '';
    document.getElementById('taskMinInput').value = '';
    document.getElementById('taskRoundsInput').value = '';

    renderTasks();
    saveData(); 
    if (AppState.currentTaskIndex === -1) loadNextIncompleteTask(0);
}

function renderTasks() {
    let pendingList = document.getElementById('pendingTaskList');
    let completedList = document.getElementById('completedTaskList');
    pendingList.innerHTML = ''; completedList.innerHTML = '';
    let pendingCount = 0; AppState.statTasksCompleted = 0;

    AppState.tasks.forEach((t, i) => {
        let htmlStr = `
            <li class="task-item ${t.completed ? 'completed-task' : (i === AppState.currentTaskIndex ? 'active' : '')}">
                <div style="display: flex; gap: 10px; align-items: center; width: 100%; justify-content: space-between;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px; ${t.completed ? 'text-decoration: line-through;' : ''}">${t.name}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${t.minutes} د | ${t.rounds} جولات</div>
                    </div>
                    <div class="check-circle" onclick="${!t.completed ? `toggleTaskCompletion(${i})` : ''}">
                        ${t.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                </div>
            </li>`;
        if (t.completed) { AppState.statTasksCompleted++; completedList.innerHTML += htmlStr; } 
        else { pendingCount++; pendingList.innerHTML += htmlStr; }
    });

    document.getElementById('pendingTasksCount').innerText = `${pendingCount} مهام`;
    document.getElementById('completedTasksCount').innerText = `${AppState.statTasksCompleted} مهام`;
    document.getElementById('statTasks').innerText = Math.floor(AppState.statTasksCompleted);
}

function toggleTaskCompletion(index) {
    AppState.tasks[index].completed = true;
    saveData(); 
    if(index === AppState.currentTaskIndex) skipRound(); else renderTasks();
}

function loadNextIncompleteTask(startIndex) {
    let nextIndex = -1;
    for(let i = startIndex; i < AppState.tasks.length; i++) { if(!AppState.tasks[i].completed) { nextIndex = i; break; } }

    if (nextIndex !== -1) {
        AppState.currentTaskIndex = nextIndex;
        AppState.currentRound = 1;
        AppState.isBreakTime = false;
        timerRing.classList.remove('break-mode');
        timerLabel.innerText = "وقت التركيز";
        
        let task = AppState.tasks[nextIndex];
        AppState.timeLeft = Math.floor(task.minutes * 60);
        sessionCounter.innerText = `⏳ ${task.name} (جولة ${AppState.currentRound}/${task.rounds})`;
        startBtn.disabled = false;
        document.getElementById('plantSpeech').innerText = "ركز الآن، سنرتاح لاحقاً! 🎯";
    } else {
        AppState.currentTaskIndex = -1;
        AppState.timeLeft = 0;
        sessionCounter.innerText = "لا توجد مهام معلقة! 🏆";
        startBtn.disabled = true;
        timerLabel.innerText = "انتهى العمل";
        document.getElementById('plantSpeech').innerText = "عمل رائع! لقد أنجزت كل المهام المدرجة 🌟";
        
        const plantDisplay = document.getElementById('mainPlantDisplay');
        plantDisplay.textContent = '🌳';
        plantDisplay.style.fontSize = window.innerWidth > 1024 ? '160px' : '110px'; 
    }
    updateDisplay();
    renderTasks();
}

// نظام إدارة الجلسات والمؤقت
function toggleTimer() {
    if (AppState.currentTaskIndex === -1) return;
    if (!AppState.audioCtx) AppState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    if (AppState.isRunning) {
        clearInterval(AppState.timerId);
        startBtn.innerHTML = 'استئناف ▶';
        AppState.isRunning = false;
    } else {
        startBtn.innerHTML = 'إيقاف ⏸';
        AppState.isRunning = true;
        AppState.timerId = setInterval(() => {
            if (AppState.timeLeft > 0) { AppState.timeLeft--; updateDisplay(); } 
            else {
                clearInterval(AppState.timerId);
                AppState.isRunning = false;
                startBtn.innerHTML = 'متابعة ▶';
                handleTimerEnd();
            }
        }, 1000);
    }
}

function skipRound() {
    if (AppState.isRunning) toggleTimer();
    if (AppState.currentTaskIndex !== -1) handleTimerEnd();
}

function resetTimer() {
    if (AppState.currentTaskIndex !== -1) {
        if (AppState.isRunning) toggleTimer();
        let task = AppState.tasks[AppState.currentTaskIndex];
        AppState.timeLeft = AppState.isBreakTime ? Math.floor(Math.ceil(task.minutes * 0.2) * 60) : Math.floor(task.minutes * 60);
        updateDisplay();
    }
}

function handleTimerEnd() {
    playSoftBell();
    let task = AppState.tasks[AppState.currentTaskIndex];

    if (!AppState.isBreakTime) {
        AppState.statRoundsCount++;
        document.getElementById('statRounds').innerText = Math.floor(AppState.statRoundsCount);
        gainXP(task.minutes);
        saveData(); 

        if (AppState.currentRound < task.rounds) {
            AppState.isBreakTime = true;
            let breakMins = Math.floor(Math.ceil(task.minutes * 0.2)); 
            AppState.timeLeft = Math.floor(breakMins * 60);
            
            timerRing.classList.add('break-mode');
            timerLabel.innerText = "وقت الاستراحة";
            sessionCounter.innerText = `☕ استراحة (${breakMins} دقائق)`;
            document.getElementById('plantSpeech').innerText = "استرخِ قليلاً، خذ نفساً عميقاً 😌";
            
            updateDisplay();
            if (AppState.autoStartBreak) setTimeout(() => { toggleTimer(); }, 200);
        } else {
            task.completed = true;
            renderTasks();
            saveData();
            loadNextIncompleteTask(0); 
            if (AppState.currentTaskIndex !== -1 && AppState.autoStartSession) setTimeout(() => { toggleTimer(); }, 200);
            return;
        }
    } else {
        AppState.isBreakTime = false;
        AppState.currentRound++;
        AppState.timeLeft = Math.floor(task.minutes * 60);
        
        timerRing.classList.remove('break-mode');
        timerLabel.innerText = "وقت التركيز";
        sessionCounter.innerText = `⏳ ${task.name} (جولة ${AppState.currentRound}/${task.rounds})`;
        document.getElementById('plantSpeech').innerText = "عدنا للعمل! 💪";
        
        updateDisplay();
        if (AppState.autoStartSession) setTimeout(() => { toggleTimer(); }, 200);
    }
}

// نظام الخبرة والمستويات
function gainXP(minutes) {
    AppState.totalXP += Math.floor(minutes * 10);
    updateXPUI();
}

function updateXPUI() {
    let lvl = Math.floor((1 + Math.sqrt(1 + 0.008 * AppState.totalXP)) / 2);
    let xpForCurrentLvl = Math.floor(500 * lvl * (lvl - 1));
    let xpNeededForNextLvl = Math.floor(lvl * 1000);
    let currentLevelXP = Math.floor(AppState.totalXP - xpForCurrentLvl);
    let percentage = Math.floor((currentLevelXP * 100) / xpNeededForNextLvl);

    document.getElementById('userLevelDisplay').innerText = `مستوى المستخدم Lv. ${lvl}`;
    document.getElementById('statUser').innerText = `Lv. ${lvl}`;
    document.getElementById('xpBar').style.width = `${percentage}%`;
    document.getElementById('xpDisplay').innerText = `${currentLevelXP} / ${xpNeededForNextLvl} XP`;
}

// نظام الحفظ المحوري
function saveData() {
    const data = {
        tasks: AppState.tasks, totalXP: Math.floor(AppState.totalXP), statRounds: Math.floor(AppState.statRoundsCount),
        themeColor: getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim(),
        themeMainBg: getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim(),
        themePanelBg: getComputedStyle(document.documentElement).getPropertyValue('--bg-panel').trim(),
        autoStartBreak: AppState.autoStartBreak, autoStartSession: AppState.autoStartSession
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

        document.getElementById('autoBreakToggle').checked = AppState.autoStartBreak;
        document.getElementById('autoSessionToggle').checked = AppState.autoStartSession;
        
        if(parsed.themeColor) document.documentElement.style.setProperty('--theme-color', parsed.themeColor);
        if(parsed.themeMainBg) document.documentElement.style.setProperty('--bg-main', parsed.themeMainBg);
        if(parsed.themePanelBg) document.documentElement.style.setProperty('--bg-panel', parsed.themePanelBg);
        
        document.getElementById('statRounds').innerText = Math.floor(AppState.statRoundsCount);
        updateXPUI(); renderTasks(); loadNextIncompleteTask(0);
    } else {
        updateXPUI();
    }
}

// تسجيل تطبيق الويب (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error('Service Worker Error:', err));
    });
}

window.onload = function() { loadData(); };