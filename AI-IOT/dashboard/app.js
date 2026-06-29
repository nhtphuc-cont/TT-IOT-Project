import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// ============================
// FIREBASE CONFIG
// ============================
const firebaseConfig = {
    apiKey: "AIzaSyARSOxFGEAAF1VZr13FmUq3WtKngNZ02Ys",
    authDomain: "smart-d6b1d.firebaseapp.com",
    databaseURL: "https://smart-d6b1d-default-rtdb.firebaseio.com",
    projectId: "smart-d6b1d",
    storageBucket: "smart-d6b1d.firebasestorage.app",
    messagingSenderId: "239727884719",
    appId: "1:239727884719:web:3f2ec88c49e0607cd5975a",
    measurementId: "G-XJZZGT6XYX"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================
// CẬP NHẬT ĐỒNG HỒ THỜI GIAN THỰC
// ============================
function updateClock() {
    const clockEl = document.getElementById("realtime-clock");
    if (clockEl) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
        clockEl.textContent = timeString;
    }
}
setInterval(updateClock, 1000);
updateClock();

// ============================
// DOM ELEMENTS
// ============================
const tabBtns = document.querySelectorAll(".tab-btn");
const stationCards = document.querySelectorAll(".station-card");
const alarmAudio = document.getElementById("alarm");
const enableAlarmBtn = document.getElementById("enableAlarmBtn");
const dangerPopup = document.getElementById("danger-popup");
const closePopupBtn = document.getElementById("close-popup");

let isAlarmEnabled = false;
let audioContext = null;
let hasAlertedDanger = false;

let activeStation = "stationA";
const currentSensorData = {
    stationA: { temp: 0, hum: 0, gas: 0 },
    stationB: { temp: 0, hum: 0, gas: 0 },
    stationC: { temp: 0, hum: 0, gas: 0 }
};
const manualFanControl = {
    stationA: null,
    stationB: null,
    stationC: null
};
const lastChartUpdate = { stationA: 0, stationB: 0, stationC: 0 };

const roomNames = {
    "stationA": "Phòng Khách",
    "stationB": "Phòng Ngủ",
    "stationC": "Phòng Bếp"
};

// ============================
// XỬ LÝ CHUYỂN TABS
// ============================
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        stationCards.forEach(c => c.classList.remove("active-card"));

        btn.classList.add("active");
        const targetId = btn.getAttribute("data-target");
        const targetCard = document.getElementById(targetId);
        if (targetCard) targetCard.classList.add("active-card");
        activeStation = targetId.replace("-card", "");
    });
});

// ============================
// ÂM THANH & POPUP CẢNH BÁO
// ============================
if (enableAlarmBtn) {
    enableAlarmBtn.addEventListener("click", () => {
        if (!audioContext) audioContext = new(window.AudioContext || window.webkitAudioContext)();
        isAlarmEnabled = !isAlarmEnabled;
        if (isAlarmEnabled) {
            enableAlarmBtn.innerHTML = "🔕 Tắt âm thanh cảnh báo";
            enableAlarmBtn.style.background = "#dc2626";
        } else {
            enableAlarmBtn.innerHTML = "🔔 Bật âm thanh cảnh báo";
            enableAlarmBtn.style.background = "#2563eb";
            stopDangerAlarm();
        }
    });
}

function startDangerAlarm() {
    if (isAlarmEnabled && alarmAudio) {
        alarmAudio.loop = true;
        alarmAudio.play().catch(e => console.log("Lỗi audio:", e));
    }
}

function stopDangerAlarm() {
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
}

if (closePopupBtn) {
    closePopupBtn.addEventListener("click", () => {
        if (dangerPopup) dangerPopup.style.display = "none";
        stopDangerAlarm();
    });
}

