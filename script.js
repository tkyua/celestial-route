// 乗組員の初期設定と、全員で共有する航路
const crewMembers = {
  astronaut: { name: "宇宙飛行士", task: "勉強", color: "#a4afff" },
  dog: { name: "犬の隊長", task: "筋トレ", color: "#ffbd8e", face: "#e8a473" },
  robot: { name: "ロボット", task: "制作", color: "#8ee9ce", face: "#4e8293" },
  cat: { name: "宇宙ねこ", task: "読書", color: "#cfb5f4" },
  mechanic: { name: "整備士", task: "作業", color: "#f5a874" },
  alien: { name: "ちび宇宙人", task: "アイデア出し", color: "#c4d3a0", face: "#a49ac6" },
  botanist: { name: "植物研究員", task: "調べもの", color: "#e9d79c" },
};

const route = [
  { name: "月", minutes: 10, colors: ["#a3aec7", "#e4e8f0", "#737c99"] },
  { name: "火星", minutes: 35, colors: ["#cf6f62", "#ffad81", "#8f495c"] },
  { name: "木星", minutes: 90, colors: ["#cc9573", "#f4d4a2", "#95627a"] },
  { name: "土星", minutes: 150, colors: ["#cbb58a", "#f5e0a8", "#9f886d"] },
  { name: "天王星", minutes: 230, colors: ["#70bebe", "#b3ece5", "#467c9b"] },
  { name: "海王星", minutes: 320, colors: ["#577ad4", "#9aaeff", "#41478c"] },
];

const $ = (id) => document.getElementById(id);
const storageKey = "space-focus-v1";
const minute = 60_000;
const rooms = { cabin: "操縦室", observatory: "観測室" };
const originalBerths = { astronaut: "cabin", dog: "cabin", robot: "cabin" };
const initialState = { selected: "astronaut", pilots: {}, history: [], flight: null, music: "off" };
let state = initialState;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.pilots && Array.isArray(saved.history)) state = { ...initialState, ...saved };
} catch {
  // ストレージが使えないときも、このページを開いている間は遊べる。
}
for (const [id, member] of Object.entries(crewMembers)) {
  state.pilots[id] ??= { task: member.task, total: 0 };
}
const berths = state.berths ?? originalBerths;
state.berths = Object.fromEntries(Object.keys(crewMembers)
  .filter((id) => Object.hasOwn(berths, id))
  .map((id) => [id, Object.hasOwn(rooms, berths[id]) ? berths[id] : null]));
if (!Object.values(state.berths).some(Boolean)) state.berths = { ...originalBerths };

function flightCrew() {
  return Object.keys(crewMembers).filter((id) => state.berths[id]);
}

if (!flightCrew().includes(state.selected)) state.selected = flightCrew()[0];
let flight = state.flight;
let frame = 0;
let spaceFrame = 0;
let crewFrame = 0;
let reactionTimer = 0;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    $("storage-note").textContent = "このブラウザでは保存できません。記録はページを開いている間だけ残ります。";
  }
}

function show(screen) {
  const archive = screen === "atlas-screen" || screen === "logbook-screen";
  const view = archive ? "hangar" : screen;
  for (const id of ["space", "hangar", "deck", "cockpit", "report"]) $(id).hidden = id !== view;
  $("app").dataset.screen = view;
  $("app").dataset.destination = screen;
  if (archive) $("records").open = true;
  cancelAnimationFrame(spaceFrame);
  cancelAnimationFrame(crewFrame);
  if (view === "space") {
    resizeSpace();
    drawSpace(performance.now());
  }
  clearTimeout(reactionTimer);
  if (view === "hangar") drawCabin();
  window.scrollTo(0, 0);
  document.dispatchEvent(new Event("screenchange"));
}

// 文字で置いたドットを Canvas に描く。1文字が1ドット。
const rocketPixels = [
  "......A......", ".....AAA.....", "....AWWWA....", "....AWWWA....",
  "...AWWWWWA...", "...AWBBWWA...", "...AWBBWWA...", "...AWWWWWA...",
  "..AAWWWWWAA..", ".AAAWAAAAAAA.", ".A.AAAAAAA.A.",
  ".....OOO.....", ".....OYO.....", "......Y......",
];

function drawPixels(ctx, rows, palette, x, y, scale = 1) {
  rows.forEach((row, dy) => {
    [...row].forEach((pixel, dx) => {
      if (pixel === ".") return;
      ctx.fillStyle = palette[pixel];
      ctx.fillRect(x + dx * scale, y + dy * scale, scale, scale);
    });
  });
}

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

const stars = Array.from({ length: 76 }, (_, index) => ({
  x: (index * 73 + 15) % 180,
  y: (index * 47 + 27) % 147,
  size: index % 9 === 0 ? 2 : 1,
  speed: 5 + index % 3 * 8,
}));

function drawSky(canvas, seconds = 0) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  rect(ctx, "#141837", 0, 0, width, height);
  rect(ctx, "#191d41", 0, height * .63, width, Math.ceil(height * .37));
  for (const [index, star] of stars.entries()) {
    const x = ((star.x - seconds * star.speed) % width + width) % width;
    const color = index % 3 === 0 ? "#d3d9ff" : "#6472a4";
    rect(ctx, color, x, star.y % height, star.size, star.size);
  }
  return ctx;
}

