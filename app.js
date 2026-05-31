// =========================
// CONFIG
// =========================
const FIREBASE_URL = "https://pomodoro-mr-default-rtdb.firebaseio.com";

const modeDurations = {
    pomodoro: 25,
    short: 5,
    long: 15
};

let currentMode = "pomodoro";
let timeLeft = modeDurations[currentMode] * 60;

let timerInterval = null;
let isRunning = false;

let currentTaskIndex = -1;
let pomodoroSessionCounter = 0;

let completedSessionsCount = parseInt(localStorage.getItem("completedSessionsCount")) || 0;

let currentUsername = localStorage.getItem("cloudUsername") || "";
let totalMinutesFocused = 0;

// =========================
// MOTIVATION
// =========================
const motivationPhrases = [
    "ركّز الآن، البدايات تصنع الفارق العظيم!",
    "كل ثانية هنا استثمار في مستقبلك!",
    "لا تستسلم، أنت أقوى مما تظن!",
    "النجاح يُبنى لحظة تركيز واحدة!",
    "تقدّمك اليوم هو إنجازك غداً!"
];

function startMotivationEngine(){
    const el = document.getElementById("motivationDisplay");

    setInterval(() => {
        const random = motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)];

        el.style.opacity = 0;

        setTimeout(() => {
            el.innerText = random;
            el.style.opacity = 1;
        }, 200);

    }, 10000);
}

// =========================
// INIT
// =========================
window.onload = () => {
    clearFirebaseDatabase();
    loadTodos();
    updateTimerDisplay();
    startMotivationEngine();
    fetchLeaderboard();
};

// =========================
// FIREBASE RESET
// =========================
function clearFirebaseDatabase(){
    if(!FIREBASE_URL) return;

    fetch(`${FIREBASE_URL}/users.json`, { method: "DELETE" })
    .then(() => {
        localStorage.removeItem("todos");
        localStorage.removeItem("cloudUsername");
        localStorage.removeItem("completedSessionsCount");

        completedSessionsCount = 0;
        currentUsername = "";

        document.getElementById("sessionCountDisplay").innerText = 0;

        fetchLeaderboard();
    })
    .catch(() => {
        fetchLeaderboard();
    });
}

// =========================
// TIMER CORE
// =========================
function toggleTimer(){
    if(isRunning){
        clearInterval(timerInterval);
        isRunning = false;
        document.getElementById("startBtn").innerText = "استئناف ⏸️";
        return;
    }

    let todos = getTodos();

    if(currentMode === "pomodoro" && todos.length === 0){
        alert("أضف مهمة أولاً");
        return;
    }

    isRunning = true;
    document.getElementById("startBtn").innerText = "إيقاف ⏸️";

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if(timeLeft <= 0){
            clearInterval(timerInterval);
            isRunning = false;
            handleSessionEnd();
        }
    }, 1000);
}

function resetTimer(){
    clearInterval(timerInterval);
    isRunning = false;

    timeLeft = modeDurations[currentMode] * 60;

    updateTimerDisplay();
}

// =========================
// SESSION LOGIC
// =========================
function handleSessionEnd(){
    let todos = getTodos();

    if(currentMode === "pomodoro"){
        completedSessionsCount++;
        localStorage.setItem("completedSessionsCount", completedSessionsCount);

        document.getElementById("sessionCountDisplay").innerText = completedSessionsCount;

        if(todos[currentTaskIndex]){
            todos[currentTaskIndex].rounds--;

            if(todos[currentTaskIndex].rounds <= 0){
                todos[currentTaskIndex].completed = true;
            }
        }

        localStorage.setItem("todos", JSON.stringify(todos));
        renderTodos();

        pomodoroSessionCounter++;

        setMode(pomodoroSessionCounter >= 3 ? "long" : "short");
        pomodoroSessionCounter = pomodoroSessionCounter >= 3 ? 0 : pomodoroSessionCounter;

    } else {
        setMode("pomodoro");
    }

    toggleTimer();
}

// =========================
// MODE SWITCH
// =========================
function setMode(mode){
    currentMode = mode;
    timeLeft = modeDurations[mode] * 60;

    updateTimerDisplay();

    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(mode + "Mode").classList.add("active");

    const taskEl = document.getElementById("currentTaskDisplay");

    if(mode === "pomodoro"){
        const todos = getTodos();
        if(todos[currentTaskIndex]){
            taskEl.innerText = "التركيز: " + todos[currentTaskIndex].text;
        } else {
            taskEl.innerText = "أضف مهمة";
        }
    } else {
        taskEl.innerText = "استراحة";
    }
}

// =========================
// TASKS
// =========================
function addTodo(){
    const text = document.getElementById("todoInput").value.trim();
    const minutes = parseInt(document.getElementById("todoMinutesInput").value) || 25;
    const rounds = parseInt(document.getElementById("todoRoundsInput").value) || 1;

    if(!text) return;

    let todos = getTodos();

    todos.push({
        text,
        minutes,
        rounds,
        completed: false
    });

    saveTodos(todos);

    document.getElementById("todoInput").value = "";
    renderTodos();

    if(currentTaskIndex === -1){
        currentTaskIndex = 0;
    }
}

function selectTask(i){
    const todos = getTodos();
    if(!todos[i] || todos[i].completed) return;

    currentTaskIndex = i;

    clearInterval(timerInterval);
    isRunning = false;

    timeLeft = todos[i].minutes * 60;

    updateTimerDisplay();
    renderTodos();
}

function deleteTodo(i){
    let todos = getTodos();
    todos.splice(i,1);

    saveTodos(todos);

    if(currentTaskIndex === i){
        currentTaskIndex = -1;
    }

    renderTodos();
}

// =========================
// STORAGE HELPERS
// =========================
function getTodos(){
    return JSON.parse(localStorage.getItem("todos")) || [];
}

function saveTodos(todos){
    localStorage.setItem("todos", JSON.stringify(todos));
}

// =========================
// UI RENDER
// =========================
function renderTodos(){
    const tbody = document.getElementById("todoTableBody");
    tbody.innerHTML = "";

    const todos = getTodos();

    if(todos.length === 0){
        tbody.innerHTML = `<tr><td colspan="4">لا توجد مهام</td></tr>`;
        return;
    }

    todos.forEach((t,i) => {
        const tr = document.createElement("tr");

        if(i === currentTaskIndex){
            tr.classList.add("active-task");
        }

        tr.innerHTML = `
            <td onclick="selectTask(${i})">${t.text}</td>
            <td>${t.minutes}</td>
            <td>${t.rounds}</td>
            <td><button onclick="deleteTodo(${i})">حذف</button></td>
        `;

        tbody.appendChild(tr);
    });
}

// =========================
// TIMER DISPLAY
// =========================
function updateTimerDisplay(){
    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;

    document.getElementById("timer").innerText =
        `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

// =========================
// LEADERBOARD (simple fallback)
// =========================
function fetchLeaderboard(){
    const tbody = document.getElementById("leaderboardBody");

    tbody.innerHTML = `
        <tr>
            <td>1</td>
            <td>Local User</td>
            <td>${Math.floor(completedSessionsCount/4)}</td>
            <td>🏆</td>
        </tr>
    `;
}
