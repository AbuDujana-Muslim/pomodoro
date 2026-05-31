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

const sessionsCount = document.getElementById("sessionsCount");
const focusHours = document.getElementById("focusHours");
const streakCount = document.getElementById("streakCount");
const completionRate = document.getElementById("completionRate");

const motivationText = document.getElementById("motivationText");
const historyList = document.getElementById("historyList");
const dailyHours = document.getElementById("dailyHours");

const focusLevel = document.getElementById("focusLevel");

const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

ring.style.strokeDasharray = CIRCUMFERENCE;

/* ===== STATE ===== */

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

/* ===== MOTIVATION ===== */

const quotes = [
"ابدأ الآن، لا يوجد وقت مثالي.",
"كل جلسة تقربك من هدفك.",
"دقيقة تركيز أفضل من ساعة تسويف.",
"استمر... النجاح يتراكم.",
"أنت تبني مستقبلك الآن.",
"لا تؤجل ما يمكنك إنجازه الآن."
];

/* ===== SAVE ===== */

function saveData(){
localStorage.setItem("pomodoroTasks", JSON.stringify(tasks));
localStorage.setItem("pomodoroHistory", JSON.stringify(history));
localStorage.setItem("focusMinutes", JSON.stringify(totalFocusMinutes));
localStorage.setItem("completedSessions", JSON.stringify(completedSessions));
}

/* ===== TASKS ===== */

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

/* ===== LOAD TASK ===== */

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

/* ===== TIMER (SMOOTH) ===== */

function updateTimer(){

const min = Math.floor(currentSeconds / 60);
const sec = Math.floor(currentSeconds % 60);

timerElement.textContent =
`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

const progress = currentSeconds / initialSeconds;

const offset =
CIRCUMFERENCE - (progress * CIRCUMFERENCE);

ring.style.strokeDashoffset =
isNaN(offset) ? CIRCUMFERENCE : offset;
}

/* ===== START ===== */

function startTimer(){

if(timer) return;

timer = setInterval(()=>{

currentSeconds -= 1;

if(currentSeconds <= 0){
currentSeconds = 0;
updateTimer();
finishSession();
return;
}

updateTimer();

},1000);

}

/* ===== PAUSE ===== */

function pauseTimer(){
clearInterval(timer);
timer = null;
}

/* ===== RESET ===== */

function resetTimer(){
pauseTimer();
currentSeconds = initialSeconds;
updateTimer();
}

/* ===== CONTROLS ===== */

startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;

plusBtn.onclick = ()=>{
currentSeconds += 60;
initialSeconds += 60;
updateTimer();
};

nextBtn.onclick = finishSession;

/* ===== FINISH SESSION ===== */

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
(breakMin === 15) ? "استراحة طويلة ☕" : "استراحة قصيرة ☕";

saveData();
updateStats();
renderHistory();
updateChart();
updateTimer();

startTimer();
return;
}

/* ===== BREAK DONE ===== */

isBreak = false;

currentTaskIndex++;

/* انتهت المهام */
if(currentTaskIndex >= tasks.length){

finishedAllTasks = true;

currentSeconds = 0;
initialSeconds = 0;

currentTask.textContent = "✔ انتهت جميع المهام";
sessionType.textContent = "منجز";

updateTimer();
saveData();
updateStats();
renderHistory();
updateChart();

return;
}

loadTask();
saveData();
updateStats();
renderHistory();
updateChart();

startTimer();

}

/* ===== HISTORY ===== */

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

/* ===== ANALYTICS ===== */

function updateStats(){

sessionsCount.textContent = completedSessions;

focusHours.textContent =
(totalFocusMinutes / 60).toFixed(1);

streakCount.textContent =
Math.floor(completedSessions / 3);

const rate = tasks.length
? (completedSessions / tasks.length) * 100
: 0;

completionRate.textContent =
Math.min(100, Math.round(rate)) + "%";

/* Bars */
document.getElementById("sessionsBar").style.width =
Math.min(100, completedSessions * 5) + "%";

document.getElementById("completionBar").style.width =
rate + "%";

/* Radial */
const level =
Math.min(100,
Math.round(rate + (totalFocusMinutes / 10))
);

focusLevel.textContent = level + "%";

const circle =
document.querySelector(".circle-progress");

const radius = 65;
const circumference = 2 * Math.PI * radius;

const offset =
circumference - (level / 100) * circumference;

circle.style.strokeDasharray = circumference;
circle.style.strokeDashoffset = offset;

}

/* ===== CHART ===== */

const ctx = document.getElementById("focusChart");

const chart = new Chart(ctx,{
type:"bar",
data:{
labels:["الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"],
datasets:[{
label:"ساعات التركيز",
data:[0,0,0,0,0,0,0]
}]
},
options:{
responsive:true,
plugins:{
legend:{labels:{color:"white"}}
},
scales:{
x:{ticks:{color:"white"}},
y:{ticks:{color:"white"}}
}
}
});

function updateChart(){

let arr=[0,0,0,0,0,0,0];
let d = new Date().getDay();

arr[d] = (totalFocusMinutes / 60).toFixed(1);

chart.data.datasets[0].data = arr;
chart.update();

}

/* ===== MOTIVATION ===== */

setInterval(()=>{

motivationText.textContent =
quotes[Math.floor(Math.random()*quotes.length)];

},8000);

/* ===== INIT ===== */

renderTasks();
renderHistory();
updateStats();
loadTask();
updateChart();
updateTimer();
