// 船内用の小さなドット絵。通常の飛行士とは別の、11×11 のスプライト。
const miniCrew = {
  astronaut: [
    "....DDD....", "..DLLLLLD..", ".DLLLLLLLD.", ".DLVVVVVLD.", ".DLVSVVVLD.",
    ".DLVVVVVLD.", "..DLLLLLD..", "..DLMMLD...", "...LLMLD...", "...DL.DL...", "...DD.DD...",
  ],
  dog: [
    "...DDDDD...", "..DLLLLLD..", ".ELMMMMMLE.", "EEMFFFFFMEE", "EEMVFFFVMEE",
    ".EMMLNLMME.", "..DMLLLMD..", "...DMSMD...", "..DLMMMHD..", "..DDM.MDD..", "...DD.DD...",
  ],
  robot: [
    ".....G.....", ".....H.....", "..DDDDDDD..", ".DLMMMMMHD.", "QDVFFFFFVDQ",
    "BDVGFFFGVDB", "BDVFFVFFVDB", "..DHHHHHD..", "...DLSHD...", "...DM.MD...", "...DD.DD...",
  ],
  cat: [
    "..D.....D..", ".DLD...DLD.", ".DLLDDDLLD.", ".DLLLLLLLD.", ".DLVVVVVLD.",
    ".DLVSVVVLD.", "..DLLLLLD..", "...DMMLD...", "...DMLLDD.D", "...DL.LDLD.", "...DD.DDD..",
  ],
  mechanic: [
    "....DDD....", "..DMMMMMD..", ".DLMLMLMLD.", ".DLVVVVVLD.", ".DLVSVVVLD.",
    ".DLVVVVVLD.", "DDDLLLLLD..", "DLDDMMLD...", "DLDLMSLD...", ".DDDL.LD...", "...DD.DD...",
  ],
  alien: [
    "..S.....S..", "..HDDDDDH..", ".DLLMMMMLD.", "DLMFFFFFMLD", "DLMVFFFVMLD",
    ".DMFFFFFMD.", "..DMLLLMD..", "...DMSMD...", "..DLMMMHD..", "...DM.MD...", "...DD.DD...",
  ],
  botanist: [
    "...DDDDD...", "..DLLLLLD..", ".DLMMMMMHD.", ".DLVVVVVHD.", ".DLVSVVVHD.",
    ".DLVVVVVHD.", "..DMMMMMD..", ".PPDMLLD...", "PRPDMSMD...", ".PPDM.MD...", "...DD.DD...",
  ],
};

const roomSpots = {
  cabin: { astronaut: [44, 70], dog: [20, 84], robot: [65, 82], cat: [81, 68], mechanic: [44, 91], alien: [14, 64], botanist: [83, 91] },
  observatory: { astronaut: [44, 79], dog: [23, 87], robot: [72, 88], cat: [65, 62], mechanic: [83, 73], alien: [17, 65], botanist: [48, 96] },
};
const roomCodes = { cabin: "01 / CABIN", observatory: "02 / OBSERVATORY" };
const deckScene = $("deck-scene");
const deckTray = $("deck-tray");
const roster = $("deck-roster");
const residents = $("deck-residents");
const catalog = $("crew-catalog");
let room = "cabin";
let drag;

function miniArt(id) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 12;
  canvas.setAttribute("aria-hidden", "true");
  const trim = pilotTrim[id];
  drawPixels(canvas.getContext("2d"), miniCrew[id], {
    D: "#11152b", L: trim.light, M: crewMembers[id].color, V: "#262c4b", S: trim.badge,
    F: crewMembers[id].face, H: trim.shadow,
    E: "#a96852", N: "#6f464a",
    B: "#526c84", Q: "#8bbac2", G: "#b8ffe6", P: "#56745a", R: "#bedaaa",
  }, 0, 0);
  return canvas;
}

function deckCard(id, detail) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "deck-card";
  const name = document.createElement("span");
  name.textContent = crewMembers[id].name;
  const subtitle = document.createElement("small");
  subtitle.textContent = detail;
  button.append(miniArt(id), name, subtitle);
  return button;
}

function observationTarget() {
  const total = state.pilots[state.selected].total;
  return nextPlanet(total) ?? route.at(-1);
}