const pilotTrim = {
  astronaut: { light: "#dce5ff", shadow: "#7986cb", badge: "#ffe09e" },
  dog: { light: "#ffdcaf", shadow: "#d58a66", badge: "#dc7775" },
  robot: { light: "#c4f6e7", shadow: "#529e9b", badge: "#ffe09e" },
  cat: { light: "#f3dfff", shadow: "#8f74c1", badge: "#ffe0a6" },
  mechanic: { light: "#ffe0b7", shadow: "#ab654f", badge: "#a0efdd" },
  alien: { light: "#eef3ce", shadow: "#899a72", badge: "#e5b8d9" },
  botanist: { light: "#fff1c7", shadow: "#ad995f", badge: "#a6d8a4" },
};

function drawPilot(ctx, id, x, y, scale = 1, facingAway = false) {
  const pilot = crewMembers[id];
  const trim = pilotTrim[id];
  const box = (color, dx, dy, w, h) => rect(ctx, color, x + dx * scale, y + dy * scale, w * scale, h * scale);

  // 初期の16×16ドットの輪郭の内側だけに、光と影を足す。
  box("#323859", 3, 0, 10, 2);
  box("#4c567b", 4, 0, 7, 1);
  box(pilot.color, 1, 2, 14, 10);
  box(pilot.color, 4, 12, 8, 4);
  box(trim.light, 2, 2, 10, 1);
  box(trim.light, 2, 3, 1, 2);
  box(trim.shadow, 14, 4, 1, 7);
  box(trim.shadow, 2, 11, 12, 1);
  box(trim.light, 5, 12, 6, 1);
  box(trim.shadow, 4, 15, 3, 1);
  box(trim.shadow, 9, 15, 3, 1);

  box(facingAway ? pilot.color : "#353c60", 3, 4, 10, 6);
  if (!facingAway && !pilot.face) {
    // 黒いバイザーの左上だけに、宇宙の光が反射する。
    box("#111526", 4, 4, 8, 6);
    box("#111526", 3, 5, 10, 4);
    box("#232c45", 4, 9, 8, 1);
    box("#859ec3", 4, 5, 3, 1);
    box("#455674", 4, 6, 1, 1);
  } else if (!facingAway) {
    const eyes = id === "robot" ? "#b8ffe6" : "#26304f";
    box(pilot.face, 4, 5, 8, 5);
    box(eyes, 5, 6, 1, 1);
    box(eyes, 10, 6, 1, 1);
    if (id === "robot") {
      box("#78b2b9", 5, 5, 3, 1);
      box("#294e67", 7, 8, 2, 1);
    }
  }

  if (id === "dog") {
    box("#a96852", 0, 2, 3, 6);
    box("#a96852", 13, 2, 3, 6);
    box("#c98765", 0, 2, 2, 1);
    box("#8a5147", 14, 6, 2, 2);
    if (!facingAway) {
      box("#ffcb9c", 6, 8, 4, 2);
      box("#6f464a", 7, 8, 2, 1);
    }
  }
  if (id === "robot") {
    box("#b2ffe6", 7, 0, 2, 2);
    box("#526c84", 0, 6, 2, 4);
    box("#526c84", 14, 6, 2, 4);
    box("#8bbac2", 0, 6, 2, 1);
    box("#8bbac2", 14, 6, 2, 1);
  }
  if (id === "cat") {
    box(trim.shadow, 1, 0, 4, 4);
    box(trim.shadow, 11, 0, 4, 4);
    box(trim.light, 2, 1, 2, 2);
    box(trim.light, 12, 1, 2, 2);
    box(trim.shadow, 12, 13, 3, 2);
    box(trim.light, 14, 11, 2, 2);
  }
  if (id === "mechanic") {
    box(trim.shadow, 0, 10, 4, 5);
    box(trim.light, 1, 10, 2, 1);
    box("#68748d", 12, 13, 3, 2);
  }
  if (id === "alien") {
    box(trim.shadow, 4, 0, 1, 2);
    box(trim.shadow, 11, 0, 1, 2);
    box(trim.badge, 3, 0, 3, 1);
    box(trim.badge, 10, 0, 3, 1);
    if (!facingAway) box("#d7c9eb", 6, 8, 4, 1);
  }
  if (id === "botanist") {
    box("#56745a", 0, 10, 4, 5);
    box("#93b888", 1, 9, 2, 4);
    box("#bedaaa", 0, 7, 2, 2);
    box("#7fa574", 2, 6, 2, 3);
    if (facingAway) {
      box("#56745a", 5, 10, 6, 5);
      box("#93b888", 6, 11, 4, 3);
    }
  }
  box(trim.badge, 7, 13, 2, 1);
}

