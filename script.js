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

const sessionsCount = document.getElementById("sessionsCount");

const motivationText = document.getElementById("motivationText");
const historyList = document.getElementById("historyList");

/* ================= STATE ================= */

let tasks = JSON.parse(localStorage.getItem("pomodoroTasks")) || [];
let history = JSON.parse(localStorage.getItem("pomodoroHistory")) || [];

let totalSessions = 0;

let timer = null;

let currentSeconds = 0;
let initialSeconds = 0;

let currentTaskIndex = 0;

let isBreak = false;
let cycleCounter = 0;
let finishedAllTasks = false;

/* ================= MOTIVATION ================= */

const quotes = [
"ابدأ الآن.",
"التركيز يصنع الفرق.",
"خطوة صغيرة اليوم = إنجاز كبير غداً.",
"لا تؤجل النجاح.",
"استمر... أنت تتحسن."
];

/* ================= SAVE ================= */

function saveData(){
localStorage.setItem("pomodoroTasks", JSON.stringify(tasks));
localStorage.setItem("pomodoroHistory", JSON.stringify(history));
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

tasks.forEach(t=>{

const div=document.createElement("div");
div.className="task-item";

div.innerHTML=`
<div>
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

currentSeconds = 0;
initialSeconds = 1;

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

/* ================= TIMER ================= */

function updateTimer(){

const min = Math.floor(currentSeconds/60);
const sec = Math.floor(currentSeconds%60);

timerElement.textContent =
`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

}

/* ================= TIMER ENGINE ================= */

function startTimer(){

if(timer) return;

timer = setInterval(()=>{

currentSeconds--;

if(currentSeconds <= 0){
currentSeconds = 0;
updateTimer();
finishSession();
return;
}

updateTimer();

},1000);

}

function pauseTimer(){
clearInterval(timer);
timer = null;
}

function resetTimer(){
pauseTimer();
currentSeconds = initialSeconds;
updateTimer();
}

/* ================= CONTROLS ================= */

startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;

plusBtn.onclick = ()=>{
currentSeconds += 60;
initialSeconds += 60;
updateTimer();
};

nextBtn.onclick = finishSession;

/* ================= SESSION LOGIC ================= */

function finishSession(){

alarm.currentTime = 0;
alarm.volume = 0.5;
alarm.play();

pauseTimer();

if(tasks.length === 0) return;

/* ===== WORK SESSION ===== */
if(!isBreak){

const t = tasks[currentTaskIndex];

totalSessions++;

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
breakMin === 15 ? "استراحة طويلة ☕" : "استراحة قصيرة ☕";

saveData();
renderHistory();
startTimer();

return;
}

/* ===== BREAK END ===== */

isBreak = false;
currentTaskIndex++;

/* ===== END ALL TASKS ===== */
if(currentTaskIndex >= tasks.length){

finishedAllTasks = true;

currentSeconds = 0;
initialSeconds = 1;

currentTask.textContent = "✔ انتهت المهام";
sessionType.textContent = "منجز";

updateTimer();
saveData();
renderHistory();

return;
}

loadTask();
saveData();
renderHistory();
startTimer();

}

/* ================= HISTORY ================= */

function renderHistory(){

historyList.innerHTML="";

if(history.length===0){
historyList.innerHTML="لا توجد جلسات بعد";
return;
}

history.slice(0,20).forEach(h=>{

const div=document.createElement("div");
div.className="history-entry";

div.innerHTML = `<b>${h.text}</b><br>${h.time}`;

historyList.appendChild(div);

});

}

/* ================= MOTIVATION ================= */

setInterval(()=>{

motivationText.textContent =
quotes[Math.floor(Math.random()*quotes.length)];

},8000);

/* ================= INIT ================= */

renderTasks();
renderHistory();
loadTask();
updateTimer();