function drawDeck() {
  const canvas = $("deck-art");
  const ctx = canvas.getContext("2d");
  const observatory = room === "observatory";
  const wall = observatory ? "#343457" : "#293654";
  const trim = observatory ? "#66567c" : "#495f82";
  const floor = observatory ? "#25243f" : "#212a45";
  const block = (color, ...coords) => rect(ctx, color, ...coords);

  block("#12172e", 0, 0, 240, 126);
  block(wall, 5, 5, 230, 79);
  block(trim, 8, 8, 224, 3);
  block("#1e2643", 12, 14, 216, 61);
  block(wall, 15, 17, 210, 55);
  block(floor, 6, 81, 228, 40);
  block(trim, 6, 79, 228, 2);
  block("#10162c", 6, 118, 228, 3);
  for (let x = 12; x < 230; x += 18) {
    block(trim, x, 114, 7, 1);
    block("#141a32", x, 92, 1, 18);
  }

  // 窓の外と、部屋ごとの家具。
  const left = observatory ? 58 : 69;
  const width = observatory ? 124 : 102;
  block("#121932", left - 3, 18, width + 6, 47);
  block(trim, left, 19, width, 44);
  block("#131833", left + 3, 22, width - 6, 36);
  block(observatory ? "#28254f" : "#232b54", left + 3, 42, width - 6, 16);
  stars.slice(0, 35).forEach((star, index) => {
    block(index % 4 ? "#737ba7" : "#e6daff", left + 5 + star.x % (width - 10),
      24 + star.y % 32, 1, 1);
  });
  if (observatory) {
    const planet = observationTarget();
    drawPlanet(ctx, planet, 141, 40, 13, planet.minutes > state.pilots[state.selected].total);
    block("#9184ae", 58, 62, 124, 4);
    block("#3d345b", 139, 67, 39, 10);
    block("#796589", 141, 67, 35, 3);
    // 望遠鏡
    block("#171b35", 43, 55, 33, 11);
    block("#a7a4d5", 46, 54, 27, 7);
    block("#d3cae8", 64, 51, 11, 7);
    block("#746889", 54, 62, 6, 17);
    block("#a18bb0", 48, 77, 18, 3);
    block("#403954", 195, 63, 21, 16);
    block("#87ad9b", 204, 56, 6, 9);
    block("#a2c1a2", 201, 57, 4, 4);
    block("#b08177", 201, 64, 11, 6);
  } else {
    drawPlanet(ctx, route[0], 143, 39, 8);
    block("#465272", 59, 62, 122, 9);
    block("#1b2544", 65, 65, 109, 12);
    block("#83dac6", 72, 67, 18, 2);
    block("#6179aa", 72, 71, 13, 2);
    block("#b8b2f2", 148, 67, 12, 2);
    block("#f7b884", 164, 67, 3, 2);
    block("#40536f", 186, 48, 25, 29);
    block("#202a44", 189, 51, 19, 9);
    block("#89ddc6", 192, 54, 9, 2);
    block("#617b9d", 190, 69, 17, 2);
    block("#3d4a65", 24, 66, 32, 14);
    block("#9a777d", 26, 65, 28, 4);
  }

  block("#171d35", 18, 24, 20, 29);
  block(trim, 20, 26, 16, 25);
  block("#202941", 22, 29, 12, 20);
  block("#87ccb9", 30, 39, 2, 4);
  block("#12182e", 0, 0, 5, 126);
  block("#12182e", 235, 0, 5, 126);
}

function reactMini(button) {
  button.classList.remove("is-reacting");
  // 連続タップでもその場でリアクションを最初から再生する。
  void button.offsetWidth;
  button.classList.add("is-reacting");
}

function drawResidents(arriving) {
  residents.replaceChildren();
  const ids = flightCrew().filter((id) => state.berths[id] === room);
  $("deck-empty").hidden = ids.length > 0;
  for (const id of ids) {
    const button = document.createElement("button");
    const [x, y] = roomSpots[room][id];
    button.type = "button";
    button.className = "deck-mini";
    button.dataset.member = id;
    button.style.setProperty("--x", x + "%");
    button.style.setProperty("--y", y + "%");
    button.setAttribute("aria-label", crewMembers[id].name + "のリアクション");
    button.title = crewMembers[id].name;
    if (arriving === id) button.classList.add("arriving");
    const actor = document.createElement("span");
    actor.className = "mini-actor";
    actor.append(miniArt(id));
    button.append(actor);
    button.addEventListener("animationend", (event) => {
      if (event.target === button) button.classList.remove("arriving");
      if (event.animationName.startsWith("mini-react")) button.classList.remove("is-reacting");
    });
    wireDrag(button, id, "scene", () => reactMini(button));
    residents.append(button);
  }
}