function drawPlanet(ctx, planet, cx, cy, radius, locked = false) {
  const colors = locked ? ["#2b3155", "#3b4269", "#232947"] : planet.colors;
  const ring = planet.name === "土星";
  if (ring) rect(ctx, colors[2], cx - radius - 5, cy + 1, radius * 2 + 11, 3);
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y > radius * radius) continue;
      let color = colors[0];
      if ((y + x * .25 + radius * 2) % 7 < 2) color = colors[1];
      if (x - y * .65 > radius * .65) color = colors[2];
      rect(ctx, color, cx + x, cy + y, 1, 1);
    }
  }
  if (ring) rect(ctx, colors[1], cx - radius - 4, cy + 3, radius * 2 + 9, 2);
}

// 宇宙の画面では星とロケットだけを描く。
const spaceFieldWidth = 180;
const spaceStarPadding = 4;
const spaceStarSpan = spaceFieldWidth + 2 * spaceStarPadding;
const wrap = (value, size) => ((value % size) + size) % size;

const spaceStars = Array.from({ length: 100 }, (_, index) => {
  const near = index % 11 === 0;
  return {
    x: wrap(Math.sin(index * 92.17) * 1600, spaceStarSpan),
    y: wrap(Math.cos(index * 33.41) * 2100, 1),
    speed: near ? 1.8 : 0.9,
    color: near ? "#d2d9fa" : index % 3 === 0 ? "#747faf" : "#343e72",
    size: near ? 1.35 : 0.8,
  };
});

function resizeSpace() {
  const { clientWidth, clientHeight } = $("space");
  if (!clientWidth || !clientHeight) return;
  const canvas = $("space-sky");
  canvas.width = clientWidth;
  canvas.height = clientHeight;
}

function drawSpace(now) {
  const canvas = $("space-sky");
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const scale = width / spaceFieldWidth;
  const seconds = reduceMotion.matches ? 0 : now / 1000;
  rect(ctx, "#080a20", 0, 0, width, height);
  for (const star of spaceStars) {
    const x = (wrap(star.x - seconds * star.speed, spaceStarSpan) - spaceStarPadding) * scale;
    const size = star.size * scale;
    // 小数座標のまま描いて、星が少しずつ横に流れるようにする。
    ctx.fillStyle = star.color;
    ctx.fillRect(x, star.y * height, size, size);
  }
  if (!reduceMotion.matches && !$("space").hidden) spaceFrame = requestAnimationFrame(drawSpace);
}

function drawRocket() {
  const canvas = $("rocket");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPixels(ctx, rocketPixels, {
    A: crewMembers[state.selected].color, W: "#f7efff", B: "#74d4eb", O: "#f78b71", Y: "#ffde8c",
  }, 3, 4, 2);
  rect(ctx, "#b5c2fa", 15, 33, 2, 2);
  rect(ctx, "#666ec1", 15, 36, 1, 1);
}

function drawCabin(pilotLift = 0, reacting = false) {
  const ctx = drawSky($("cabin-art"));
  // 星が見える窓のまわりに壁と座席を置く。
  rect(ctx, "#242b51", 0, 0, 180, 12);
  rect(ctx, "#303960", 0, 12, 44, 69);
  rect(ctx, "#303960", 136, 12, 44, 69);
  rect(ctx, "#3e4974", 44, 12, 6, 62);
  rect(ctx, "#3e4974", 130, 12, 6, 62);
  rect(ctx, "#181d37", 0, 76, 180, 34);
  rect(ctx, "#45507a", 0, 76, 180, 2);
  rect(ctx, "#293252", 0, 99, 180, 2);
  rect(ctx, "#4b5981", 9, 34, 24, 23);
  rect(ctx, "#151e39", 11, 36, 20, 19);
  rect(ctx, "#7be4c9", 15, 42, 10, 2);
  rect(ctx, "#6d81bc", 15, 47, 5, 2);
  rect(ctx, "#151e39", 149, 30, 23, 29);
  rect(ctx, "#788bbb", 152, 34, 16, 2);
  rect(ctx, "#dba685", 152, 43, 3, 3);
  rect(ctx, "#87cbbf", 159, 43, 3, 3);
  rect(ctx, "#354466", 56, 49, 68, 42);
  rect(ctx, "#4e5d89", 60, 47, 60, 5);
  rect(ctx, "#293454", 62, 92, 56, 5);
  const y = 23 - pilotLift;
  drawPilot(ctx, state.selected, 58, y, 4);
  if (!reacting) return;
  if (state.selected === "astronaut") {
    rect(ctx, "#323859", 104, y + 29, 12, 18);
    rect(ctx, "#a4afff", 108, y + 25, 8, 14);
    rect(ctx, "#dce5ff", 106, y + 25, 10, 4);
  } else if (state.selected === "dog") {
    rect(ctx, "#a96852", 54, y + 7, 12, 9);
    rect(ctx, "#a96852", 114, y + 7, 12, 9);
    rect(ctx, "#c98765", 54, y + 7, 8, 3);
  } else if (state.selected === "cat") {
    rect(ctx, "#f3dfff", 64, y - 4, 8, 5);
    rect(ctx, "#c7a5f1", 113, y + 37, 8, 8);
  } else if (state.selected === "mechanic") {
    rect(ctx, "#a8b8cf", 103, y + 30, 4, 17);
    rect(ctx, "#d5e0f0", 101, y + 26, 9, 5);
  } else if (state.selected === "alien") {
    rect(ctx, "#e5b8d9", 69, y - 3, 10, 4);
    rect(ctx, "#e5b8d9", 98, y - 3, 10, 4);
    rect(ctx, "#eef3ce", 65, y - 5, 4, 4);
    rect(ctx, "#eef3ce", 108, y - 5, 4, 4);
  } else if (state.selected === "botanist") {
    rect(ctx, "#93b888", 63, y + 20, 4, 12);
    rect(ctx, "#bedaaa", 55, y + 17, 10, 5);
    rect(ctx, "#7fa574", 65, y + 14, 8, 6);
  } else {
    rect(ctx, "#e3fff3", 78, y + 24, 4, 4);
    rect(ctx, "#e3fff3", 98, y + 24, 4, 4);
    rect(ctx, "#e3fff3", 86, y - 5, 4, 12);
    rect(ctx, "#e3fff3", 82, y - 1, 12, 4);
  }
}