// ============================
// KHỞI TẠO CHART.JS
// ============================
function createStationChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Nhiệt độ (°C)', data: [], borderColor: '#ef4444', tension: 0.2, yAxisID: 'y' },
                { label: 'Độ ẩm (%)', data: [], borderColor: '#3b82f6', tension: 0.2, yAxisID: 'y' },
                { label: 'MQ135', data: [], borderColor: '#10b981', tension: 0.2, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

const chartA = createStationChart("chartA");
const chartB = createStationChart("chartB");
const chartC = createStationChart("chartC");

// ============================================
// HÀM CẬP NHẬT GIAO DIỆN QUẠT
// ============================================
function updateFanUI(stationName, temp) {
    const stationSuffix = stationName.replace("station", "");
    const fanIcon = document.getElementById("fan" + stationSuffix);
    const fanStatus = document.getElementById("fanStatus" + stationSuffix);

    if (!fanIcon || !fanStatus) return;

    const isManual = manualFanControl[stationName];
    let isFanOn = false;
    let text = "";

    if (isManual === true) {
        isFanOn = true;
        text = "BẬT (Thủ công)";
    } else if (isManual === false) {
        isFanOn = false;
        text = "TẮT (Thủ công)";
    } else {
        if (temp > 30) {
            isFanOn = true;
            text = "BẬT (Tự động)";
        } else {
            isFanOn = false;
            text = "TẮT (Tự động)";
        }
    }

    if (isFanOn) {
        fanIcon.src = "./fanon.png";
        fanIcon.classList.add("spinning");
        fanStatus.innerHTML = text;
        fanStatus.className = "fan-status-pill status-on";
    } else {
        fanIcon.src = "./fanoff.png";
        fanIcon.classList.remove("spinning");
        fanStatus.innerHTML = text;
        fanStatus.className = "fan-status-pill status-off";
    }
}

// ============================================
// HÀM TẢI DỮ LIỆU CẢM BIẾN HIỆN TẠI
// ============================================
function loadStationSensor(stationName, tempId, humId, gasId, chart) {
    const tempEl = document.getElementById(tempId);
    const humEl = document.getElementById(humId);
    const gasEl = document.getElementById(gasId);

    onValue(ref(database, stationName), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const temp = Number(data.temperature || 0);
        const hum = Number(data.humidity || 0);
        const gas = Number(data.gas || 0);

        currentSensorData[stationName] = { temp, hum, gas };

        if (tempEl) tempEl.innerHTML = temp.toFixed(1) + " °C";
        if (humEl) humEl.innerHTML = hum.toFixed(1) + " %";
        if (gasEl) gasEl.innerHTML = gas.toFixed(0);

        updateFanUI(stationName, temp);

        const currentTime = Date.now();
        if (chart && (currentTime - lastChartUpdate[stationName] >= 3000)) {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(temp);
            chart.data.datasets[1].data.push(hum);
            chart.data.datasets[2].data.push(gas);

            if (chart.data.labels.length > 10) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
                chart.data.datasets[2].data.shift();
            }
            chart.update();
            lastChartUpdate[stationName] = currentTime;
        }
    });
}

// ============================================
// HÀM TẢI DỮ LIỆU AI DỰ BÁO TƯƠNG LAI
// ============================================
function loadStationAI(stationName, statusId, predTempId, predHumId, predGasId) {
    const statusEl = document.getElementById(statusId);
    const predTempEl = document.getElementById(predTempId);
    const predHumEl = document.getElementById(predHumId);
    const predGasEl = document.getElementById(predGasId);

    onValue(ref(database, "forecast/" + stationName), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const status = data.status || "Đang phân tích...";
        const predTemp = data.pred_temp || 0;
        const predHum = data.pred_hum || 0;
        const predGas = data.pred_gas || 0;

        // Cập nhật thẻ hiển thị trạng thái của AI
        if (statusEl) {
            statusEl.innerHTML = status;
            statusEl.classList.remove("normal", "warning", "danger");

            if (status === "Bình thường") {
                statusEl.classList.add("normal");
                stopDangerAlarm();
            } else if (status.includes("ô nhiễm")) {
                statusEl.classList.add("warning");
                stopDangerAlarm();
            } else if (status.includes("Nguy cơ")) {
                statusEl.classList.add("danger");
                startDangerAlarm();

                if (!hasAlertedDanger && dangerPopup) {
                    dangerPopup.style.display = "flex";
                    const popupText = document.querySelector(".popup-content p");
                    if (popupText) {
                        popupText.innerHTML = `⚠️ AI DỰ BÁO nguy cơ cháy nổ! Nhiệt độ có thể tăng lên ${predTemp}°C, mức Gas ước tính: ${predGas}.`;
                    }
                    hasAlertedDanger = true;
                }
            }
        }

        // Đổ dữ liệu vào các thẻ HTML phần Dự Báo
        if (predTempEl) predTempEl.innerHTML = predTemp.toFixed(1) + " °C";
        if (predHumEl) predHumEl.innerHTML = predHum.toFixed(1) + " %";
        if (predGasEl) predGasEl.innerHTML = predGas.toFixed(0);
    });
}

