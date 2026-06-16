const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const VIEW_W = canvas.width, VIEW_H = canvas.height;

const GRAVITY = 1500;       // 调低重力，保证跳跃抛物线自然
const RUN_SPEED = 275;
const JUMP_VELOCITY = 650;  // 最大跳高约 140px，水平跃距约 230px
const MAX_FALL = 950;
const COYOTE_TIME = 0.11;
const JUMP_BUFFER = 0.12;

const keys = {};
const justPressed = {};
let gameState = "intro";
let levelIndex = 0;
let lastT = 0;
let cameraX = 0;
let cameraTarget = 0;
let damageCooldown = 0;
let interactCooldown = 0;
let doneSteps = new Set();

const stageNames = {
  SPOROZOITE:"子孢子 Sporozoite",
  LIVER_STAGE:"肝期 Liver Stage",
  MEROZOITE:"裂殖子 Merozoite",
  RBC_STAGE:"红细胞期 RBC Stage",
  SCHIZONT:"裂殖体 Schizont",
  GAMETOCYTE:"配子体 Gametocyte"
};

const lifecycleSteps = ["蚊虫叮咬","血液游走","肝细胞发育","红细胞入侵","红细胞增殖","发热周期","配子体形成","宿主转换"];

function P(x,y,w,h){return {x,y,w,h,type:"platform"}}
function MP(x,y,w,h,minX,maxX,vx){return {x,y,w,h,minX,maxX,vx,dx:0,type:"moving"}}
function H(x,y,w,h,type,minX=0,maxX=0,vx=0){return {x,y,w,h,type,minX,maxX,vx,dx:0}}
function C(x,y,type,dev=0){return {x,y,w:24,h:24,type,dev,got:false}}
function S(x,y){return {x,y,w:48,h:16,active:false}}
function D(x,y,w,h){return {x,y,w,h,open:false}}
function CP(x,y){return {x,y,w:26,h:62,active:false}}
function G(x,y){return {x,y,w:64,h:92}}