$("cabin-react").onclick = () => {
  if (launching) return;
  cancelAnimationFrame(crewFrame);
  clearTimeout(reactionTimer);
  const started = performance.now();
  const still = reduceMotion.matches;
  function react(now) {
    const phase = (now - started) / 650;
    const dog = state.selected === "dog";
    const hopping = dog || state.selected === "alien";
    const lift = still || !hopping ? 0 : Math.max(0, Math.sin(phase * Math.PI * 2)) * 6;
    drawCabin(lift, still || !dog || Math.floor(phase * 6) % 2 === 0);
    if (!still && phase < 1 && !$("hangar").hidden) crewFrame = requestAnimationFrame(react);
  }
  react(started);
  reactionTimer = setTimeout(() => drawCabin(), 850);
};

function animatePilot() {
  cancelAnimationFrame(crewFrame);
  if (reduceMotion.matches) {
    drawCabin();
    return;
  }
  const started = performance.now();
  function hop(now) {
    const progress = Math.min(1, (now - started) / 250);
    drawCabin(Math.sin(progress * Math.PI) * 8);
    if (progress < 1 && !$("hangar").hidden) crewFrame = requestAnimationFrame(hop);
  }
  crewFrame = requestAnimationFrame(hop);
}

function enterCabin() {
  const space = $("space");
  const board = $("board");
  if (space.hidden || board.disabled) return;
  function open() {
    space.classList.remove("boarding");
    board.disabled = false;
    show("hangar");
    $("hangar").classList.add("entered");
    $("cabin-title").focus();
  }
  if (reduceMotion.matches) {
    open();
    return;
  }
  board.disabled = true;
  space.classList.add("boarding");
  // CSS と同じ長さだけ待って、拡大したロケットの船内を表示。
  setTimeout(open, 480);
}

function nextPlanet(total) {
  return route.find((planet) => planet.minutes > total);
}

function drawCockpit(active, ratio, seconds) {
  const ctx = drawSky($("window"), seconds);
  const traveled = active.before + ratio * active.journeyMinutes;
  const target = nextPlanet(traveled);
  if (target) {
    const index = route.indexOf(target);
    const previous = route[index - 1]?.minutes ?? 0;
    const approach = (traveled - previous) / (target.minutes - previous);
    const radius = Math.round(4 + approach * 23);
    drawPlanet(ctx, target, 119 - approach * 20, 50, radius);
  }

  // 窓のフレームと計器盤
  rect(ctx, "#2f375c", 0, 0, 180, 7);
  rect(ctx, "#444f79", 0, 0, 8, 120);
  rect(ctx, "#444f79", 172, 0, 8, 120);
  rect(ctx, "#2d365c", 0, 108, 180, 38);
  rect(ctx, "#55618e", 0, 108, 180, 3);
  rect(ctx, "#1c2446", 12, 119, 34, 16);
  rect(ctx, "#1c2446", 134, 119, 34, 16);
  rect(ctx, "#7fdcca", 18, 124, 15, 2);
  rect(ctx, "#f5bc87", 141, 124, 4, 3);
  rect(ctx, "#a6b3ff", 149, 124, 4, 3);
  drawPilot(ctx, active.crew, 74, 101, 2, true);
  rect(ctx, "#57628e", 68, 131, 44, 15);
  rect(ctx, "#6b79a5", 71, 131, 38, 3);
}

// 格納庫と図鑑
function renderCrew() {
  $("crew").replaceChildren();
  for (const id of flightCrew()) {
    const pilot = crewMembers[id];
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.crew = id;
    const art = document.createElement("canvas");
    art.width = art.height = 20;
    art.setAttribute("aria-hidden", "true");
    drawPilot(art.getContext("2d"), id, 2, 2);
    button.append(art, document.createTextNode(pilot.name));
    button.onclick = () => selectCrew(id);
    $("crew").append(button);
  }
}

function selectCrew(id) {
  const changed = state.selected !== id;
  cancelAnimationFrame(crewFrame);
  clearTimeout(reactionTimer);
  state.selected = id;
  $("task").value = state.pilots[id].task;
  for (const button of $("crew").children) {
    button.setAttribute("aria-pressed", String(button.dataset.crew === id));
  }
  renderMission();
  renderRouteMap();
  drawRocket();
  drawCabin();
  if (changed && !$("hangar").hidden) animatePilot();
  save();
}

