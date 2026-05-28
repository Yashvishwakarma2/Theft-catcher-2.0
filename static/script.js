// Global variables
let videoFeed, detectionCanvas, ctx;
let mediaStream = null;
let isDetecting = false;
let aiModel = null;

// 🔥 NEW CONTROL VARIABLES (for slowing detection)
let lastDetectionTime = 0;
const DETECTION_INTERVAL = 120; // adjust: 100–200 ms
let isProcessing = false;

// 🔥 HISTORY
let appHistory = [];

let detectionStats = {
    total: 0,
    unique: new Set(),
    confidences: [],
    fpsHistory: [],
    objectHistory: {}
};

// DOM elements
const confidenceScore = document.getElementById('confidenceScore');
const resultsList = document.getElementById('resultsList');
const systemStatus = document.getElementById('systemStatus');
const confidenceThreshold = document.getElementById('confidenceThreshold');
const maxObjects = document.getElementById('maxObjects');
const thresholdValue = document.getElementById('thresholdValue');
const maxObjectsValue = document.getElementById('maxObjectsValue');

let currentTargetClasses = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('auth_token') !== 'true') {
        window.location.href = '/login';
        return;
    }
    
    initElements();
    updateControls();
    setupDropdownAndModal();
    
    const mode = document.body.getAttribute('data-mode') || 'person';
    getTargetClasses(mode).then(classes => {
        currentTargetClasses = classes;
    });

    loadAIModel();
});

async function loadAIModel() {
    systemStatus.textContent = 'Loading AI...';
    try {
        aiModel = await cocoSsd.load();
        systemStatus.textContent = 'Ready';
        systemStatus.className = 'status-badge status-ready';
    } catch (e) {
        console.error("Failed to load model", e);
        systemStatus.textContent = 'Model Error';
        systemStatus.style.background = '#ef4444';
    }
}

// Modal logic has been moved to modals.js

function initElements() {
    videoFeed = document.getElementById('videoFeed');
    detectionCanvas = document.getElementById('detectionCanvas');
    ctx = detectionCanvas.getContext('2d');

    detectionCanvas.width = 640;
    detectionCanvas.height = 480;

    videoFeed.width = 640;
    videoFeed.height = 480;
}

function updateControls() {
    confidenceThreshold.addEventListener('input', (e) => {
        thresholdValue.textContent = parseFloat(e.target.value).toFixed(1);
    });

    maxObjects.addEventListener('input', (e) => {
        maxObjectsValue.textContent = e.target.value;
    });
}

// 🎥 START CAMERA
async function startCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { exact: 640 }, height: { exact: 480 } }
        });

        videoFeed.srcObject = mediaStream;
        systemStatus.textContent = 'Detecting';
        systemStatus.className = 'status-badge status-detecting';
        isDetecting = true;

        startDetectionLoop();

    } catch (err) {
        console.error("Camera access denied", err);
        alert('Camera access is required for detection. Please allow camera access and try again.');
        systemStatus.textContent = 'Camera Denied';
        systemStatus.className = 'status-badge';
        systemStatus.style.background = '#ef4444';
    }
}

// 🛑 STOP CAMERA
function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    videoFeed.srcObject = null;
    ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

    isDetecting = false;
    systemStatus.textContent = 'Ready';
    systemStatus.className = 'status-badge status-ready';
}