const levels = [
  {
    title:"第一关：蚊吻入口",
    area:"皮肤微血管",
    stage:"SPOROZOITE",
    worldW:1900,
    bg:["#24242a","#3c2a2b","#12161a"],
    start:{x:46,y:420},
    required:{core:4,switches:1,development:0},
    desc:"从蚊虫叮咬处进入血流。这里加入了缺口、移动免疫细胞、开关门和检查点。",
    objectives:["收集 4 个方向信号", "激活 1 个内皮信号开关", "避开免疫细胞，到达肝脏入口"],
    knowledge:"蚊子叮咬时，疟原虫子孢子进入人体，并随血流向肝脏移动。现实中，防蚊叮咬是阻断疟疾传播的第一环节。",
    platforms:[
      P(0,500,260,40),P(340,500,250,40),P(690,500,240,40),P(1030,500,260,40),P(1410,500,330,40),
      P(180,420,120,18),P(430,385,130,18),P(760,420,130,18),P(1010,360,120,18),P(1260,410,120,18),P(1540,350,130,18)
    ],
    moving:[MP(610,430,110,16,600,760,60),MP(1320,315,100,16,1280,1450,70)],
    hazards:[H(300,462,44,44,"immune",280,500,85),H(850,462,40,40,"drug",760,955,70),H(1160,462,46,46,"immune",1110,1300,92),H(1510,315,38,38,"drug",1490,1690,75)],
    collectibles:[C(230,382,"signal"),C(485,345,"signal"),C(805,382,"signal"),C(1578,312,"signal")],
    switches:[S(1110,342)],
    doors:[D(1360,395,36,105)],
    checkpoints:[CP(650,438),CP(1215,438)],
    gate:G(1775,408)
  },
  {
    title:"第二关：潜入肝脏",
    area:"肝窦 / 肝细胞周围",
    stage:"SPOROZOITE",
    worldW:2050,
    bg:["#1e2420","#334535","#111612"],
    start:{x:50,y:420},
    required:{core:5,switches:2,development:0},
    desc:"纵向爬升关：通过肝窦平台，避开库普弗细胞巡逻，打开两道入口屏障。",
    objectives:["收集 5 个肝细胞定位信号", "激活 2 个入口开关", "进入肝细胞门"],
    knowledge:"子孢子到达肝脏后会穿过肝窦环境并进入肝细胞。库普弗细胞是肝脏内重要的免疫细胞。",
    platforms:[
      P(0,500,300,40),P(380,500,270,40),P(750,500,260,40),P(1110,500,300,40),P(1510,500,430,40),
      P(190,420,120,18),P(410,350,130,18),P(620,290,120,18),P(840,360,140,18),P(1070,300,120,18),P(1300,390,120,18),P(1530,330,130,18),P(1730,270,120,18)
    ],
    moving:[MP(660,430,110,16,660,830,58),MP(1190,250,120,16,1180,1380,62),MP(1440,430,120,16,1420,1600,70)],
    hazards:[H(330,462,50,50,"immune",310,610,78),H(700,250,46,46,"immune",650,900,64),H(1230,462,50,50,"immune",1170,1390,86),H(1605,290,38,38,"drug",1540,1760,76)],
    collectibles:[C(220,382,"nutrient"),C(455,312,"nutrient"),C(660,252,"nutrient"),C(1120,262,"nutrient"),C(1770,232,"nutrient")],
    switches:[S(875,342),S(1340,372)],
    doors:[D(1010,395,36,105),D(1460,395,36,105)],
    checkpoints:[CP(735,438),CP(1260,438)],
    gate:G(1890,408)
  },
  {
    title:"第三关：肝细胞发育",
    area:"肝细胞内部",
    stage:"LIVER_STAGE",
    worldW:2150,
    bg:["#2c241f","#583d2c","#151210"],
    start:{x:45,y:420},
    required:{core:5,switches:1,development:100},
    desc:"收集 ATP 与营养推进发育。中段加入移动平台和药物分子，后段需要开门。",
    objectives:["Development 达到 100", "收集 5 个营养核心", "打开裂殖子释放门"],
    knowledge:"疟原虫在肝细胞内大量无性增殖，形成裂殖子。肝期通常症状不明显，但决定了后续血液感染的开始。",
    platforms:[
      P(0,500,310,40),P(390,500,280,40),P(750,500,260,40),P(1120,500,260,40),P(1490,500,500,40),
      P(210,415,120,18),P(460,350,130,18),P(720,300,120,18),P(985,365,120,18),P(1220,300,120,18),P(1460,385,130,18),P(1700,320,120,18)
    ],
    moving:[MP(825,430,120,16,810,990,65),MP(1340,250,120,16,1320,1530,80),MP(1810,405,120,16,1780,1950,70)],
    hazards:[H(335,462,40,40,"drug",310,560,75),H(860,260,40,40,"drug",790,1010,80),H(1165,462,44,44,"immune",1120,1360,78),H(1595,350,38,38,"drug",1520,1750,90)],
    collectibles:[C(245,375,"atp",20),C(505,312,"atp",20),C(760,262,"atp",20),C(1260,262,"atp",20),C(1740,282,"atp",20)],
    switches:[S(1515,367)],
    doors:[D(1905,395,36,105)],
    checkpoints:[CP(760,438),CP(1400,438)],
    gate:G(2020,408)
  },
  {
    title:"第四关：红细胞入侵",
    area:"血液循环",
    stage:"MEROZOITE",
    worldW:2200,
    timeLimit:75,
    bg:["#2b171a","#653037","#120f10"],
    start:{x:45,y:420},
    required:{core:3,switches:0,development:0},
    desc:"速度关。裂殖子暴露在血液中，危险值增长更快，需要在血流与红细胞平台间连续跳跃。",
    objectives:["限时 75 秒", "收集 3 个入侵信号", "进入红细胞"],
    knowledge:"裂殖子从肝细胞释放后需要快速入侵红细胞。暴露时间越长，被抗体和免疫细胞清除的风险越高。",
    platforms:[
      P(0,500,260,40),P(350,500,220,40),P(680,500,240,40),P(1040,500,240,40),P(1410,500,230,40),P(1770,500,300,40),
      P(170,410,110,18),P(455,360,115,18),P(760,390,110,18),P(1010,330,110,18),P(1300,385,120,18),P(1580,335,110,18),P(1850,395,120,18)
    ],
    moving:[MP(580,420,120,16,575,740,110),MP(1180,270,120,16,1160,1360,105),MP(1660,425,120,16,1640,1830,115)],
    hazards:[H(300,462,46,46,"immune",280,540,105),H(890,462,42,42,"drug",820,1020,105),H(1380,350,44,44,"immune",1320,1590,100),H(1705,462,42,42,"drug",1650,1900,115)],
    collectibles:[C(200,372,"signal"),C(1045,292,"signal"),C(1608,298,"signal")],
    switches:[],
    doors:[],
    checkpoints:[CP(690,438),CP(1370,438)],
    gate:G(2060,408)
  },
  {
    title:"第五关：红细胞内增殖",
    area:"红细胞内部",
    stage:"RBC_STAGE",
    worldW:2300,
    bg:["#351719","#793638","#170e0f"],
    start:{x:45,y:420},
    required:{core:5,switches:2,development:100},
    desc:"迷宫式红细胞内部：收集血红蛋白，避开游离血红素毒区和抗疟药，打开两个代谢门。",
    objectives:["收集 5 个血红蛋白", "Development 达到 100", "激活 2 个代谢开关"],
    knowledge:"疟原虫在红细胞内消化血红蛋白获得营养，同时产生有毒血红素，并将其转化为疟色素。多种抗疟药作用于这一阶段。",
    platforms:[
      P(0,500,300,40),P(380,500,250,40),P(730,500,240,40),P(1060,500,230,40),P(1390,500,260,40),P(1760,500,360,40),
      P(210,405,120,18),P(470,350,120,18),P(705,295,120,18),P(930,365,120,18),P(1180,300,120,18),P(1425,380,130,18),P(1680,325,120,18),P(1945,380,120,18)
    ],
    moving:[MP(650,430,110,16,640,815,70),MP(1320,250,120,16,1290,1510,78),MP(1810,430,110,16,1780,1970,86)],
    hazards:[H(315,462,50,38,"heme",0,0,0),H(625,462,50,38,"heme",0,0,0),H(980,462,42,42,"drug",910,1230,90),H(1360,255,42,42,"drug",1300,1520,82),H(1680,462,50,38,"heme",0,0,0)],
    collectibles:[C(245,365,"hemoglobin",20),C(510,312,"hemoglobin",20),C(740,255,"hemoglobin",20),C(1220,262,"hemoglobin",20),C(1985,342,"hemoglobin",20)],
    switches:[S(960,347),S(1465,362)],
    doors:[D(1120,395,36,105),D(1710,395,36,105)],
    checkpoints:[CP(760,438),CP(1450,438)],
    gate:G(2150,408)
  },
  {
    title:"第六关：发热周期",
    area:"红细胞破裂区域",
    stage:"SCHIZONT",
    worldW:2150,
    timeLimit:70,
    bg:["#241819","#704437","#100f10"],
    start:{x:45,y:420},
    required:{core:4,switches:1,development:0},
    desc:"炎症波会像火球一样巡逻。需要踩移动平台、拿释放信号、打开出口。",
    objectives:["限时 70 秒", "收集 4 个释放信号", "激活出口开关并逃出"],
    knowledge:"红细胞周期性破裂会释放裂殖子和炎症物质，因此疟疾患者可能出现周期性寒战与发热。游戏中的炎症波对应这种炎症反应。",
    platforms:[
      P(0,500,250,40),P(340,500,240,40),P(680,500,220,40),P(1010,500,250,40),P(1360,500,260,40),P(1740,500,310,40),
      P(180,420,100,18),P(430,360,115,18),P(735,410,110,18),P(990,330,115,18),P(1240,380,125,18),P(1530,320,115,18),P(1810,365,120,18)
    ],
    moving:[MP(600,430,120,16,590,760,92),MP(1130,270,120,16,1100,1300,90),MP(1600,420,120,16,1560,1770,100)],
    hazards:[H(300,455,58,58,"wave",270,560,110),H(840,455,58,58,"wave",780,1020,120),H(1395,455,58,58,"wave",1360,1600,105),H(1700,285,44,44,"drug",1640,1880,85)],
    collectibles:[C(215,380,"release"),C(465,322,"release"),C(1025,292,"release"),C(1850,328,"release")],
    switches:[S(1555,302)],
    doors:[D(1900,395,36,105)],
    checkpoints:[CP(680,438),CP(1320,438)],
    gate:G(2010,408)
  },
  {
    title:"第七关：配子体转化",
    area:"血液深处 / 脾脏过滤区",
    stage:"GAMETOCYTE",
    worldW:2250,
    bg:["#1d2025","#263c4c","#101418"],
    start:{x:45,y:420},
    required:{core:5,switches:2,development:0},
    desc:"配子体移动较慢。需要利用移动平台和检查点穿过脾脏过滤区。",
    objectives:["收集 5 个分化信号", "激活 2 个通道开关", "通过脾脏过滤"],
    knowledge:"部分疟原虫分化为配子体，这是完成宿主转换的关键。血液中的配子体需要在被清除前进入蚊体。",
    platforms:[
      P(0,500,280,40),P(360,500,220,40),P(680,500,240,40),P(1040,500,240,40),P(1390,500,260,40),P(1760,500,340,40),
      P(150,410,120,18),P(420,350,120,18),P(700,390,120,18),P(940,315,120,18),P(1190,370,120,18),P(1460,310,130,18),P(1730,375,120,18),P(1950,315,110,18)
    ],
    moving:[MP(580,430,115,16,560,760,65),MP(1280,260,115,16,1250,1480,70),MP(1650,425,115,16,1620,1830,75)],
    hazards:[H(310,462,52,52,"spleen",290,560,72),H(870,462,52,52,"spleen",820,1070,80),H(1340,462,42,42,"drug",1290,1520,72),H(1840,455,52,52,"spleen",1780,2060,84)],
    collectibles:[C(185,372,"differentiate"),C(455,312,"differentiate"),C(730,352,"differentiate"),C(1495,272,"differentiate"),C(1980,278,"differentiate")],
    switches:[S(970,297),S(1765,357)],
    doors:[D(1120,395,36,105),D(1905,395,36,105)],
    checkpoints:[CP(710,438),CP(1515,438)],
    gate:G(2110,408)
  },
  {
    title:"第八关：宿主转换",
    area:"蚊虫吸血通道",
    stage:"GAMETOCYTE",
    worldW:2400,
    timeLimit:90,
    bg:["#1d1b22","#45354e","#0f0f13"],
    start:{x:45,y:420},
    required:{core:4,switches:3,development:0},
    desc:"最终综合关：连续跳跃、三开关、移动平台与药物巡逻，进入蚊虫吸血通道。",
    objectives:["收集 4 个宿主转换信号", "激活 3 个通道开关", "进入蚊虫吸血通道"],
    knowledge:"配子体被按蚊吸血后进入蚊体，继续完成有性生殖和后续发育。现实防控可从防蚊、治疗血液期感染和阻断配子体传播入手。",
    platforms:[
      P(0,500,260,40),P(340,500,220,40),P(650,500,220,40),P(970,500,230,40),P(1290,500,220,40),P(1600,500,260,40),P(1980,500,300,40),
      P(170,405,110,18),P(420,345,115,18),P(690,395,110,18),P(920,330,115,18),P(1180,395,120,18),P(1390,310,120,18),P(1650,365,120,18),P(1900,315,120,18),P(2120,390,120,18)
    ],
    moving:[MP(560,430,115,16,550,710,85),MP(1080,270,115,16,1060,1260,90),MP(1510,430,115,16,1480,1690,92),MP(1850,250,115,16,1810,2020,80)],
    hazards:[H(300,462,42,42,"drug",280,540,95),H(790,455,50,50,"immune",740,990,92),H(1260,462,42,42,"drug",1210,1490,95),H(1740,455,50,50,"immune",1660,1920,98),H(2070,462,42,42,"drug",2040,2240,80)],
    collectibles:[C(205,365,"differentiate"),C(955,292,"differentiate"),C(1425,272,"differentiate"),C(2165,352,"differentiate")],
    switches:[S(455,327),S(1200,377),S(1930,297)],
    doors:[D(620,395,36,105),D(1560,395,36,105),D(2260,395,36,105)],
    checkpoints:[CP(720,438),CP(1450,438),CP(2005,438)],
    gate:G(2310,408)
  }
];