// Khởi chạy 3 trạm (Cảm biến hiện tại)
loadStationSensor("stationA", "tempA", "humA", "gasA", chartA);
loadStationSensor("stationB", "tempB", "humB", "gasB", chartB);
loadStationSensor("stationC", "tempC", "humC", "gasC", chartC);

// Khởi chạy 3 trạm (AI Dự báo)
loadStationAI("stationA", "statusA", "predTempA", "predHumA", "predGasA");
loadStationAI("stationB", "statusB", "predTempB", "predHumB", "predGasB");
loadStationAI("stationC", "statusC", "predTempC", "predHumC", "predGasC");

// ============================================
// LOGIC XỬ LÝ CHATBOT AI
// ============================================
const chatToggleBtn = document.getElementById("chat-toggle-btn");
const chatWindow = document.getElementById("chat-window");
const chatCloseBtn = document.getElementById("chat-close-btn");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatMessages = document.getElementById("chat-messages");

chatToggleBtn.addEventListener("click", () => chatWindow.classList.remove("hidden"));
chatCloseBtn.addEventListener("click", () => chatWindow.classList.add("hidden"));

function appendChatMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `chat-msg ${sender}-msg`;
    msg.innerHTML = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function processUserCommand() {
    const command = chatInput.value.trim().toLowerCase();
    if (!command) return;

    appendChatMessage(chatInput.value, "user");
    chatInput.value = "";

    const data = currentSensorData[activeStation];
    const stationDisplay = roomNames[activeStation];

    setTimeout(() => {
        if (command.includes("nhiệt độ")) {
            appendChatMessage(`🌡️ Nhiệt độ hiện tại ở <strong>${stationDisplay}</strong> là <strong>${data.temp.toFixed(1)}°C</strong>.`, "bot");
        } else if (command.includes("độ ẩm")) {
            appendChatMessage(`💧 Độ ẩm hiện tại ở <strong>${stationDisplay}</strong> là <strong>${data.hum.toFixed(1)}%</strong>.`, "bot");
        } else if (command.includes("khí gas") || command.includes("gas") || command.includes("mq135")) {
            appendChatMessage(`🌫️ Nồng độ khí gas ở <strong>${stationDisplay}</strong> là <strong>${data.gas.toFixed(0)}</strong>.`, "bot");
        } else if (command.includes("bật quạt")) {
            manualFanControl[activeStation] = true;
            updateFanUI(activeStation, data.temp);
            appendChatMessage(`✅ Đã ép <strong>BẬT</strong> quạt ở <strong>${stationDisplay}</strong>. (Gõ "quạt tự động" để hủy chế độ thủ công)`, "bot");
        } else if (command.includes("tắt quạt")) {
            manualFanControl[activeStation] = false;
            updateFanUI(activeStation, data.temp);
            appendChatMessage(`❌ Đã ép <strong>TẮT</strong> quạt ở <strong>${stationDisplay}</strong>. (Gõ "quạt tự động" để hủy chế độ thủ công)`, "bot");
        } else if (command.includes("quạt tự động") || command.includes("tự động")) {
            manualFanControl[activeStation] = null;
            updateFanUI(activeStation, data.temp);
            appendChatMessage(`🔄 Quạt ở <strong>${stationDisplay}</strong> đã được trả về chế độ <strong>Tự động</strong> theo nhiệt độ.`, "bot");
        } else if (command.includes("bật cảnh báo") || command.includes("bật âm thanh")) {
            if (!isAlarmEnabled) enableAlarmBtn.click();
            appendChatMessage(`🚨 Đã <strong>BẬT</strong> hệ thống âm thanh cảnh báo toàn cục.`, "bot");
        } else if (command.includes("tắt cảnh báo") || command.includes("tắt âm thanh")) {
            if (isAlarmEnabled) enableAlarmBtn.click();
            appendChatMessage(`🔕 Đã <strong>TẮT</strong> hệ thống âm thanh cảnh báo toàn cục.`, "bot");
        } else {
            appendChatMessage(`Xin lỗi, tôi chưa hiểu lệnh. Vui lòng dùng các từ khóa như: <em>nhiệt độ, độ ẩm, khí gas, bật quạt, tắt quạt, bật cảnh báo...</em>`, "bot");
        }
    }, 400);
}

chatSendBtn.addEventListener("click", processUserCommand);
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") processUserCommand();
});