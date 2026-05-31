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

const sessionsCount = document.getElementById("sessionsCount");
const focusHours = document.getElementById("focusHours");
const streakCount = document.getElementById("streakCount");
const completionRate = document.getElementById("completionRate");

const motivationText = document.getElementById("motivationText");
const historyList = document.getElementById("historyList");
const dailyHours = document.getElementById("dailyHours");

const alarm = document.getElementById("alarmSound");

const ring = document.querySelector(".ring-progress");

const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

ring.style.strokeDasharray = CIRCUMFERENCE;

/* ================= DATA ================= */

let tasks = JSON.parse(localStorage.getItem("pomodoroTasks")) || [];
let history = JSON.parse(localStorage.getItem("pomodoroHistory")) || [];
let totalFocusMinutes = JSON.parse(localStorage.getItem("focusMinutes")) || 0;
let completedSessions = JSON.parse(localStorage.getItem("completedSessions")) || 0;

let timer = null;

let currentSeconds = 1500;
let initialSeconds = 1500;

let currentTaskIndex = 0;

let isBreak = false;
let cycleCounter = 0;
let finishedAllTasks = false;

/* ================= QUOTES ================= */

const quotes = [
"ابدأ الآن، لا يوجد وقت مثالي.",
"كل جلسة تقربك من هدفك.",
"المتفوقون لا ينتظرون الدافع.",
"أنت تبني مستقبلك الآن.",
"دقيقة تركيز أفضل من ساعة تسويف.",
"استمر... الإنجاز يتراكم.",
"لا تتوقف قبل أن تفخر بنفسك.",
"جلسة جديدة = خطوة جديدة."
];

/* ================= SAVE ================= */

function saveData(){
localStorage.setItem("pomodoroTasks", JSON.stringify(tasks));
localStorage.setItem("pomodoroHistory", JSON.stringify(history));
localStorage.setItem("focusMinutes", JSON.stringify(totalFocusMinutes));
localStorage.setItem("completedSessions", JSON.stringify(completedSessions));
}

/* ================= TASKS ================= */

function renderTasks(){
taskList.innerHTML="";

if(tasks.length===0){
taskList.innerHTML="<p>لا توجد مهام بعد</p>";
return;
}

tasks.forEach((task,index)=>{
const div=document.createElement("div");
div.className="task-item";

div.innerHTML=`
<div class="task-info">
<h4>${task.name}</h4>
<p>تركيز: ${task.focus} دقيقة | استراحة: ${task.break}</p>
</div>
<button class="delete-task" onclick="deleteTask(${index})">حذف</button>
`;

taskList.appendChild(div);
});
}

window.deleteTask=(index)=>{
tasks.splice(index,1);
saveData();
renderTasks();
};

/* ================= ADD TASK ================= */

addTaskBtn.addEventListener("click",()=>{

const name = taskName.value.trim();
const focus = parseInt(focusTime.value);

if(!name || !focus) return;

let breakTime = focus >= 50 ? 10 : 5;

tasks.push({
name,
focus,
break: breakTime
});

taskName.value="";
focusTime.value="";

saveData();
renderTasks();

/* إذا أول مهمة → تشغيل تلقائي */
if(tasks.length===1){
currentTaskIndex=0;
loadTask();
}

});

/* ================= TIMER ================= */

function updateTimer(){

const min = Math.floor(currentSeconds/60);
const sec = currentSeconds%60;

timerElement.textContent =
`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

const progress = currentSeconds / initialSeconds;

ring.style.strokeDashoffset =
CIRCUMFERENCE - (progress * CIRCUMFERENCE);
}

function startTimer(){
if(timer) return;

timer=setInterval(()=>{
currentSeconds--;
updateTimer();

if(currentSeconds<=0){
clearInterval(timer);
timer=null;
finishSession();
}

},1000);
}

function pauseTimer(){
clearInterval(timer);
timer=null;
}

function resetTimer(){
pauseTimer();
currentSeconds=initialSeconds;
updateTimer();
}

/* ================= CONTROLS ================= */

startBtn.onclick=()=>{

if(finishedAllTasks){
currentTaskIndex=0;
finishedAllTasks=false;
loadTask();
}

startTimer();
};

pauseBtn.onclick=pauseTimer;
resetBtn.onclick=resetTimer;

plusBtn.onclick=()=>{
currentSeconds+=60;
initialSeconds+=60;
updateTimer();
};

nextBtn.onclick=finishSession;

/* ================= CORE LOGIC ================= */

function loadTask(){

if(tasks.length===0){
currentTask.textContent="لا توجد مهمة";
currentSeconds=0;
initialSeconds=1;
updateTimer();
return;
}

const task = tasks[currentTaskIndex];

currentTask.textContent = task.name;
currentSeconds = task.focus * 60;
initialSeconds = currentSeconds;

sessionType.textContent="تركيز 🎯";
updateTimer();
}

function finishSession(){

if(tasks.length===0) return;

alarm.play();
pauseTimer();

/* ===== END FOCUS ===== */
if(!isBreak){

const task = tasks[currentTaskIndex];

completedSessions++;
totalFocusMinutes += task.focus;

history.unshift({
text:`أنهيت ${task.name}`,
time:new Date().toLocaleString()
});

cycleCounter++;

let breakMinutes = (cycleCounter >= 3) ? 15 : task.break;

if(cycleCounter >= 3) cycleCounter = 0;

sessionType.textContent =
(cycleCounter===0) ? "استراحة طويلة ☕" : "استراحة قصيرة ☕";

currentSeconds = breakMinutes * 60;
initialSeconds = currentSeconds;

isBreak = true;

saveData();
updateStats();
renderHistory();
updateChart();
updateTimer();
startTimer();

return;
}

/* ===== END BREAK ===== */

isBreak = false;
currentTaskIndex++;

/* انتهت كل المهام */
if(currentTaskIndex >= tasks.length){

finishedAllTasks = true;

currentTask.textContent = "✅ انتهت جميع المهام";
sessionType.textContent = "منجز";
currentSeconds = 0;
initialSeconds = 1;

updateTimer();
saveData();
updateStats();
renderHistory();
updateChart();

return;
}

/* المهمة التالية */
loadTask();
saveData();
updateStats();
renderHistory();
updateChart();

startTimer();
}

/* ================= HISTORY ================= */

function renderHistory(){

historyList.innerHTML="";

if(history.length===0){
historyList.innerHTML="لا توجد جلسات بعد";
return;
}

history.slice(0,20).forEach(item=>{
const div=document.createElement("div");
div.className="history-entry";
div.innerHTML=`<b>${item.text}</b><br>${item.time}`;
historyList.appendChild(div);
});
}

/* ================= STATS ================= */

function updateStats(){

sessionsCount.textContent = completedSessions;
focusHours.textContent = (totalFocusMinutes/60).toFixed(1);
dailyHours.textContent = (totalFocusMinutes/60).toFixed(1)+" ساعة";
streakCount.textContent = Math.floor(completedSessions/3);

completionRate.textContent =
tasks.length
? Math.min(100, Math.round((completedSessions/tasks.length)*100))+"%"
: "0%";
}

/* ================= MOTIVATION ================= */

setInterval(()=>{
motivationText.textContent =
quotes[Math.floor(Math.random()*quotes.length)];
},8000);

/* ================= CHART ================= */

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
let day=new Date().getDay();
arr[day]=(totalFocusMinutes/60).toFixed(1);

chart.data.datasets[0].data=arr;
chart.update();
}

/* ================= INIT ================= */

renderTasks();
renderHistory();
updateStats();
loadTask();
updateChart();
updateTimer();