let player, platforms, moving, hazards, collectibles, switches, doors, checkpoints, gate;
let collectedCore = 0, activatedSwitches = 0;
let timeLeft = null;
let respawn = {x:40,y:420};
let levelElapsed = 0;

function loadLevel(i){
  levelIndex = i;
  const L = levels[i];
  player = {
    x:L.start.x,y:L.start.y,w:34,h:42,vx:0,vy:0,
    hp:100,nutrition:0,development:0,danger:0,
    grounded:false,coyote:0,jumpBuffer:0,facing:1,onMoving:null
  };
  if(L.stage==="GAMETOCYTE") player.w=38;
  platforms = clone(L.platforms);
  moving = clone(L.moving);
  hazards = clone(L.hazards);
  collectibles = clone(L.collectibles);
  switches = clone(L.switches);
  doors = clone(L.doors);
  checkpoints = clone(L.checkpoints);
  gate = clone(L.gate);
  respawn = {x:L.start.x,y:L.start.y};
  collectedCore = 0;
  activatedSwitches = 0;
  timeLeft = L.timeLimit || null;
  levelElapsed = 0;
  cameraX = 0;
  gameState = "playing";
  setMessage("进入 " + L.title + "。本关比上一版更接近横版闯关：注意开关、移动平台和检查点。","info");
  updateUI();
}