function renderDeck(arriving) {
  deckScene.dataset.room = room;
  $("deck-room-label").textContent = roomCodes[room];
  $("deck-observe").hidden = room !== "observatory";
  $("deck-observe").setAttribute("aria-label", observationTarget().name + "を観測する");
  for (const button of $("deck").querySelectorAll("button[data-room]")) {
    button.setAttribute("aria-pressed", String(button.dataset.room === room));
  }
  drawDeck();
  drawResidents(arriving);
  roster.replaceChildren();
  for (const id of Object.keys(state.berths)) {
    const location = state.berths[id];
    const button = deckCard(id, location ? rooms[location] : "待機中");
    button.dataset.member = id;
    button.dataset.placed = String(!!location);
    button.setAttribute("aria-label", crewMembers[id].name + (location === room
      ? "をトレーに戻す" : "を" + rooms[room] + "に入れる"));
    wireDrag(button, id, "tray", () => moveCrew(id, location === room ? null : room));
    roster.append(button);
  }
}

function moveCrew(id, destination) {
  if (state.berths[id] === destination) return;
  if (!destination && flightCrew().length === 1) {
    $("deck-status").textContent = "出発できるように、部屋には一人以上残してね。";
    return;
  }
  const focused = document.activeElement.dataset.member === id;
  state.berths[id] = destination;
  renderCrew();
  selectCrew(flightCrew().includes(state.selected) ? state.selected : flightCrew()[0]);
  renderDeck(destination ? id : undefined);
  if (focused) (destination ? residents : roster).querySelector('[data-member="' + id + '"]')
    ?.focus({ preventScroll: true });
  $("deck-status").textContent = crewMembers[id].name + (destination
    ? "が" + rooms[destination] + "に入りました。" : "がトレーに戻りました。");
}

function wireDrag(button, id, origin, activate) {
  let dragged = false;
  button.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    dragged = false;
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (drag?.pointer !== event.pointerId) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
      dragged = true;
      drag.ghost = miniArt(id);
      drag.ghost.className = "deck-ghost";
      document.body.append(drag.ghost);
      button.classList.add("is-dragging");
    }
    drag.ghost.style.left = event.clientX + "px";
    drag.ghost.style.top = event.clientY + "px";
    const target = origin === "tray" ? deckScene : deckTray;
    target.classList.toggle("drop-ready", inside(target, event));
  });
  const finish = (event, drop = false) => {
    if (drag?.pointer !== event.pointerId) return;
    const active = drag;
    drag = undefined;
    active.ghost?.remove();
    button.classList.remove("is-dragging");
    deckScene.classList.remove("drop-ready");
    deckTray.classList.remove("drop-ready");
    if (!drop || !dragged) return;
    if (origin === "tray" && inside(deckScene, event)) moveCrew(id, room);
    if (origin === "scene" && inside(deckTray, event)) moveCrew(id, null);
  };
  button.addEventListener("pointerup", (event) => finish(event, true));
  button.addEventListener("pointercancel", finish);
  button.addEventListener("lostpointercapture", finish);
  button.onclick = (event) => {
    if (!dragged || event.detail === 0) activate();
  };
}

function inside(element, event) {
  const box = element.getBoundingClientRect();
  return event.clientX >= box.left && event.clientX <= box.right &&
    event.clientY >= box.top && event.clientY <= box.bottom;
}

function openDeck() {
  $("deck-status").textContent = "";
  renderDeck();
  show("deck");
  $("deck-title").focus();
}
$("open-deck").onclick = openDeck;
$("cabin-art").onclick = openDeck;
$("leave-deck").onclick = () => {
  show("hangar");
  $("open-deck").focus({ preventScroll: true });
};
$("deck-observe").onclick = () => {
  const planet = observationTarget();
  openObservation(planet, route.indexOf(planet), state.selected, state.pilots[state.selected].total);
};
for (const button of $("deck").querySelectorAll("button[data-room]")) {
  button.onclick = () => {
    room = button.dataset.room;
    $("deck-status").textContent = "";
    renderDeck();
  };
}

$("add-crew").onclick = () => {
  const available = Object.keys(crewMembers).filter((id) => !Object.hasOwn(state.berths, id));
  const list = $("crew-catalog-list");
  list.replaceChildren();
  for (const id of available) {
    const button = deckCard(id, "＋ 迎える");
    button.onclick = () => {
      state.berths[id] = null;
      save();
      renderDeck();
      catalog.close();
      roster.querySelector('[data-member="' + id + '"]').focus({ preventScroll: true });
      $("deck-status").textContent = crewMembers[id].name + "がトレーに加わりました。";
    };
    list.append(button);
  }
  if (!available.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent = "迎えられる乗組員はみんな船内にいます。";
    list.append(message);
  }
  catalog.showModal();
};