function renderMission() {
  const pilot = state.pilots[state.selected];
  const target = nextPlanet(pilot.total);
  $("mission").textContent = "累計 " + pilot.total + "分 · " +
    (target ? target.name + "まであと" + (target.minutes - pilot.total) + "分" : "全航路を踏破");
}

// SVG の航路線と同じ座標に天体を置く。
const mapPositions = [
  [110, 110], [258, 65], [464, 105],
  [493, 245], [303, 293], [107, 252],
];

function drawMapPlanet(ctx, planet, index) {
  const radius = [7, 8, 11, 9, 9, 8][index];
  const [base, light, shadow] = planet.colors;
  const ringed = planet.name === "土星";

  // 輪の奥側を天体の前に描く。
  function drawRing(front) {
    for (let y = -14; y <= 14; y++) {
      for (let x = -16; x <= 16; x++) {
        const along = (x * .92 - y * .39) / 16;
        const across = (x * .39 + y * .92) / 5;
        const distance = along * along + across * across;
        if ((across > 0) !== front || distance < .76 || distance > 1.15) continue;
        rect(ctx, front ? light : shadow, 18 + x, 17 + y, 1, 1);
      }
    }
  }

  if (ringed) drawRing(false);
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y > radius * radius) continue;
      let color = base;
      if (index === 2 || ringed) {
        if ((y + radius) % 6 < 2) color = light;
      } else if ((x + 2) ** 2 + (y + 2) ** 2 < radius * radius * .38) {
        color = light;
      }
      if (x - y * .48 > radius * .5) color = shadow;
      rect(ctx, color, 18 + x, 17 + y, 1, 1);
    }
  }
  if (index === 0) {
    rect(ctx, shadow, 14, 14, 3, 2);
    rect(ctx, shadow, 19, 19, 2, 2);
  }
  if (index === 1) rect(ctx, "#a54e58", 13, 18, 4, 2);
  if (index === 2) rect(ctx, "#b66b60", 17, 19, 5, 2);
  if (ringed) drawRing(true);
}

function renderRouteMap(replay = null) {
  const crewId = replay?.entry.crew || state.selected;
  const crew = crewMembers[crewId];
  const { total } = state.pilots[crewId];
  renderReplay(replay);
  const next = nextPlanet(total);
  $("map-crew").textContent = crew.name + "の航路 · 累計 " + total + "分";
  const planets = $("map-planets");
  planets.replaceChildren();

  function inspect(planet, selectedButton) {
    for (const button of planets.children) {
      button.setAttribute("aria-pressed", String(button === selectedButton));
    }
    const remaining = planet.minutes - total;
    $("map-detail").textContent = planet.name + " · " +
      (remaining <= 0 ? "到達済み" : "あと" + remaining + "分") + "（到達目安：累計" + planet.minutes + "分）";
  }

  const segments = $("map-route").children;
  route.forEach((planet, index) => {
    const status = planet.minutes <= total ? "visited" : planet === next ? "next" : "later";
    if (index > 0 && segments[index - 1]) segments[index - 1].dataset.status = status;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-stop";
    button.dataset.status = status;
    button.style.setProperty("--map-x", mapPositions[index][0] / 6 + "%");
    button.style.setProperty("--map-y", mapPositions[index][1] / 3.6 + "%");
    button.setAttribute("aria-label", planet.name +
      (status === "visited" ? "・到達済み" : status === "next" ? "・次の目的地" : "・未到達"));
    const art = document.createElement("canvas");
    art.width = art.height = 36;
    art.setAttribute("aria-hidden", "true");
    drawMapPlanet(art.getContext("2d"), planet, index);
    const name = document.createElement("span");
    name.className = "map-name";
    name.textContent = (status === "visited" ? "✓ " : status === "next" ? "▸ " : "") + planet.name;
    button.append(art, name);
    if (status !== "visited") {
      const badge = document.createElement("span");
      badge.className = "map-lock";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "?";
      button.append(badge);
    }
    button.onclick = () => {
      inspect(planet, button);
      openObservation(planet, index, crewId, total);
    };
    planets.append(button);
  });

  const initial = next || route.at(-1);
  inspect(initial, planets.children[route.indexOf(initial)]);
}

// 観測画面では光の向きを固定し、球面の模様だけを回す。
let observationFrame = 0;
function drawObservation(planet, index, locked, angle) {
  const canvas = $("planet-preview");
  const ctx = drawSky(canvas);
  const [base, light, shadow] = locked
    ? ["#9698a5", "#bfc0c9", "#686a7b"]
    : planet.colors;
  const cx = 60, cy = 43, radius = index === 3 ? 22 : 28;
  const ring = index === 3;

  function drawRing(front) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-.23);
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 11, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    ctx.strokeStyle = front ? light : shadow;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  if (ring) drawRing(false);
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const nx = x / radius, ny = y / radius;
      if (nx * nx + ny * ny > 1) continue;
      const depth = Math.sqrt(1 - nx * nx - ny * ny);
      const longitude = Math.atan2(nx, depth) + angle;
      const patch = Math.sin(longitude * 3 + ny * 8) + Math.sin(longitude * 5 - ny * 11);
      const band = Math.sin(ny * 22 + Math.sin(longitude * 2) * .7);
      const craters = index === 0 && patch > 1.3;
      const stripes = (index === 2 || ring) && band > .35;
      const lit = index === 2 || ring ? stripes : patch > .35;
      const dark = craters || nx * .75 - ny * .3 - depth * .5 > .4;
      rect(ctx, dark ? shadow : lit ? light : base, cx + x, cy + y, 1, 1);
    }
  }
  if (ring) drawRing(true);
}

