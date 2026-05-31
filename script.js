const taskName = document.getElementById("taskName");
const focusTime = document.getElementById("focusTime");
const addTaskBtn = document.getElementById("addTaskBtn");

const taskList = document.getElementById("taskList");

const timerElement = document.getElementById("timer");
const sessionType = document.getElementById("sessionType");
const currentTask = document.getElementById("taskCurrent");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const plusBtn = document.getElementById("plusBtn");
const nextBtn = document.getElementById("nextBtn");

const alarm = document.getElementById("alarmSound");
const ring = document.querySelector(".ring-progress");

const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

ring.style.strokeDasharray = CIRCUMFERENCE;

/* ================= STATE ================= */

let tasks = JSON.parse(localStorage.getItem("pomodoroTasks")) || [];
let history = JSON.parse(localStorage.getItem("pomodoroHistory")) || [];

let totalFocusMinutes = JSON.parse(localStorage.getItem("focusMinutes")) || 0;
let completedSessions = JSON.parse(localStorage.getItem("completedSessions")) || 0;

let timer = null;

let currentSeconds = 0;
let initialSeconds = 0;

let currentTaskIndex = 0;

let isBreak = false;
let cycleCounter = 0;
let finishedAllTasks = false;

/* ================= FOCUS MODE ================= */

let focusMode = false;

/* زر جديد (إن لم يكن موجودًا يتم تجاهله) */
document.addEventListener("keydown",(e)=>{
if(e.key === "F"){
toggleFocusMode();
}
});

/* ================= SAVE ================= */

function saveData(){
localStorage.setItem("pomodoroTasks", JSON.stringify(tasks));
localStorage.setItem("pomodoroHistory", JSON.stringify(history));
localStorage.setItem("focusMinutes", JSON.stringify(totalFocusMinutes));
localStorage.setItem("completedSessions", JSON.stringify(completedSessions));
}

/* ================= SMOOTH TIMER ================= */

let lastTime = null;

function smoothUpdate(timestamp){

if(!lastTime) lastTime = timestamp;

const delta = (timestamp - lastTime) / 1000;

if(timer){

currentSeconds -= delta;

if(currentSeconds <= 0){
currentSeconds = 0;
finishSession();
}

updateTimer();
}

lastTime = timestamp;

requestAnimationFrame(smoothUpdate);
}

/* ================= TIMER UI ================= */

function updateTimer(){

const min = Math.floor(currentSeconds/60);
const sec = Math.floor(currentSeconds%60);

timerElement.textContent =
`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

const progress = currentSeconds / initialSeconds;

const offset =
CIRCUMFERENCE - (progress * CIRCUMFERENCE);

ring.style.strokeDashoffset =
isNaN(offset) ? CIRCUMFERENCE : offset;
}

/* ================= TASKS ================= */

addTaskBtn.addEventListener("click",()=>{

const name = taskName.value.trim();
const focus = parseInt(focusTime.value);

if(!name || !focus) return;

tasks.push({
name,
focus,
break: focus >= 50 ? 10 : 5
});

taskName.value="";
focusTime.value="";

saveData();
renderTasks();

if(tasks.length===1){
currentTaskIndex=0;
loadTask();
}

});

function renderTasks(){

taskList.innerHTML="";

if(tasks.length===0){
taskList.innerHTML="<p>لا توجد مهام</p>";
return;
}

tasks.forEach((t,i)=>{

const div=document.createElement("div");
div.className="task-item";

div.innerHTML=`
<div class="task-info">
<h4>${t.name}</h4>
<p>${t.focus} دقيقة</p>
</div>
`;

taskList.appendChild(div);

});
}

/* ================= LOAD TASK ================= */

function loadTask(){

if(tasks.length===0){
currentTask.textContent="لا توجد مهمة";

currentSeconds=0;
initialSeconds=0;

updateTimer();
return;
}

const t = tasks[currentTaskIndex];

currentTask.textContent = `${t.name} (${t.focus}m)`;

currentSeconds = t.focus * 60;
initialSeconds = currentSeconds;

sessionType.textContent = "تركيز 🎯";

updateTimer();
}

/* ================= START / PAUSE ================= */

function startTimer(){

if(!timer){
timer = true;
requestAnimationFrame(smoothUpdate);
}
}

function pauseTimer(){
timer = null;
}

/* ================= FOCUS MODE ================= */

function toggleFocusMode(){

focusMode = !focusMode;

if(focusMode){
document.documentElement.requestFullscreen?.();
document.body.classList.add("focus-mode");
}else{
document.exitFullscreen?.();
document.body.classList.remove("focus-mode");
}

}

/* ================= CONTROLS ================= */

startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;

resetBtn.onclick = ()=>{
pauseTimer();
currentSeconds = initialSeconds;
updateTimer();
};

plusBtn.onclick = ()=>{
currentSeconds += 60;
initialSeconds += 60;
updateTimer();
};

nextBtn.onclick = finishSession;

/* ================= FINISH LOGIC ================= */

function finishSession(){

alarm.currentTime = 0;
alarm.volume = 0.5;
alarm.play();

pauseTimer();

if(!isBreak){

const t = tasks[currentTaskIndex];

completedSessions++;
totalFocusMinutes += t.focus;

history.unshift({
text:`أنهيت ${t.name}`,
time:new Date().toLocaleString()
});

cycleCounter++;

let breakMin = (cycleCounter >= 3) ? 15 : t.break;

if(cycleCounter >= 3) cycleCounter = 0;

isBreak = true;

currentSeconds = breakMin * 60;
initialSeconds = currentSeconds;

sessionType.textContent =
(cycleCounter===0) ? "استراحة طويلة ☕" : "استراحة قصيرة ☕";

saveData();
startTimer();

return;
}

/* نهاية الاستراحة */

isBreak = false;

currentTaskIndex++;

if(currentTaskIndex >= tasks.length){

finishedAllTasks = true;

currentSeconds = 0;
initialSeconds = 0;

currentTask.textContent = "✔ انتهت المهام";
sessionType.textContent = "منجز";

updateTimer();

saveData();
return;
}

loadTask();
saveData();

startTimer();
}

/* ================= INIT ================= */

renderTasks();
loadTask();
updateTimer();
requestAnimationFrame(smoothUpdate);