function clone(o){return JSON.parse(JSON.stringify(o));}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function overlap(a,b){return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;}

function fixedPlatforms(){
  return platforms.concat(moving).concat(doors.filter(d=>!d.open));
}

function levelRequirementsMet(){
  const L=levels[levelIndex];
  return collectedCore >= (L.required.core||0) &&
         activatedSwitches >= (L.required.switches||0) &&
         player.development >= (L.required.development||0);
}

function update(dt){
  if(gameState!=="playing") return;
  const L = levels[levelIndex];
  levelElapsed += dt;
  if(timeLeft !== null){
    timeLeft -= dt;
    if(timeLeft <= 0){ fail("时间耗尽。当前阶段没有及时完成，寄生虫被宿主环境清除。"); return; }
  }

  damageCooldown = Math.max(0, damageCooldown-dt);
  interactCooldown = Math.max(0, interactCooldown-dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer-dt);
  if(player.grounded) player.coyote = COYOTE_TIME;
  else player.coyote = Math.max(0, player.coyote-dt);

  const left = keys["ArrowLeft"] || keys["a"] || keys["A"];
  const right = keys["ArrowRight"] || keys["d"] || keys["D"];
  if(justPressed["ArrowUp"] || justPressed["w"] || justPressed["W"] || justPressed[" "]){
    player.jumpBuffer = JUMP_BUFFER;
  }

  let speed = RUN_SPEED;
  if(L.stage === "GAMETOCYTE") speed = 230;
  if(L.stage === "MEROZOITE") speed = 305;
  player.vx = 0;
  if(left){player.vx = -speed; player.facing=-1;}
  if(right){player.vx = speed; player.facing=1;}

  if(player.jumpBuffer>0 && player.coyote>0){
    player.vy = -JUMP_VELOCITY;
    if(L.stage==="MEROZOITE") player.vy = -690;
    if(L.stage==="GAMETOCYTE") player.vy = -610;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
  }
  const jumpHeld = keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "];
  if(!jumpHeld && player.vy < -220) player.vy += 1200*dt; // 小跳手感

  // moving platforms first
  for(const m of moving){
    m.dx = 0;
    const oldX = m.x;
    m.x += m.vx * dt;
    if(m.x < m.minX || m.x > m.maxX){
      m.vx *= -1;
      m.x = clamp(m.x,m.minX,m.maxX);
    }
    m.dx = m.x - oldX;
  }

  player.vy += GRAVITY*dt;
  player.vy = Math.min(player.vy,MAX_FALL);

  // carry by moving platform
  if(player.onMoving) player.x += player.onMoving.dx || 0;
  player.onMoving = null;

  // horizontal
  player.x += player.vx*dt;
  for(const p of fixedPlatforms()){
    if(overlap(player,p)){
      if(player.vx>0) player.x = p.x-player.w;
      else if(player.vx<0) player.x = p.x+p.w;
    }
  }

  // vertical
  player.y += player.vy*dt;
  player.grounded = false;
  for(const p of fixedPlatforms()){
    if(overlap(player,p)){
      if(player.vy>0){
        player.y = p.y-player.h;
        player.vy = 0;
        player.grounded = true;
        if(p.type==="moving") player.onMoving = p;
      }else if(player.vy<0){
        player.y = p.y+p.h;
        player.vy = 0;
      }
    }
  }

  player.x = clamp(player.x,0,L.worldW-player.w);
  if(player.y > VIEW_H + 180) respawnPlayer("掉入深处，回到最近检查点。");

  // Update moving hazards
  for(const h of hazards){
    h.dx = 0;
    if(h.vx){
      const old = h.x;
      h.x += h.vx*dt;
      if(h.x<h.minX || h.x>h.maxX){h.vx*=-1;h.x=clamp(h.x,h.minX,h.maxX);}
      h.dx = h.x-old;
    }
    if(overlap(player,h)){
      let msg="受到伤害。", hp=14, danger=8;
      if(h.type==="drug"){msg="碰到抗疟药物分子，HP 下降。";hp=18;danger=4;}
      if(h.type==="immune"){msg="被免疫细胞识别，Danger 上升。";hp=12;danger=18;}
      if(h.type==="heme"){msg="接触游离血红素毒区，受到损伤。";hp=16;danger=10;}
      if(h.type==="wave"){msg="被炎症波击中，Danger 上升。";hp=14;danger=16;}
      if(h.type==="spleen"){msg="经过脾脏过滤区，配子体有被清除风险。";hp=13;danger=20;}
      damage(hp,danger,msg);
    }
  }

  // collectibles
  for(const c of collectibles){
    if(!c.got && overlap(player,c)){
      c.got = true;
      collectedCore++;
      player.nutrition = clamp(player.nutrition+16,0,100);
      if(c.dev) player.development = clamp(player.development+c.dev,0,100);
      else player.development = clamp(player.development+8,0,100);
      setMessage(collectMessage(c.type),"success");
    }
  }

  // checkpoints
  for(const cp of checkpoints){
    if(overlap(player,cp) && !cp.active){
      checkpoints.forEach(x=>x.active=false);
      cp.active = true;
      respawn = {x:cp.x, y:cp.y-player.h};
      setMessage("已激活检查点。失败后会从这里继续。","success");
    }
  }

  // switches and gates: allow both tapping E and holding E, so the player won't feel the gate is unresponsive.
  const interactPressed = justPressed["e"] || justPressed["E"] || ((keys["e"] || keys["E"]) && interactCooldown <= 0);
  if(interactPressed){
    tryInteract();
    interactCooldown = 0.35;
  }
  if(justPressed["r"] || justPressed["R"]){
    respawnPlayer("已回到最近检查点。");
  }

  player.danger += dt * (L.stage==="MEROZOITE" ? 1.25 : 0.38);
  player.hp = clamp(player.hp,0,100);
  player.danger = clamp(player.danger,0,100);
  player.nutrition = clamp(player.nutrition,0,100);
  player.development = clamp(player.development,0,100);

  if(player.danger>=100){ fail("Danger 达到 100。免疫系统已经锁定并清除寄生虫。"); return; }
  if(player.hp<=0){ respawnPlayer("HP 归零，被清除一次。Danger 增加，回到检查点。"); }

  // camera smooth
  cameraTarget = clamp(player.x - VIEW_W*0.42, 0, L.worldW - VIEW_W);
  cameraX += (cameraTarget - cameraX) * Math.min(1,dt*7);

  updateUI();
  for(const k in justPressed) delete justPressed[k];
}