function openObservation(planet, index, crewId, total) {
  const dialog = $("planet-dialog");
  const locked = planet.minutes > total;
  dialog.dataset.locked = String(locked);
  $("planet-title").textContent = planet.name;
  $("planet-status").textContent = locked ? "この天体はまだ未解放です。" : "観測済み";
  if (locked) {
    $("planet-progress").textContent = crewMembers[crewId].name + "の到達まであと" + (planet.minutes - total) + "分";
  } else {
    const arrival = state.history.findLast(entry => entry.crew === crewId && entry.discoveries.includes(planet.name));
    $("planet-progress").textContent = crewMembers[crewId].name + "が到達" +
      (arrival ? " · " + new Date(arrival.date).toLocaleDateString("ja-JP") : "");
  }
  dialog.showModal();
  const start = performance.now();
  let lastFrame = -Infinity;
  function rotate(now) {
    if (!dialog.open) return;
    if (now - lastFrame >= 55) {
      drawObservation(planet, index, locked, (now - start) / 3400);
      lastFrame = now;
    }
    if (!reduceMotion.matches) observationFrame = requestAnimationFrame(rotate);
  }
  rotate(start);
}

$("planet-dialog").onclose = () => cancelAnimationFrame(observationFrame);

// 記録の累計時間から、航路の各区間に含まれる範囲だけを光らせる。
function renderReplay(replay) {
  $("map-replay").hidden = !replay;
  $("map-field").dataset.replay = String(!!replay);
  const layer = $("map-replay-route");
  layer.replaceChildren();
  if (!replay) return;

  const { entry, start, end } = replay;
  const day = new Date(entry.date).toLocaleDateString("ja-JP");
  const beyond = start >= route.at(-1).minutes ? " · 海王星に到達したあとの航海" : "";
  $("map-replay-text").textContent = day + "の航海 · " + entry.task +
    " " + entry.minutes + "分（累計 " + start + " → " + end + "分）" + beyond;

  const segments = $("map-route").children;
  route.forEach((planet, index) => {
    const previous = route[index - 1]?.minutes || 0;
    const from = Math.max(start, previous);
    const to = Math.min(end, planet.minutes);
    if (from >= to) return;
    const length = planet.minutes - previous;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const firstLeg = "M48 162 Q67 138 110 110";
    path.setAttribute("d", index === 0 ? firstLeg : segments[index - 1].getAttribute("d"));
    path.setAttribute("pathLength", "1");
    path.setAttribute("stroke-dasharray", "0 " + (from - previous) / length + " " + (to - from) / length + " 1");
    layer.append(path);
  });
}

$("map-replay-close").onclick = () => {
  renderRouteMap();
  $("map-title").focus();
};

function renderRecords() {
  $("atlas").replaceChildren();
  let discovered = 0;
  for (const planet of route) {
    const visitors = Object.keys(crewMembers).filter((id) => state.pilots[id].total >= planet.minutes);
    if (visitors.length) discovered++;
    const card = document.createElement("article");
    card.className = "planet-card";
    const art = document.createElement("canvas");
    art.width = 40;
    art.height = 28;
    art.setAttribute("aria-hidden", "true");
    drawPlanet(art.getContext("2d"), planet, 20, 13, 9, visitors.length === 0);
    const title = document.createElement("strong");
    title.textContent = visitors.length ? planet.name : "未発見";
    const detail = document.createElement("small");
    detail.textContent = visitors.map((id) => crewMembers[id].name).join("・") || "探索中";
    card.append(art, title, detail);
    $("atlas").append(card);
  }
  $("atlas-count").textContent = discovered + " / " + route.length;
  $("log").replaceChildren();
  const totals = Object.fromEntries(Object.entries(state.pilots).map(([id, pilot]) => [id, pilot.total]));
  for (const entry of state.history) {
    const end = totals[entry.crew];
    const start = Math.max(0, end - entry.minutes);
    totals[entry.crew] = start;
    const li = document.createElement("li");
    li.className = "log-entry";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "log-replay";
    const label = document.createElement("span");
    const day = new Date(entry.date).toLocaleDateString("ja-JP");
    label.textContent = day + " · " + crewMembers[entry.crew].name + " · " + entry.task +
      " · " + entry.minutes + "分" + (entry.discoveries.length ? " · " + entry.discoveries.join("、") + "を発見" : "");
    const action = document.createElement("span");
    action.textContent = "航路を見る ↗";
    button.append(label, action);
    button.onclick = () => {
      renderRouteMap({ entry, start, end });
      $("map-title").focus({ preventScroll: true });
      $("map-title").scrollIntoView({ block: "start" });
    };
    li.append(button);
    $("log").append(li);
  }
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "最初の旅に出ると、ここに航海が記録されます。";
    $("log").append(li);
  }
}

