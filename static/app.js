// AegisHome AI Client Application

let speechOutputEnabled = true;
let isListening = false;
let recognition = null;
let webcamStream = null;
let webcamUploadInterval = null;

// Initialize Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ----------------- Speech Recognition (Voice Input) -----------------
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition not supported in this browser.");
    const micBtn = document.getElementById("btnVoiceInput");
    if (micBtn) {
      micBtn.title = "Speech recognition not supported in this browser";
      micBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isListening = true;
    const micBtn = document.getElementById("btnVoiceInput");
    micBtn.classList.add("listening-glow");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("chatInput").value = transcript;
    sendChatMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };
}

function startListening() {
  if (recognition && !isListening) {
    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition start failed:", e);
    }
  }
}

function stopListening() {
  isListening = false;
  const micBtn = document.getElementById("btnVoiceInput");
  if (micBtn) {
    micBtn.classList.remove("listening-glow");
  }
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
}

// ----------------- Speech Synthesis (Voice Output) -----------------
function speakResponse(text) {
  if (!speechOutputEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // Stop any pending speech
  const cleanText = text.replace(/[*_#`]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ----------------- Chatbot Message Handling -----------------
async function sendChatMessage(message) {
  if (!message || !message.trim()) return;

  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  chatInput.value = "";

  // Append User Bubble
  const userBubble = document.createElement("div");
  userBubble.className = "flex items-start justify-end gap-2.5 ml-auto max-w-[85%]";
  userBubble.innerHTML = `
    <div class="bg-indigo-600 rounded-2xl rounded-tr-sm p-3 text-white shadow-sm">
      <p class="leading-relaxed">${escapeHtml(message)}</p>
    </div>
    <div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
      <i data-lucide="user" class="w-4 h-4 text-slate-300"></i>
    </div>
  `;
  chatMessages.appendChild(userBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  refreshIcons();

  // Loading indicator
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "flex items-start gap-2.5 max-w-[85%] bot-loading";
  loadingBubble.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
      <i data-lucide="bot" class="w-4 h-4 text-white"></i>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm p-3 text-slate-400 italic">
      Processing command...
    </div>
  `;
  chatMessages.appendChild(loadingBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  refreshIcons();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    });
    const data = await response.json();
    loadingBubble.remove();

    // Append AI Response
    let actionsHtml = "";
    if (data.actions && data.actions.length > 0) {
      actionsHtml = `
        <div class="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1">
          ${data.actions.map(act => `<span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px] border border-indigo-500/30 font-medium">✓ ${escapeHtml(act)}</span>`).join('')}
        </div>
      `;
    }

    const aiBubble = document.createElement("div");
    aiBubble.className = "flex items-start gap-2.5 max-w-[85%]";
    aiBubble.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <i data-lucide="bot" class="w-4 h-4 text-white"></i>
      </div>
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm p-3 text-slate-200 shadow-sm leading-relaxed">
        <p>${escapeHtml(data.reply || "Done.")}</p>
        ${actionsHtml}
      </div>
    `;
    chatMessages.appendChild(aiBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    refreshIcons();

    // Voice speak
    speakResponse(data.reply);

    // Update devices UI
    if (data.devices) {
      renderDevices(data.devices);
    } else {
      fetchDevices();
    }

    // If camera action taken, refresh snapshot
    if (message.toLowerCase().includes("camera") || message.toLowerCase().includes("feed")) {
      refreshCameraSnapshot();
    }

  } catch (err) {
    loadingBubble.remove();
    console.error("Chat error:", err);
  }
}

// ----------------- Device Management UI -----------------
async function fetchDevices() {
  try {
    const res = await fetch("/api/devices");
    const data = await res.json();
    renderDevices(data);
  } catch (err) {
    console.error("Failed to fetch devices:", err);
  }
}

function renderDevices(data) {
  // 1. Temperatures
  if (data.temperatures) {
    for (const [key, item] of Object.entries(data.temperatures)) {
      const tempEl = document.getElementById(`temp-${key}`);
      const humEl = document.getElementById(`hum-${key}`);
      if (tempEl) tempEl.innerText = `${item.temp}°C`;
      if (humEl) humEl.innerText = `${item.humidity}% Humidity`;
    }
  }

  // 2. Security status
  if (data.security) {
    const isSec = data.security.is_secure;
    const headerSec = document.getElementById("headerSecurityStatus");
    if (headerSec) {
      headerSec.innerText = isSec ? "Perimeter Armed" : "Perimeter Alert";
      headerSec.className = isSec ? "text-emerald-400 font-medium" : "text-rose-400 font-medium";
    }

    const doorBadge = document.getElementById("doorsLockStatusBadge");
    if (doorBadge) {
      const unlocked = data.security.unlocked_doors.length;
      doorBadge.innerText = unlocked === 0 ? "All Locked" : `${unlocked} Unlocked`;
      doorBadge.className = unlocked === 0 ? "text-emerald-400 font-medium" : "text-rose-400 font-medium";
    }

    const winBadge = document.getElementById("windowsStatusBadge");
    if (winBadge) {
      const opened = data.security.open_windows.length;
      winBadge.innerText = opened === 0 ? "All Closed" : `${opened} Open`;
      winBadge.className = opened === 0 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium";
    }
  }

  // 3. Lights
  if (data.lights) {
    const container = document.getElementById("lightsContainer");
    if (container) {
      container.innerHTML = Object.entries(data.lights).map(([id, item]) => {
        const isOn = item.state === "on";
        return `
          <div class="bg-slate-950/60 border ${isOn ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-slate-800'} rounded-xl p-3 flex flex-col justify-between transition">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i data-lucide="lightbulb" class="w-4 h-4 ${isOn ? 'text-amber-300' : 'text-slate-600'}"></i>
                <span class="text-xs font-semibold text-slate-200">${escapeHtml(item.name)}</span>
              </div>
              <button onclick="toggleDevice('lights', '${id}', {state: '${isOn ? 'off' : 'on'}'})" class="px-2.5 py-1 rounded text-[11px] font-bold ${isOn ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} transition">
                ${isOn ? 'ON' : 'OFF'}
              </button>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] text-slate-500">Dim:</span>
              <input type="range" min="0" max="100" value="${item.brightness}" onchange="toggleDevice('lights', '${id}', {brightness: this.value})" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer">
              <span class="text-[10px] font-mono text-slate-400 w-7 text-right">${item.brightness}%</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 4. Fans
  if (data.fans) {
    const container = document.getElementById("fansContainer");
    if (container) {
      container.innerHTML = Object.entries(data.fans).map(([id, item]) => {
        const isOn = item.state === "on";
        return `
          <div class="bg-slate-950/60 border ${isOn ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-slate-800'} rounded-xl p-3 flex flex-col justify-between transition">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i data-lucide="fan" class="w-4 h-4 ${isOn ? 'text-cyan-400 animate-spin' : 'text-slate-600'}"></i>
                <span class="text-xs font-semibold text-slate-200">${escapeHtml(item.name)}</span>
              </div>
              <button onclick="toggleDevice('fans', '${id}', {state: '${isOn ? 'off' : 'on'}'})" class="px-2.5 py-1 rounded text-[11px] font-bold ${isOn ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} transition">
                ${isOn ? 'RUNNING' : 'STOPPED'}
              </button>
            </div>
            <div class="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/80">
              <span class="text-[10px] text-slate-500">Speed (1-5):</span>
              <div class="flex gap-1">
                ${[1, 2, 3, 4, 5].map(s => `
                  <button onclick="toggleDevice('fans', '${id}', {speed: ${s}, state: 'on'})" class="w-5 h-5 rounded text-[10px] font-mono ${item.speed === s && isOn ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
                    ${s}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 5. Doors
  if (data.doors) {
    const container = document.getElementById("doorsContainer");
    if (container) {
      container.innerHTML = Object.entries(data.doors).map(([id, item]) => {
        const isLocked = item.locked;
        const isOpen = item.open;
        return `
          <div class="bg-slate-950/60 border ${isOpen ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'} rounded-xl p-3 flex flex-col justify-between transition">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i data-lucide="${isLocked ? 'lock' : 'unlock'}" class="w-4 h-4 ${isLocked ? 'text-emerald-400' : 'text-rose-400'}"></i>
                <span class="text-xs font-semibold text-slate-200">${escapeHtml(item.name)}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded font-mono ${isOpen ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}">
                ${isOpen ? 'DOOR AJAR' : 'CLOSED'}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <button onclick="toggleDevice('doors', '${id}', {locked: ${!isLocked}})" class="flex-1 py-1 rounded text-[11px] font-medium border border-slate-700 ${isLocked ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} transition">
                ${isLocked ? 'Unlock' : 'Lock Door'}
              </button>
              <button onclick="toggleDevice('doors', '${id}', {open: ${!isOpen}})" class="flex-1 py-1 rounded text-[11px] font-medium border border-slate-700 ${isOpen ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} transition">
                ${isOpen ? 'Close' : 'Open'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 6. Windows
  if (data.windows) {
    const container = document.getElementById("windowsContainer");
    if (container) {
      container.innerHTML = Object.entries(data.windows).map(([id, item]) => {
        const isOpen = item.open;
        return `
          <div class="bg-slate-950/60 border ${isOpen ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'} rounded-xl p-3 flex items-center justify-between transition">
            <div class="flex items-center gap-2">
              <i data-lucide="app-window" class="w-4 h-4 ${isOpen ? 'text-amber-400' : 'text-slate-500'}"></i>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">${escapeHtml(item.name)}</span>
                <span class="text-[10px] text-slate-500">Status: ${isOpen ? 'Open' : 'Closed'}</span>
              </div>
            </div>
            <button onclick="toggleDevice('windows', '${id}', {open: ${!isOpen}})" class="px-3 py-1.5 rounded-lg text-xs font-medium ${isOpen ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} transition">
              ${isOpen ? 'Close Window' : 'Open Window'}
            </button>
          </div>
        `;
      }).join('');
    }
  }

  refreshIcons();
}

async function toggleDevice(category, id, payload) {
  try {
    const res = await fetch(`/api/devices/${category}/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.all_devices) {
      renderDevices(data.all_devices);
    }
    refreshCameraSnapshot();
  } catch (err) {
    console.error(`Failed to update ${category}/${id}:`, err);
  }
}

// ----------------- Camera Surveillance & Webcam -----------------
function refreshCameraSnapshot() {
  const img = document.getElementById("cameraSnapshot");
  if (img && !webcamStream) {
    img.src = `/api/camera/snapshot?t=${Date.now()}`;
  }
}

async function inspectCameraAI() {
  const reportBox = document.getElementById("cameraAIReport");
  const reportText = document.getElementById("cameraAIReportText");
  reportBox.classList.remove("hidden");
  reportText.innerText = "Analyzing camera surveillance feed with AI Vision...";

  try {
    const res = await fetch("/api/camera/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Verify security, check if doors or windows are open, and describe entryway." })
    });
    const data = await res.json();
    reportText.innerText = data.analysis || "Audit complete: Normal.";
    speakResponse(data.analysis);
  } catch (err) {
    reportText.innerText = "Failed to inspect camera: " + err.message;
  }
}

async function toggleWebcam() {
  const video = document.getElementById("liveVideo");
  const snapshotImg = document.getElementById("cameraSnapshot");
  const btnText = document.getElementById("webcamBtnText");

  if (!webcamStream) {
    // Start Webcam
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } });
      video.srcObject = webcamStream;
      video.classList.remove("hidden");
      snapshotImg.classList.add("hidden");
      btnText.innerText = "Disconnect Webcam";

      // Periodically upload frames to backend for AI inspection
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");

      webcamUploadInterval = setInterval(() => {
        if (!webcamStream) return;
        ctx.drawImage(video, 0, 0, 640, 360);
        canvas.toBlob(blob => {
          if (blob) {
            const formData = new FormData();
            formData.append("file", blob, "webcam_frame.jpg");
            fetch("/api/camera/upload", { method: "POST", body: formData }).catch(() => {});
          }
        }, "image/jpeg", 0.85);
      }, 3000);

    } catch (e) {
      alert("Unable to access camera: " + e.message);
    }
  } else {
    // Stop Webcam
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
    clearInterval(webcamUploadInterval);
    video.classList.add("hidden");
    snapshotImg.classList.remove("hidden");
    btnText.innerText = "Use PC Webcam";
    refreshCameraSnapshot();
  }
}

// ----------------- Helpers & Event Listeners -----------------
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", () => {
  setupSpeechRecognition();
  fetchDevices();
  refreshIcons();

  // Polling devices and camera
  setInterval(fetchDevices, 4000);
  setInterval(refreshCameraSnapshot, 5000);

  // Chat Form Submit
  const chatForm = document.getElementById("chatForm");
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const chatInput = document.getElementById("chatInput");
    sendChatMessage(chatInput.value);
  });

  // Voice Input Mic Button
  const btnVoice = document.getElementById("btnVoiceInput");
  btnVoice.addEventListener("click", () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  // Speech Output Toggle
  const btnSpeechOut = document.getElementById("btnToggleSpeechOutput");
  btnSpeechOut.addEventListener("click", () => {
    speechOutputEnabled = !speechOutputEnabled;
    document.getElementById("speechOutputLabel").innerText = speechOutputEnabled ? "Speech ON" : "Speech OFF";
    document.getElementById("speechOutputIcon").className = speechOutputEnabled ? "w-3.5 h-3.5 text-indigo-400" : "w-3.5 h-3.5 text-slate-500";
    if (!speechOutputEnabled && ('speechSynthesis' in window)) {
      window.speechSynthesis.cancel();
    }
  });

  // Quick Chips
  document.querySelectorAll(".quick-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const text = btn.innerText.replace(/"/g, '');
      sendChatMessage(text);
    });
  });

  // Camera Buttons
  document.getElementById("btnInspectCam").addEventListener("click", inspectCameraAI);
  document.getElementById("btnToggleWebcam").addEventListener("click", toggleWebcam);
  document.getElementById("btnRefreshDevices").addEventListener("click", fetchDevices);

  // Device Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active", "border-indigo-500/40", "bg-indigo-600/20", "text-indigo-300");
        b.classList.add("border-slate-800", "bg-slate-950/60", "text-slate-400");
      });
      btn.classList.add("active", "border-indigo-500/40", "bg-indigo-600/20", "text-indigo-300");
      btn.classList.remove("border-slate-800", "bg-slate-950/60", "text-slate-400");

      const tabId = btn.getAttribute("data-tab");
      document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
      const activePane = document.getElementById(tabId);
      if (activePane) activePane.classList.remove("hidden");
    });
  });

  // Alexa Modal
  const alexaModal = document.getElementById("alexaModal");
  document.getElementById("btnAlexaGuide").addEventListener("click", () => alexaModal.classList.remove("hidden"));
  document.getElementById("btnCloseAlexaModal").addEventListener("click", () => alexaModal.classList.add("hidden"));
  alexaModal.addEventListener("click", (e) => {
    if (e.target === alexaModal) alexaModal.classList.add("hidden");
  });
});