function collectMessage(type){
  const m = {
    signal:"获得方向/入侵信号：更接近下一阶段。",
    nutrient:"获得肝细胞定位营养：发育条件提升。",
    atp:"获得 ATP：肝期发育进度上升。",
    hemoglobin:"获得血红蛋白：红细胞期发育推进。",
    release:"获得释放信号：准备离开红细胞。",
    differentiate:"获得分化信号：向配子体路线转化。"
  };
  return m[type] || "获得关键道具。";
}

function damage(hp,danger,msg){
  if(damageCooldown>0) return;
  player.hp -= hp;
  player.danger += danger;
  player.vy = -260;
  player.vx = -player.facing*90;
  damageCooldown=.8;
  setMessage(msg,"danger");
}

function respawnPlayer(msg){
  player.x = respawn.x;
  player.y = respawn.y;
  player.vx = 0;
  player.vy = 0;
  player.hp = Math.max(player.hp,55);
  player.danger = clamp(player.danger+8,0,100);
  damageCooldown=.9;
  setMessage(msg,"danger");
}

function tryInteract(){
  let acted = false;
  for(const s of switches){
    const area = {x:s.x-70,y:s.y-70,w:s.w+140,h:s.h+140};
    if(!s.active && overlap(player,area)){
      s.active = true;
      activatedSwitches++;
      openDoorsIfReady();
      setMessage("开关已激活：对应屏障开始松动。", "success");
      acted = true;
      break;
    }
  }
  if(acted) return;

  const gArea = {x:gate.x-90,y:gate.y-90,w:gate.w+180,h:gate.h+180};
  if(overlap(player,gArea)){
    if(levelRequirementsMet()){
      completeLevel();
    }else{
      const L = levels[levelIndex];
      const needCore = Math.max(0,(L.required.core||0)-collectedCore);
      const needSw = Math.max(0,(L.required.switches||0)-activatedSwitches);
      const needDev = Math.max(0,(L.required.development||0)-Math.floor(player.development));
      setMessage(`还不能进入下一阶段：还差关键道具 ${needCore} 个，开关 ${needSw} 个，发育进度 ${needDev}。`, "info");
    }
  }else{
    setMessage("附近没有可互动目标。靠近开关或阶段门后按 E。","info");
  }
}

function openDoorsIfReady(){
  const L = levels[levelIndex];
  if(activatedSwitches >= (L.required.switches||0)){
    doors.forEach(d=>d.open=true);
  }else{
    // If there are multiple doors and switches, open one door per switch for better feedback
    doors.forEach((d,i)=>{ if(i < activatedSwitches) d.open=true; });
  }
}

function completeLevel(){
  gameState="card";
  doneSteps.add(levelIndex);
  const L=levels[levelIndex];
  showModal(
    "知识卡：" + L.title,
    L.knowledge,
    [
      "当前阶段：" + stageNames[L.stage],
      "本关机制：平台跳跃 + 开关门 + 危险障碍，对应真实生命周期阻断点。",
      levelIndex===levels.length-1 ? "你已经完成完整生命周期图谱。" : "下一关将进入生命周期的下一个阶段。"
    ],
    levelIndex===levels.length-1 ? "查看最终总结" : "进入下一关",
    ()=>{
      hideModal();
      if(levelIndex===levels.length-1) victory();
      else loadLevel(levelIndex+1);
    }
  );
}

function fail(reason){
  gameState="failed";
  showModal("闯关失败", reason, [
    "建议先激活检查点，再观察移动平台和巡逻障碍的节奏。",
    "遇到阶段门没有开启时，看看右侧任务栏是否还有道具、开关或发育进度没完成。",
    "如果掉下去或卡住，可以按 R 回到最近检查点。"
  ], "重新开始本关", ()=>{hideModal();loadLevel(levelIndex);});
}