// Web Audio で短いオリジナルのフレーズを鳴らす。
const melodies = {
  retro: { notes: [60, 67, 72, null, 64, 69, 76, null, 65, 72, 77, null, 67, 74, 79, null], step: .29, wave: "square", volume: .028 },
  calm: { notes: [48, null, 55, 60, 62, null, 55, null, 53, null, 60, 65, 67, null, 60, null], step: .73, wave: "sine", volume: .09 },
};
let audioContext;
let musicLoop;
let musicBus;
let playing = false;

function stopMusic() {
  clearInterval(musicLoop);
  if (musicBus) musicBus.disconnect();
  musicBus = null;
  playing = false;
  updateMuteButton();
}

function updateMuteButton() {
  $("mute").disabled = !flight || flight.paused || flight.music === "off";
  $("mute").textContent = playing ? "BGMをオフ" : "BGMを再生";
  if (flight?.music === "off") $("mute").textContent = "BGMなし";
}

async function playMusic() {
  const active = flight;
  if (!active || active.paused || active.music === "off") return;
  stopMusic();
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audioContext ??= new Audio();
    await audioContext.resume();
    if (flight !== active || active.paused || active.muted || playing) return;
    const melody = melodies[active.music];
    const bus = audioContext.createGain();
    bus.connect(audioContext.destination);
    musicBus = bus;
    let index = 0;
    let nextNote = audioContext.currentTime + .05;
    function schedule() {
      const now = audioContext.currentTime;
      if (nextNote < now) nextNote = now + .04;
      while (nextNote < now + .17) {
        const note = melody.notes[index % melody.notes.length];
        if (note !== null) {
          const oscillator = audioContext.createOscillator();
          const volume = audioContext.createGain();
          oscillator.type = melody.wave;
          oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
          volume.gain.setValueAtTime(.001, nextNote);
          volume.gain.exponentialRampToValueAtTime(melody.volume, nextNote + .04);
          volume.gain.exponentialRampToValueAtTime(.001, nextNote + melody.step * .95);
          oscillator.connect(volume);
          volume.connect(bus);
          oscillator.start(nextNote);
          oscillator.stop(nextNote + melody.step);
        }
        index++;
        nextNote += melody.step;
      }
    }
    schedule();
    musicLoop = setInterval(schedule, 90);
    playing = true;
    updateMuteButton();
  } catch {
    if (flight === active) {
      stopMusic();
      $("mute").textContent = "BGMを再試行";
    }
  }
}

// 終了時刻との差で残り時間を計算するので、別タブから戻っても数え直せる。
function remaining(active) {
  return active.paused
    ? active.left
    : Math.max(0, Math.min(active.duration, active.deadline - Date.now()));
}

let launching = false;

function launch(isDemo) {
  if (launching) return;
  if (flight) {
    openCockpit();
    return;
  }
  // BGM 用の許可を得られるよう、クリックの時点で音声を準備する。
  const Audio = window.AudioContext || window.webkitAudioContext;
  if ($("music").value !== "off" && Audio) {
    try {
      audioContext ??= new Audio();
      audioContext.resume().catch(() => {});
    } catch {
      // 音声を使えない環境でも飛行は始められる。
    }
  }
  if (reduceMotion.matches) {
    startFlight(isDemo);
    return;
  }
  launching = true;
  const cabin = $("hangar");
  cabin.inert = true;
  cabin.classList.add("launching");
  setTimeout(() => {
    launching = false;
    cabin.inert = false;
    cabin.classList.remove("launching", "entered");
    startFlight(isDemo);
  }, 620);
}

function startFlight(isDemo) {
  const crew = state.selected;
  const pilot = state.pilots[crew];
  const duration = isDemo ? 20_000 : Number($("minutes").value) * minute;
  flight = {
    crew, task: pilot.task, before: isDemo ? 0 : pilot.total,
    journeyMinutes: isDemo ? 35 : duration / minute,
    music: $("music").value, muted: false, demo: isDemo,
    duration, deadline: Date.now() + duration, paused: false, left: duration,
  };
  if (!isDemo) {
    state.flight = flight;
    save();
  }
  openCockpit();
  playMusic();
}

function openCockpit() {
  show("cockpit");
  $("flight-tag").textContent = flight.demo ? "DEMO FLIGHT" : "SPACE FLIGHT";
  $("flight-task").textContent = crewMembers[flight.crew].name + " · " + flight.task;
  $("flight-title").focus();
  updateMuteButton();
  tick();
}

