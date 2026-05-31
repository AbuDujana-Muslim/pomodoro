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

let tasks = JSON.parse(localStorage.getItem("pomodoroTasks")) || [];

let history = JSON.parse(localStorage.getItem("pomodoroHistory")) || [];

let totalFocusMinutes =
JSON.parse(localStorage.getItem("focusMinutes")) || 0;

let completedSessions =
JSON.parse(localStorage.getItem("completedSessions")) || 0;

let timer = null;

let currentSeconds = 1500;
let initialSeconds = 1500;

let currentTaskIndex = 0;

let isBreak = false;

let cycleCounter = 0;

const quotes = [

"ابدأ الآن، لا يوجد وقت مثالي.",
"كل جلسة تقربك من هدفك.",
"المتفوقون لا ينتظرون الدافع.",
"أنت تبني مستقبلك الآن.",
"دقيقة تركيز أفضل من ساعة تسويف.",
"استمر... الإنجاز يتراكم.",
"كل صفحة تقرؤها استثمار.",
"لا تتوقف قبل أن تفخر بنفسك.",
"جلسة جديدة = خطوة جديدة.",
"العظماء يربحون بالعادات الصغيرة."

];

function saveData(){

localStorage.setItem(
"pomodoroTasks",
JSON.stringify(tasks)
);

localStorage.setItem(
"pomodoroHistory",
JSON.stringify(history)
);

localStorage.setItem(
"focusMinutes",
JSON.stringify(totalFocusMinutes)
);

localStorage.setItem(
"completedSessions",
JSON.stringify(completedSessions)
);

}

function renderTasks(){

taskList.innerHTML="";

if(tasks.length===0){

taskList.innerHTML=
"<p>لا توجد مهام بعد</p>";

return;
}

tasks.forEach((task,index)=>{

const div=document.createElement("div");

div.className="task-item";

div.innerHTML=`

<div class="task-info">
<h4>${task.name}</h4>
<p>
تركيز: ${task.focus} دقيقة
|
استراحة: ${task.break} دقيقة
</p>
</div>

<button
class="delete-task"
onclick="deleteTask(${index})">
حذف
</button>

`;

taskList.appendChild(div);

});

}

function deleteTask(index){

tasks.splice(index,1);

saveData();

renderTasks();

}

window.deleteTask=deleteTask;

addTaskBtn.addEventListener("click",()=>{

const name=taskName.value.trim();

const focus=parseInt(focusTime.value);

if(!name || !focus) return;

let breakTime=5;

if(focus>=50){
breakTime=10;
}

tasks.push({

name,
focus,
break:breakTime

});

taskName.value="";
focusTime.value="";

saveData();
renderTasks();

});

function updateTimer(){

const min=
Math.floor(currentSeconds/60);

const sec=
currentSeconds%60;

timerElement.textContent=
`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

const progress =
currentSeconds / initialSeconds;

ring.style.strokeDashoffset =
CIRCUMFERENCE -
(progress*CIRCUMFERENCE);

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

startBtn.onclick=startTimer;
pauseBtn.onclick=pauseTimer;
resetBtn.onclick=resetTimer;

plusBtn.onclick=()=>{

currentSeconds+=60;
initialSeconds+=60;

updateTimer();

};

nextBtn.onclick=()=>{

finishSession();

};

function finishSession(){

alarm.play();

if(!isBreak){

completedSessions++;

cycleCounter++;

const task=tasks[currentTaskIndex];

if(task){

totalFocusMinutes+=task.focus;

history.unshift({

text:`تم إنهاء جلسة ${task.name}`,

time:new Date().toLocaleString()

});

}

if(cycleCounter>=3){

currentSeconds=15*60;
initialSeconds=currentSeconds;

sessionType.textContent=
"استراحة طويلة ☕";

cycleCounter=0;

}
else{

const task=tasks[currentTaskIndex];

if(task){

currentSeconds=
task.break*60;

initialSeconds=
currentSeconds;

sessionType.textContent=
"استراحة قصيرة";

}

}

isBreak=true;

}
else{

currentTaskIndex++;

if(currentTaskIndex>=tasks.length){

currentTaskIndex=0;
}

loadTask();

isBreak=false;

}

saveData();

updateStats();

renderHistory();

updateChart();

updateTimer();

}

function loadTask(){

if(tasks.length===0){

currentTask.textContent=
"لا توجد مهمة";

currentSeconds=1500;
initialSeconds=1500;

return;
}

const task=tasks[currentTaskIndex];

currentTask.textContent=
task.name;

currentSeconds=
task.focus*60;

initialSeconds=
currentSeconds;

sessionType.textContent=
"تركيز";

updateTimer();

}

function renderHistory(){

historyList.innerHTML="";

if(history.length===0){

historyList.innerHTML=
"لا توجد جلسات بعد";

return;
}

history.slice(0,20).forEach(item=>{

const div=
document.createElement("div");

div.className=
"history-entry";

div.innerHTML=
`<b>${item.text}</b><br>${item.time}`;

historyList.appendChild(div);

});

}

function updateStats(){

sessionsCount.textContent=
completedSessions;

focusHours.textContent=
(totalFocusMinutes/60).toFixed(1);

dailyHours.textContent=
(totalFocusMinutes/60).toFixed(1)+" ساعة";

streakCount.textContent=
Math.floor(completedSessions/3);

let completed=
completedSessions;

let total=
tasks.length || 1;

completionRate.textContent=
Math.min(
100,
Math.round((completed/total)*100)
)+"%";

}

setInterval(()=>{

const random=
quotes[
Math.floor(
Math.random()*quotes.length
)
];

motivationText.textContent=
random;

},8000);

const ctx=
document.getElementById("focusChart");

const chart=
new Chart(ctx,{

type:"bar",

data:{

labels:[
"الإثنين",
"الثلاثاء",
"الأربعاء",
"الخميس",
"الجمعة",
"السبت",
"الأحد"
],

datasets:[{

label:"ساعات التركيز",

data:[0,0,0,0,0,0,0]

}]

},

options:{

responsive:true,

plugins:{

legend:{
labels:{
color:"white"
}
}

},

scales:{

y:{
ticks:{
color:"white"
}
},

x:{
ticks:{
color:"white"
}
}

}

}

});

function updateChart(){

let arr=[0,0,0,0,0,0,0];

const day=
new Date().getDay();

arr[day]=
(totalFocusMinutes/60).toFixed(1);

chart.data.datasets[0].data=
arr;

chart.update();

}

renderTasks();

renderHistory();

updateStats();

loadTask();

updateChart();

updateTimer();