function victory(){
  gameState="victory";
  showModal("生命周期图谱完成",
    "你已经完成从蚊虫叮咬、肝期、红细胞期、配子体形成到宿主转换的全过程。",
    [
      "阻断点 1：防蚊叮咬，减少子孢子进入人体。",
      "阻断点 2：抗疟药清除血液期疟原虫，减少症状和传播。",
      "阻断点 3：阻断配子体进入蚊体，切断宿主转换。",
      "这版游戏把科普点放进关卡机制：药物、免疫、红细胞、肝细胞、脾脏过滤和宿主转换都对应真实医学概念。"
    ], "重新开始游戏", ()=>{doneSteps.clear();hideModal();loadLevel(0);}
  );
}

function draw(){
  const L = levels[levelIndex];
  drawBackground(L);
  ctx.save();
  ctx.translate(-cameraX,0);
  drawDecor(L);
  drawPlatforms();
  drawDoors();
  drawSwitches();
  drawCheckpoints();
  drawGate();
  drawCollectibles();
  drawHazards();
  drawPlayer(L);
  ctx.restore();
  drawOverlay(L);
  requestAnimationFrame(draw);
}

function drawBackground(L){
  const g=ctx.createLinearGradient(0,0,VIEW_W,VIEW_H);
  g.addColorStop(0,L.bg[0]);g.addColorStop(.55,L.bg[1]);g.addColorStop(1,L.bg[2]);
  ctx.fillStyle=g;ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.save();
  ctx.globalAlpha=.08;ctx.strokeStyle="#e7d8c1";ctx.lineWidth=1;
  for(let i=0;i<19;i++){
    const y=25+i*29+Math.sin(Date.now()/1300+i)*4;
    ctx.beginPath();ctx.moveTo(0,y);
    for(let x=0;x<VIEW_W;x+=45) ctx.lineTo(x,y+Math.sin((x+cameraX)*.018+i)*12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDecor(L){
  ctx.save();
  ctx.globalAlpha=.15;ctx.strokeStyle="#e7d8c1";
  ctx.lineWidth=16;
  for(let x=-200;x<L.worldW+300;x+=450){
    ctx.beginPath();
    ctx.ellipse(x+220,260,190,82,Math.sin((x+Date.now()/20)/1000)*.2,0,Math.PI*2);
    ctx.stroke();
  }
  ctx.globalAlpha=.08;ctx.lineWidth=8;
  for(let x=60;x<L.worldW;x+=180){
    ctx.beginPath();
    ctx.ellipse(x,110+Math.sin(x)*40,60,26,x*.01,0,Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlatforms(){
  for(const p of platforms.concat(moving)){
    const movingP = p.type==="moving";
    ctx.fillStyle="rgba(0,0,0,.35)";
    ctx.fillRect(p.x+5,p.y+5,p.w,p.h);
    ctx.fillStyle=movingP ? "#8b704c" : "#70543d";
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle="rgba(242,224,196,.2)";
    ctx.fillRect(p.x,p.y,p.w,4);
    ctx.strokeStyle="rgba(15,10,8,.75)";
    ctx.strokeRect(p.x,p.y,p.w,p.h);
    if(movingP){
      ctx.fillStyle="#211d19";
      ctx.fillRect(p.x+p.w/2-12,p.y+5,24,6);
    }
  }
}

function drawDoors(){
  for(const d of doors){
    if(d.open){
      ctx.save();
      ctx.globalAlpha=.25;
      ctx.strokeStyle="#c8a35a";ctx.lineWidth=3;
      ctx.strokeRect(d.x,d.y,d.w,d.h);
      ctx.restore();
      continue;
    }
    ctx.fillStyle="#181514";
    ctx.fillRect(d.x,d.y,d.w,d.h);
    ctx.strokeStyle="#c8a35a";ctx.lineWidth=2;
    ctx.strokeRect(d.x,d.y,d.w,d.h);
    ctx.fillStyle="#c8a35a";ctx.font="12px Microsoft YaHei";ctx.textAlign="center";
    ctx.fillText("屏障",d.x+d.w/2,d.y-8);
  }
}

function drawSwitches(){
  for(const s of switches){
    ctx.fillStyle=s.active ? "#718261" : "#5a3d37";
    ctx.fillRect(s.x,s.y,s.w,s.h);
    ctx.strokeStyle="#e7d8c1";ctx.strokeRect(s.x,s.y,s.w,s.h);
    ctx.fillStyle="#e7d8c1";ctx.font="14px Arial";ctx.textAlign="center";
    ctx.fillText(s.active?"✓":"E",s.x+s.w/2,s.y-5);
  }
}

function drawCheckpoints(){
  for(const cp of checkpoints){
    ctx.strokeStyle=cp.active?"#c8a35a":"#9f8d78";ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(cp.x+7,cp.y+cp.h);ctx.lineTo(cp.x+7,cp.y);ctx.stroke();
    ctx.fillStyle=cp.active?"#c8a35a":"#6f6252";
    ctx.beginPath();ctx.moveTo(cp.x+8,cp.y);ctx.lineTo(cp.x+34,cp.y+12);ctx.lineTo(cp.x+8,cp.y+24);ctx.closePath();ctx.fill();
  }
}

function drawGate(){
  const ok = levelRequirementsMet();
  const t = Math.sin(Date.now()/240)*4;
  ctx.save();
  ctx.fillStyle="#111";
  ctx.fillRect(gate.x,gate.y,gate.w,gate.h);
  ctx.strokeStyle=ok?"#c8a35a":"#7b5c58";
  ctx.lineWidth=3;
  ctx.strokeRect(gate.x-t/2,gate.y-t/2,gate.w+t,gate.h+t);
  ctx.fillStyle=ok?"rgba(200,163,90,.22)":"rgba(255,255,255,.06)";
  ctx.fillRect(gate.x+8,gate.y+8,gate.w-16,gate.h-16);
  ctx.fillStyle="#e7d8c1";ctx.font="13px Microsoft YaHei";ctx.textAlign="center";
  ctx.fillText("阶段门",gate.x+gate.w/2,gate.y-10);
  ctx.restore();
}

function drawCollectibles(){
  for(const c of collectibles){
    if(c.got) continue;
    const y=c.y+Math.sin(Date.now()/360+c.x)*4;
    ctx.save();ctx.translate(c.x,y);
    const colors={signal:"#90b978",nutrient:"#90b978",atp:"#c8a35a",hemoglobin:"#b8433f",release:"#d47b48",differentiate:"#8e7ac4"};
    const labels={signal:"S",nutrient:"N",atp:"ATP",hemoglobin:"Hb",release:"R",differentiate:"G"};
    ctx.shadowBlur=18;ctx.shadowColor=colors[c.type]||"#c8a35a";
    ctx.fillStyle=colors[c.type]||"#c8a35a";
    ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle="#211d19";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#fff0d5";ctx.font=c.type==="atp"?"9px Arial":"12px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(labels[c.type]||"N",0,1);
    ctx.restore();
  }
}

function drawHazards(){
  for(const h of hazards){
    ctx.save();ctx.translate(h.x+h.w/2,h.y+h.h/2);
    if(h.type==="drug"){
      ctx.rotate(Date.now()/650);
      ctx.fillStyle="#675071";poly(0,0,h.w*.48,6);ctx.fill();ctx.strokeStyle="#e7d8c1";ctx.stroke();
      ctx.fillStyle="#f5e8d0";ctx.font="13px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("Rx",0,1);
    }else if(h.type==="immune"){
      ctx.fillStyle="#e9e2d5";blob(0,0,h.w*.48,10);ctx.fill();ctx.strokeStyle="#9a8d7b";ctx.stroke();
      ctx.fillStyle="#111";ctx.beginPath();ctx.arc(-8,-4,3,0,Math.PI*2);ctx.arc(8,-4,3,0,Math.PI*2);ctx.fill();
    }else if(h.type==="heme"){
      ctx.fillStyle="#5c1715";ctx.beginPath();ctx.arc(0,0,h.w*.48,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#e85e45";ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle="#f4d2c2";ctx.font="12px Microsoft YaHei";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("毒",0,1);
    }else if(h.type==="wave"){
      ctx.strokeStyle="#d97845";ctx.lineWidth=5;
      for(let r=10;r<h.w;r+=12){ctx.beginPath();ctx.arc(0,0,r+Math.sin(Date.now()/180+r)*2,0,Math.PI*2);ctx.stroke();}
    }else if(h.type==="spleen"){
      ctx.fillStyle="#4b2d3f";blob(0,0,h.w*.48,9);ctx.fill();ctx.strokeStyle="#bfa9c8";ctx.stroke();
      ctx.fillStyle="#f2e7d3";ctx.font="13px Microsoft YaHei";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("脾",0,1);
    }
    ctx.restore();
  }
}
function poly(x,y,r,n){ctx.beginPath();for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath()}
function blob(x,y,r,n){ctx.beginPath();for(let i=0;i<n;i++){const a=i*Math.PI*2/n;const rr=r*(.86+Math.sin(i*2.1+Date.now()/900)*.08);const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}ctx.closePath()}

function drawPlayer(L){
  ctx.save();
  const cx=player.x+player.w/2, cy=player.y+player.h/2;
  ctx.translate(cx,cy);ctx.scale(player.facing,1);
  const colors={SPOROZOITE:"#d4c266",LIVER_STAGE:"#7f9a68",MEROZOITE:"#d1815a",RBC_STAGE:"#b94b45",SCHIZONT:"#ce874d",GAMETOCYTE:"#8f7bc4"};
  ctx.fillStyle=colors[L.stage]||"#c8a35a";ctx.strokeStyle="#17120f";ctx.lineWidth=3;
  if(["SPOROZOITE","MEROZOITE"].includes(L.stage)){
    ctx.beginPath();ctx.ellipse(0,0,player.w*.48,player.h*.34,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,-3);ctx.quadraticCurveTo(15,-26,30,-8);ctx.stroke();
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(8,-5,3,0,Math.PI*2);ctx.fill();
  }else if(L.stage==="GAMETOCYTE"){
    ctx.beginPath();ctx.ellipse(0,0,player.w*.62,player.h*.25,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(8,-3,3,0,Math.PI*2);ctx.fill();
  }else{
    blob(0,0,player.w*.5,10);ctx.fill();ctx.stroke();
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(8,-4,3,0,Math.PI*2);ctx.fill();
  }
  if(damageCooldown>0){ctx.globalAlpha=.45;ctx.fillStyle="#fff";ctx.fillRect(-player.w/2,-player.h/2,player.w,player.h);ctx.globalAlpha=1;}
  ctx.restore();
}

function drawOverlay(L){
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.42)";
  ctx.fillRect(14,14,372,76);
  ctx.fillStyle="#e7d8c1";ctx.font="18px Microsoft YaHei";ctx.fillText(L.title,28,42);
  ctx.font="13px Microsoft YaHei";
  const timeStr=timeLeft!==null?`｜剩余 ${Math.ceil(timeLeft)}s`:"";
  ctx.fillText(`${stageNames[L.stage]}｜核心 ${collectedCore}/${L.required.core||0}｜开关 ${activatedSwitches}/${L.required.switches||0}${timeStr}`,28,68);

  const gArea={x:gate.x-90,y:gate.y-90,w:gate.w+180,h:gate.h+180};
  if(overlap(player,gArea)){
    ctx.fillStyle=levelRequirementsMet()?"rgba(200,163,90,.9)":"rgba(65,48,44,.9)";
    ctx.fillRect(332,452,330,44);
    ctx.fillStyle=levelRequirementsMet()?"#211d19":"#e7d8c1";
    ctx.font="15px Microsoft YaHei";ctx.textAlign="center";
    ctx.fillText(levelRequirementsMet()?"阶段门已开启，按 E 进入":"还差条件：继续收集、开关或发育",497,480);
  }
  ctx.restore();
}

function updateUI(){
  const L=levels[levelIndex];
  document.getElementById("levelTitle").textContent=L.title;
  document.getElementById("levelDesc").textContent=`${L.area}｜${L.desc}`;
  document.getElementById("stageText").textContent="阶段："+stageNames[L.stage];
  const ul=document.getElementById("objectives");ul.innerHTML="";
  L.objectives.forEach(o=>{const li=document.createElement("li");li.textContent=o;ul.appendChild(li)});
  setBar("hpBar",player.hp);setBar("nutritionBar",player.nutrition);setBar("developmentBar",player.development);setBar("dangerBar",player.danger);
  document.getElementById("hpText").textContent=Math.round(player.hp);
  document.getElementById("nutritionText").textContent=Math.round(player.nutrition);
  document.getElementById("developmentText").textContent=Math.round(player.development);
  document.getElementById("dangerText").textContent=Math.round(player.danger);
  const timeStr=timeLeft!==null?`｜时间 ${Math.ceil(timeLeft)}s`:"";
  document.getElementById("progressText").textContent=`核心道具：${collectedCore}/${L.required.core||0}｜开关：${activatedSwitches}/${L.required.switches||0}｜发育：${Math.round(player.development)}/${L.required.development||0}${timeStr}`;
  renderLife();
}
function setBar(id,val){document.getElementById(id).style.width=clamp(val,0,100)+"%"}
function renderLife(){
  const box=document.getElementById("lifecycle");box.innerHTML="";
  lifecycleSteps.forEach((s,i)=>{
    const div=document.createElement("div");
    div.className="life-step"+(doneSteps.has(i)?" done":"")+(i===levelIndex?" active":"");
    div.innerHTML=`<span>${doneSteps.has(i)?"✓":i===levelIndex?"◆":"◇"}</span><span>${i+1}. ${s}</span>`;
    box.appendChild(div);
  });
}
function setMessage(text,type="info"){
  const box=document.getElementById("messageBox");
  box.textContent=text;
  box.style.borderLeftColor=type==="danger"?"#9d3c37":type==="success"?"#718261":"#c8a35a";
}

function showModal(title,body,list,button,cb){
  document.getElementById("modalTitle").textContent=title;
  document.getElementById("modalBody").textContent=body;
  const ul=document.getElementById("modalList");ul.innerHTML="";
  list.forEach(x=>{const li=document.createElement("li");li.textContent=x;ul.appendChild(li)});
  const m=document.getElementById("modal");m.classList.remove("hidden");
  const b=document.getElementById("modalPrimary");b.textContent=button;b.onclick=cb;
}
function hideModal(){document.getElementById("modal").classList.add("hidden")}

document.getElementById("btnStart").onclick=()=>{
  if(gameState==="playing"){
    gameState="paused";
    showModal("暂停","游戏已暂停。",["点击继续回到当前关卡。"],"继续",()=>{hideModal();gameState="playing"});
  }else if(gameState==="intro"){
    hideModal();loadLevel(0);
  }else{
    hideModal();gameState="playing";
  }
};
document.getElementById("btnRestart").onclick=()=>{doneSteps.clear();hideModal();loadLevel(0)};
document.getElementById("modalSecondary").onclick=()=>{if(gameState!=="intro"){hideModal();if(gameState==="paused")gameState="playing";}};

window.addEventListener("keydown",e=>{
  if(!keys[e.key]) justPressed[e.key]=true;
  keys[e.key]=true;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup",e=>{keys[e.key]=false});

function loop(t){
  const dt=Math.min(.033,(t-lastT)/1000 || .016);
  lastT=t;
  update(dt);
  requestAnimationFrame(loop);
}


function bindTouchButton(id, key, hold=true){
  const el = document.getElementById(id);
  if(!el) return;

  const start = (ev)=>{
    ev.preventDefault();
    keys[key] = true;
    justPressed[key] = true;
    el.classList.add("active");
  };

  const end = (ev)=>{
    ev.preventDefault();
    if(hold) keys[key] = false;
    el.classList.remove("active");
  };

  el.addEventListener("touchstart", start, {passive:false});
  el.addEventListener("touchend", end, {passive:false});
  el.addEventListener("touchcancel", end, {passive:false});
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", end);
}

bindTouchButton("touchLeft", "ArrowLeft", true);
bindTouchButton("touchRight", "ArrowRight", true);
bindTouchButton("touchJump", " ", true);
bindTouchButton("touchAction", "e", true);
bindTouchButton("touchRespawn", "r", false);

const touchControls = document.getElementById("touchControls");
if(touchControls){
  touchControls.addEventListener("touchmove", (ev)=>ev.preventDefault(), {passive:false});
}

showModal("寄生虫生命周期大冒险",
  "欢迎进入人体微观世界。你将跟随疟原虫穿过血液、肝脏和红细胞，完成一次完整的生命周期冒险。",
  [
    "一路向右闯关，收集关键信号和营养物质。",
    "避开药物分子、免疫细胞、毒性区域和炎症波。",
    "电脑端用键盘操作；手机端可使用屏幕下方虚拟按键。每通过一关，都会解锁一张医学知识卡。"
  ],
  "开始游戏",
  ()=>{hideModal();loadLevel(0)}
);
loadLevel(0);
gameState="intro";
requestAnimationFrame(loop);
requestAnimationFrame(draw);