function tick() {
  cancelAnimationFrame(frame);
  if (!flight) return;
  const left = remaining(flight);
  if (left === 0) {
    finishFlight();
    return;
  }
  const seconds = Math.ceil(left / 1000);
  const twoDigits = (value) => String(value).padStart(2, "0");
  $("timer").textContent = twoDigits(Math.floor(seconds / 60)) + ":" + twoDigits(seconds % 60);
  const ratio = 1 - left / flight.duration;
  $("nav-timer").textContent = $("timer").textContent;
  $("progress").value = ratio;
  const traveled = flight.before + ratio * flight.journeyMinutes;
  const target = nextPlanet(traveled);
  $("flight-route").textContent = target
    ? "次の観測地点 · " + target.name
    : "太陽系の旅を踏破";
  $("flight-title").textContent = flight.paused ? "休憩中" : "航行中";
  $("pause").textContent = flight.paused ? "再開する" : "休憩する";
  if (!$("cockpit").hidden) {
    drawCockpit(flight, ratio, reduceMotion.matches ? 0 : (flight.duration - left) / 1000);
  }
  if (!flight.paused) frame = requestAnimationFrame(tick);
}

function finishFlight() {
  const completed = flight;
  flight = null;
  state.flight = null;
  if ($("abort-dialog").open) $("abort-dialog").close("keep");
  for (const id of ["planet-dialog", "crew-catalog"]) {
    if ($(id).open) $(id).close();
  }
  stopMusic();
  const total = completed.before + completed.journeyMinutes;
  const reached = route.filter((planet) => planet.minutes <= total);
  const discoveries = reached.filter((planet) => planet.minutes > completed.before);
  const furthest = reached.at(-1);
  const next = nextPlanet(total);

  if (!completed.demo) {
    state.pilots[completed.crew].total = total;
    state.history.unshift({
      crew: completed.crew, task: completed.task, minutes: completed.journeyMinutes,
      date: new Date().toISOString(), discoveries: discoveries.map((planet) => planet.name),
    });
    save();
    renderMission();
    renderRouteMap();
    renderRecords();
  }

  const lastDiscovery = discoveries.at(-1);
  $("report-title").textContent = lastDiscovery ? lastDiscovery.name + "に到着！" : "航海を記録しました";
  $("report-summary").textContent = completed.demo
    ? "体験飛行で35分ぶんの航路を進みました。"
    : crewMembers[completed.crew].name + " · " + completed.task + " " + completed.journeyMinutes +
      "分（累計 " + total + "分）";
  $("discoveries").replaceChildren();
  for (const planet of discoveries) {
    const li = document.createElement("li");
    li.textContent = "✦ " + planet.name + "を発見";
    $("discoveries").append(li);
  }
  $("report-next").textContent = completed.demo
    ? "体験飛行の内容は図鑑や航海日誌に加算されません。"
    : next ? next.name + "まであと" + (next.minutes - total) + "分。" : "全航路を踏破しました。";
  const ctx = drawSky($("report-art"));
  if (furthest) drawPlanet(ctx, furthest, 115, 47, 27);
  drawPilot(ctx, completed.crew, 38, 38, 2);
  show("report");
  $("report-title").focus();
}

// HTML とつながるボタンの処理
$("task").addEventListener("change", () => {
  const pilot = state.pilots[state.selected];
  pilot.task = $("task").value.trim() || crewMembers[state.selected].task;
  $("task").value = pilot.task;
  save();
});

for (const button of document.querySelectorAll("[data-minutes]")) {
  button.onclick = () => { $("minutes").value = button.dataset.minutes; };
}

$("music").value = state.music;
$("music").onchange = () => {
  state.music = $("music").value;
  save();
};

$("flight-form").onsubmit = (event) => {
  event.preventDefault();
  launch(false);
};

$("pause").onclick = () => {
  if (!flight) return;
  if (flight.paused) {
    flight.deadline = Date.now() + flight.left;
    flight.paused = false;
    if (!flight.muted) playMusic();
  } else {
    flight.left = remaining(flight);
    flight.paused = true;
    stopMusic();
  }
  if (!flight.demo) save();
  updateMuteButton();
  tick();
};

$("mute").onclick = () => {
  if (!flight) return;
  flight.muted = playing;
  if (playing) stopMusic();
  else playMusic();
  if (!flight.demo) save();
};

$("abort").onclick = () => {
  $("abort-dialog").returnValue = "";
  $("abort-dialog").showModal();
};
$("abort-dialog").onclose = () => {
  if ($("abort-dialog").returnValue !== "stop" || !flight) return;
  cancelAnimationFrame(frame);
  flight = null;
  state.flight = null;
  stopMusic();
  save();
  show("hangar");
};
$("home").onclick = () => show("hangar");
$("board").onclick = enterCabin;
$("exit-cabin").onclick = () => {
  $("hangar").classList.remove("entered");
  show("space");
  $("board").focus();
};
window.addEventListener("resize", () => {
  if ($("space").hidden) return;
  resizeSpace();
  if (reduceMotion.matches) drawSpace(performance.now());
});
reduceMotion.addEventListener?.("change", () => {
  if ($("space").hidden) return;
  cancelAnimationFrame(spaceFrame);
  drawSpace(performance.now());
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && flight) tick();
});

renderCrew();
selectCrew(state.selected);
renderRecords();
if (flight) openCockpit();
else show("space");
$("app").dataset.ready = "true";
