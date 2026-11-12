// 星のボタンから開く、全画面共通のショートカット。
const drawer = $("navigation-drawer");
const navigationToggle = $("nav-toggle");
const destinations = {
  space: { title: "board" },
  deck: { title: "deck-title" },
  hangar: { title: "cabin-title" },
  "atlas-screen": { title: "atlas-title" },
  "logbook-screen": { title: "log-title" },
};
let drawerCloseTimer;

function updateNavigation() {
  const screen = $("app").dataset.destination;
  for (const button of drawer.querySelectorAll("[data-destination]")) {
    if (button.dataset.destination === screen) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  $("nav-flight").hidden = !flight;
  const start = $("flight-form").querySelector('button[type="submit"]');
  start.textContent = flight ? "操縦席へ戻る ↗" : "スタート ↗";
}

function closeNavigation() {
  if (!drawer.open || drawer.classList.contains("closing")) return;
  if (reduceMotion.matches) {
    drawer.close();
    return;
  }
  drawer.classList.add("closing");
  drawerCloseTimer = setTimeout(() => drawer.close(), 160);
}

function navigateTo(destination) {
  if (launching) return;
  clearTimeout(drawerCloseTimer);
  navigationToggle.setAttribute("aria-expanded", "false");
  drawer.close();
  if (destination === "cockpit") {
    if (flight) openCockpit();
    return;
  }
  if (destination === "deck") {
    openDeck();
    return;
  }
  if (destination === "atlas-screen" || destination === "logbook-screen") {
    renderRecords();
    renderRouteMap();
  }
  show(destination);
  const title = $(destinations[destination].title);
  title.focus({ preventScroll: true });
  if (destination === "atlas-screen" || destination === "logbook-screen") {
    title.scrollIntoView({ block: "start" });
  }
}

navigationToggle.onclick = () => {
  if (launching) return;
  clearTimeout(drawerCloseTimer);
  drawer.classList.remove("closing");
  updateNavigation();
  $("nav-timer").textContent = $("timer").textContent;
  drawer.showModal();
  navigationToggle.setAttribute("aria-expanded", "true");
};
$("nav-close").onclick = closeNavigation;
drawer.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeNavigation();
});
drawer.addEventListener("close", () => {
  if (drawer.open) return;
  clearTimeout(drawerCloseTimer);
  drawer.classList.remove("closing");
  navigationToggle.setAttribute("aria-expanded", "false");
});
drawer.addEventListener("click", (event) => {
  if (event.target !== drawer) return;
  const box = drawer.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom) closeNavigation();
});
for (const button of drawer.querySelectorAll("[data-destination]")) {
  button.onclick = () => navigateTo(button.dataset.destination);
}
$("nav-flight").onclick = () => navigateTo("cockpit");
document.addEventListener("screenchange", () => {
  // 別の画面を見ている間に到着したら、到着報告を前に出す。
  if ($("app").dataset.screen === "report" && drawer.open) drawer.close();
  updateNavigation();
});
updateNavigation();

$("records").addEventListener("toggle", () => {
  if (!$("records").open && $("app").dataset.screen === "hangar") {
    $("app").dataset.destination = "hangar";
    updateNavigation();
  }
});
