const agentUrl = localStorage.getItem("agentUrl") || "http://localhost:8787";
const state = {
  destinations: [],
  selectedPlatform: "youtube"
};

const elements = {
  agentDot: document.querySelector("#agentDot"),
  agentLabel: document.querySelector("#agentLabel"),
  agentRoot: document.querySelector("#agentRoot"),
  refreshButton: document.querySelector("#refreshButton"),
  runningCount: document.querySelector("#runningCount"),
  videoSelect: document.querySelector("#videoSelect"),
  streamForm: document.querySelector("#streamForm"),
  destinationList: document.querySelector("#destinationList"),
  addDestinationButton: document.querySelector("#addDestinationButton"),
  destinationDialog: document.querySelector("#destinationDialog"),
  destinationForm: document.querySelector("#destinationForm"),
  platformButtons: document.querySelector("#platformButtons"),
  serverUrlLabel: document.querySelector("#serverUrlLabel"),
  serverUrlInput: document.querySelector("#serverUrlInput"),
  streamKeyInput: document.querySelector("#streamKeyInput"),
  streamsList: document.querySelector("#streamsList"),
  toast: document.querySelector("#toast")
};

elements.refreshButton.addEventListener("click", refresh);
elements.addDestinationButton.addEventListener("click", () => elements.destinationDialog.showModal());
elements.platformButtons.addEventListener("click", selectPlatform);
elements.destinationForm.addEventListener("submit", addDestination);
elements.streamForm.addEventListener("submit", startStream);

refresh();
setInterval(refreshStreams, 4000);

async function refresh() {
  await Promise.all([checkAgent(), loadVideos(), refreshStreams()]);
}

async function checkAgent() {
  try {
    const health = await api("/api/health");
    elements.agentDot.classList.add("online");
    elements.agentLabel.textContent = "Agent online";
    elements.agentRoot.textContent = health.videoRoot;
  } catch {
    elements.agentDot.classList.remove("online");
    elements.agentLabel.textContent = "Agent offline";
    elements.agentRoot.textContent = agentUrl;
  }
}

async function loadVideos() {
  try {
    const { videos } = await api("/api/videos");
    elements.videoSelect.innerHTML = "";
    if (!videos.length) {
      elements.videoSelect.append(new Option("ยังไม่มีวิดีโอใน VIDEO_ROOT", ""));
      return;
    }
    for (const video of videos) {
      elements.videoSelect.append(new Option(`${video.name} (${formatBytes(video.size)})`, video.relativePath));
    }
  } catch {
    elements.videoSelect.innerHTML = "";
    elements.videoSelect.append(new Option("เปิด local agent ก่อน", ""));
  }
}

async function refreshStreams() {
  try {
    const { streams } = await api("/api/streams");
    elements.runningCount.textContent = streams.filter((stream) => stream.status === "running").length;
    renderStreams(streams);
  } catch {
    elements.runningCount.textContent = "0";
    elements.streamsList.innerHTML = `<p class="empty">ยังเชื่อม local agent ไม่ได้</p>`;
  }
}

function selectPlatform(event) {
  const button = event.target.closest("[data-platform]");
  if (!button) return;

  state.selectedPlatform = button.dataset.platform;
  for (const item of elements.platformButtons.querySelectorAll(".platform")) {
    item.classList.toggle("active", item === button);
  }
  elements.serverUrlLabel.classList.toggle("hidden", state.selectedPlatform !== "rtmp" && state.selectedPlatform !== "tiktok");
}

function addDestination(event) {
  event.preventDefault();
  const streamKey = elements.streamKeyInput.value.trim();
  const serverUrl = elements.serverUrlInput.value.trim();

  if (!streamKey) return;
  if ((state.selectedPlatform === "rtmp" || state.selectedPlatform === "tiktok") && !serverUrl) {
    showToast("ใส่ Server URL ก่อน");
    return;
  }

  state.destinations.push({
    platform: state.selectedPlatform,
    label: platformLabel(state.selectedPlatform),
    streamKey,
    serverUrl
  });

  elements.streamKeyInput.value = "";
  elements.serverUrlInput.value = "";
  elements.destinationDialog.close();
  renderDestinations();
}

function renderDestinations() {
  elements.destinationList.innerHTML = "";
  if (!state.destinations.length) {
    elements.destinationList.innerHTML = `<p class="empty">ยังไม่มี destination</p>`;
    return;
  }

  state.destinations.forEach((destination, index) => {
    const row = document.createElement("div");
    row.className = "destination";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(destination.label)}</strong>
        <code>${maskKey(destination.streamKey)}</code>
      </div>
      <button class="danger" type="button">Remove</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      state.destinations.splice(index, 1);
      renderDestinations();
    });
    elements.destinationList.append(row);
  });
}

async function startStream(event) {
  event.preventDefault();
  if (!state.destinations.length) {
    showToast("เพิ่ม destination ก่อน");
    return;
  }

  const form = new FormData(elements.streamForm);
  const payload = {
    title: form.get("title"),
    file: form.get("file"),
    repeat: form.get("repeat") === "once" ? "once" : "loop",
    destinations: state.destinations
  };

  try {
    await api("/api/streams", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast("เริ่มไลฟ์แล้ว");
    elements.streamForm.reset();
    state.destinations = [];
    renderDestinations();
    await refreshStreams();
  } catch (error) {
    showToast(error.message);
  }
}

function renderStreams(streams) {
  elements.streamsList.innerHTML = "";
  if (!streams.length) {
    elements.streamsList.innerHTML = `<p class="empty">ยังไม่มี stream ที่รันอยู่</p>`;
    return;
  }

  for (const stream of streams) {
    const card = document.createElement("div");
    card.className = "stream-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(stream.title)}</strong>
        <div>${escapeHtml(stream.file)} · ${escapeHtml(stream.status)} · ${stream.destinations.length} destination</div>
      </div>
      <button class="secondary" type="button" ${stream.status !== "running" ? "disabled" : ""}>Stop</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      await api(`/api/streams/${stream.id}/stop`, { method: "POST" });
      await refreshStreams();
    });
    elements.streamsList.append(card);
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${agentUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function platformLabel(platform) {
  return {
    youtube: "YouTube",
    facebook: "Facebook",
    twitch: "Twitch",
    tiktok: "TikTok",
    rtmp: "Custom RTMP"
  }[platform] || platform;
}

function maskKey(key) {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

renderDestinations();