// 📸 CAPTURE FRAME
function captureFrame() {
    const canvas = document.createElement('canvas');
    const ctxCap = canvas.getContext('2d');

    canvas.width = 640;
    canvas.height = 480;

    ctxCap.drawImage(videoFeed, 0, 0, 640, 480);

    const link = document.createElement('a');
    link.download = `frame-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// 🔁 DETECTION LOOP
function startDetectionLoop() {
    function detect(timestamp) {

        if (!isDetecting || !videoFeed.videoWidth || !aiModel) {
            requestAnimationFrame(detect);
            return;
        }

        // ⏱️ CONTROL SPEED
        if (timestamp - lastDetectionTime < DETECTION_INTERVAL || isProcessing) {
            requestAnimationFrame(detect);
            return;
        }

        lastDetectionTime = timestamp;
        isProcessing = true;

        // Run Real Inference
        aiModel.detect(videoFeed).then(predictions => {
            let targetClasses = currentTargetClasses;

            // Map predictions to our internal format
            let detections = predictions.map(p => ({
                class: p.class,
                confidence: p.score,
                bbox: {
                    x: p.bbox[0] / videoFeed.videoWidth,
                    y: p.bbox[1] / videoFeed.videoHeight,
                    width: p.bbox[2] / videoFeed.videoWidth,
                    height: p.bbox[3] / videoFeed.videoHeight
                }
            }));

            // Filter by target classes
            detections = detections.filter(d => targetClasses.includes(d.class));

            // Filter by user's confidence threshold slider
            const threshold = parseFloat(document.getElementById('confidenceThreshold').value);
            detections = detections.filter(d => d.confidence >= threshold);

            drawDetections(detections);
            updateResults(detections);
            updateStats(detections);

            isProcessing = false;
        }).catch(err => {
            console.error(err);
            isProcessing = false;
        });

        requestAnimationFrame(detect);
    }

    requestAnimationFrame(detect);
}

// 🎯 DRAW BOXES
function drawDetections(detections) {
    ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

    const maxConf = Math.max(...detections.map(d => d.confidence), 0);
    if (maxConf > 0) {
        confidenceScore.textContent = (maxConf * 100).toFixed(0) + '%';
    } else {
        confidenceScore.textContent = '0%';
    }

    const mode = document.body.getAttribute('data-mode') || 'person';
    let color = '#00f2fe'; // Default cyan for person
    if (mode === 'object') color = '#10b981'; // Emerald for object
    if (mode === 'weapon') color = '#ef4444'; // Red for weapon

    detections.forEach(d => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        ctx.strokeRect(
            d.bbox.x * detectionCanvas.width,
            d.bbox.y * detectionCanvas.height,
            d.bbox.width * detectionCanvas.width,
            d.bbox.height * detectionCanvas.height
        );

        ctx.fillStyle = color;
        ctx.font = '600 16px Outfit, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        
        ctx.fillText(
            d.class.toUpperCase() + ' ' + (d.confidence * 100).toFixed(0) + '%',
            d.bbox.x * detectionCanvas.width,
            d.bbox.y * detectionCanvas.height - 8
        );
        ctx.shadowBlur = 0;
    });
}

// 📋 RESULTS
function updateResults(detections) {
    if (!detections.length) {
        return; // Don't clear history when there are no objects, just don't add
    }

    // Add to global history
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    
    detections.forEach(d => {
        appHistory.unshift({
            class: d.class,
            confidence: d.confidence,
            timestamp: timeString
        });
    });

    // Keep memory clean, limit to 100
    if (appHistory.length > 100) {
        appHistory = appHistory.slice(0, 100);
    }

    // Show only the last 5 in the panel
    const recentDetections = appHistory.slice(0, 5);

    resultsList.innerHTML = recentDetections.map(d =>
        `<div>
            <span>${d.class} (${(d.confidence * 100).toFixed(0)}%)</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">${d.timestamp}</span>
        </div>`
    ).join('');
}

// 📊 STATS
function updateStats(detections) {
    detectionStats.total += detections.length;

    detections.forEach(d => {
        detectionStats.unique.add(d.class);
        detectionStats.confidences.push(parseFloat(d.confidence));
    });

    document.getElementById('totalDetections').textContent = detectionStats.total;
    
    // Update live count of people in frame
    const currentPersonsEl = document.getElementById('currentPersons');
    if (currentPersonsEl) {
        currentPersonsEl.textContent = detections.length;
    }

    const avg = detectionStats.confidences.reduce((a, b) => a + b, 0) / (detectionStats.confidences.length || 1);
    document.getElementById('avgConfidence').textContent = (avg * 100).toFixed(0) + '%';
}

// 🧹 CLEAR
function clearStats() {
    detectionStats = {
        total: 0,
        unique: new Set(),
        confidences: [],
        fpsHistory: [],
        objectHistory: {}
    };
    appHistory = [];

    document.getElementById('totalDetections').textContent = '0';
    const currentPersonsEl = document.getElementById('currentPersons');
    if (currentPersonsEl) {
        currentPersonsEl.textContent = '0';
    }
    document.getElementById('avgConfidence').textContent = '0%';

    resultsList.innerHTML = `<div class="no-results">Stats cleared.</div>`;
}

// 📤 EXPORT
function exportData() {
    const blob = new Blob([JSON.stringify(detectionStats)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "data.json";
    a.click();
}

// 🚪 LOGOUT
function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'login.html';
}


