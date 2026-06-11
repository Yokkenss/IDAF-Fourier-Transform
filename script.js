const C = 3e8;
const MAX_SPEED_KMH = 1200;

const state = {
  speedKmh: 900,
  frequencyGhz: 10,
  noise: 0.15,
  showSpectrum: true,
  time: 0
};

const els = {
  speedInput: document.getElementById("speedInput"),
  frequencyInput: document.getElementById("frequencyInput"),
  noiseInput: document.getElementById("noiseInput"),
  spectrumToggle: document.getElementById("spectrumToggle"),
  speedLabel: document.getElementById("speedLabel"),
  frequencyLabel: document.getElementById("frequencyLabel"),
  noiseLabel: document.getElementById("noiseLabel"),
  f0Value: document.getElementById("f0Value"),
  lambdaValue: document.getElementById("lambdaValue"),
  speedValue: document.getElementById("speedValue"),
  speedKmhValue: document.getElementById("speedKmhValue"),
  dopplerValue: document.getElementById("dopplerValue"),
  dopplerKhzValue: document.getElementById("dopplerKhzValue"),
  directionValue: document.getElementById("directionValue"),
  directionBadge: document.getElementById("directionBadge"),
  substitutionValue: document.getElementById("substitutionValue"),
  radarCanvas: document.getElementById("radarCanvas"),
  timeCanvas: document.getElementById("timeCanvas"),
  spectrumCanvas: document.getElementById("spectrumCanvas"),
  spectrumMessage: document.getElementById("spectrumMessage")
};

const sceneAssets = {
  radar: createSceneImage("img/124550.png"),
  plane: createSceneImage("img/plane.png")
};

function createSceneImage(src) {
  const image = new Image();
  image.src = src;
  image.addEventListener("load", drawRadarScene);
  return image;
}

function isImageReady(image) {
  return image.complete && image.naturalWidth > 0;
}

function getValues() {
  const frequencyHz = state.frequencyGhz * 1e9;
  const wavelength = C / frequencyHz;
  const speedMps = state.speedKmh / 3.6;
  const dopplerHz = (2 * speedMps) / wavelength;

  return {
    frequencyHz,
    wavelength,
    speedMps,
    dopplerHz,
    direction: getDirection(state.speedKmh)
  };
}

function getDirection(speedKmh) {
  if (speedKmh > 0) return "Annäherung";
  if (speedKmh < 0) return "Entfernung";
  return "Keine radiale Bewegung";
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * scale);
  const height = Math.round(rect.height * scale);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function updateFromControls() {
  state.speedKmh = Number(els.speedInput.value);
  state.frequencyGhz = Number(els.frequencyInput.value);
  state.noise = Number(els.noiseInput.value);
  state.showSpectrum = els.spectrumToggle.checked;

  updateRangeProgress(els.speedInput);
  updateRangeProgress(els.noiseInput);
  updateLabels();
  drawStaticGraphs();
}

function updateRangeProgress(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const progress = ((value - min) / (max - min)) * 100;

  input.style.setProperty("--range-progress", `${progress}%`);
}

function updateLabels() {
  const values = getValues();

  els.speedLabel.textContent = formatNumber(state.speedKmh);
  els.frequencyLabel.textContent = formatNumber(state.frequencyGhz);
  els.noiseLabel.textContent = state.noise.toFixed(2);
  els.f0Value.textContent = `${formatNumber(state.frequencyGhz)} GHz`;
  els.lambdaValue.textContent = `${values.wavelength.toFixed(4)} m`;
  els.speedValue.textContent = `${formatNumber(values.speedMps, 1)} m/s`;
  els.speedKmhValue.textContent = `${formatNumber(state.speedKmh)} km/h`;
  els.dopplerValue.textContent = `${formatSigned(values.dopplerHz, 0)} Hz`;
  els.dopplerKhzValue.textContent = `${formatSigned(values.dopplerHz / 1000, 2)} kHz`;
  els.directionValue.textContent = values.direction;
  els.directionBadge.textContent = values.direction;
  els.substitutionValue.textContent =
    `v = (${formatSigned(values.dopplerHz, 0)} Hz · ${values.wavelength.toFixed(4)} m) / 2 ≈ ${formatSigned(values.speedMps, 1)} m/s ≈ ${formatSigned(state.speedKmh, 0)} km/h`;

  els.spectrumCanvas.classList.toggle("hidden", !state.showSpectrum);
  els.spectrumMessage.classList.toggle("hidden", state.showSpectrum);
}

function formatSigned(value, digits) {
  const rounded = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${rounded}`;
  if (value < 0) return `-${rounded}`;
  return formatNumber(0, digits);
}

function drawRadarScene() {
  const { ctx, width, height } = resizeCanvas(els.radarCanvas);
  const radarX = width * 0.14;
  const radarY = height * 0.78;
  const jetBaseX = width * 0.82;
  const jetOffset = Math.sin(state.time * 0.75) * 5 * Math.sign(state.speedKmh || 1);
  const jetX = jetBaseX - jetOffset;
  const jetY = height * 0.12;
  const radarOrigin = { x: radarX + 78, y: radarY - 132 };
  const jetReflection = { x: jetX - 92, y: jetY + 8 };
  const reflectedWavelength = getReflectedWavelengthPx();

  ctx.clearRect(0, 0, width, height);
  drawSceneGrid(ctx, width, height);

  drawTravelingWave(ctx, radarOrigin.x, radarOrigin.y, jetReflection.x, jetReflection.y, {
    amplitude: 9,
    wavelength: 52,
    phase: state.time * 98,
    color: "#1f8fb8",
    alpha: 0.92
  });

  drawTravelingWave(ctx, jetReflection.x, jetReflection.y + 22, radarOrigin.x, radarOrigin.y + 22, {
    amplitude: 8,
    wavelength: reflectedWavelength,
    phase: state.time * 92,
    color: "#3c596d",
    alpha: 0.76
  });

  drawRadarStation(ctx, radarX, radarY);
  drawJet(ctx, jetX, jetY, state.speedKmh >= 0);
}

function drawSceneGrid(ctx, width, height) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}

function drawRadarStation(ctx, x, y) {
  if (isImageReady(sceneAssets.radar)) {
    const size = 142;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sceneAssets.radar, x - size / 2, y - size + 32, size, size);
    ctx.restore();
  } else {
    ctx.strokeStyle = "#182b3a";
    ctx.fillStyle = "rgba(31, 143, 184, 0.08)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 28, y + 12, 80, 20);
    ctx.fillRect(x - 28, y + 12, 80, 20);
    ctx.strokeRect(x + 4, y - 24, 16, 36);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x + 12, y - 34, 34, Math.PI * 1.22, Math.PI * 1.78);
    ctx.stroke();
  }

  ctx.fillStyle = "#4f6271";
  ctx.font = "800 13px Arial, sans-serif";
  ctx.fillText("Radar", x - 28, y + 56);
}

function drawJet(ctx, x, y, approaching) {
  if (isImageReady(sceneAssets.plane)) {
    const width = 138;
    const height = 138;
    const rotation = approaching ? -Math.PI / 2 : Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(sceneAssets.plane, -width / 2, -height / 2, width, height);
    ctx.restore();
  } else {
    const flip = approaching ? -1 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.strokeStyle = "#182b3a";
    ctx.fillStyle = "rgba(31, 143, 184, 0.10)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(-42, -20);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-66, 0);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-42, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#4f6271";
  ctx.font = "800 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Kampfflugzeug", x, y + 58);
  ctx.textAlign = "left";
}

function drawTravelingWave(ctx, x1, y1, x2, y2, options) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const samples = Math.max(80, Math.round(length / 4));

  ctx.save();
  ctx.globalAlpha = options.alpha;
  ctx.strokeStyle = options.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();

  for (let i = 0; i <= samples; i++) {
    const distance = (length * i) / samples;
    const fadeIn = Math.min(1, distance / 48);
    const fadeOut = Math.min(1, (length - distance) / 48);
    const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const wave = Math.sin(((distance - options.phase) / options.wavelength) * Math.PI * 2);
    const offset = wave * options.amplitude * envelope;
    const x = x1 + ux * distance + nx * offset;
    const y = y1 + uy * distance + ny * offset;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.restore();
}

function getReflectedWavelengthPx() {
  const normalizedSpeed = Math.max(-1, Math.min(1, state.speedKmh / MAX_SPEED_KMH));
  const compression = 1 - normalizedSpeed * 0.28;
  return Math.max(38, Math.min(72, 52 * compression));
}

function drawStaticGraphs() {
  drawTimeSignal();
  drawSpectrum();
}

function drawGraphFrame(ctx, width, height, xLabel, yLabel) {
  const pad = getGraphPadding(width);
  const plot = getPlot(width, height);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(24, 43, 58, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const x = plot.x + (plot.w * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    const y = plot.y + (plot.h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#182b3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(plot.x, plot.y);
  ctx.lineTo(plot.x, plot.y + plot.h);
  ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
  ctx.stroke();

  ctx.fillStyle = "#6d7b86";
  ctx.font = "700 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(xLabel, plot.x + plot.w / 2, height - 12);
  ctx.save();
  ctx.translate(16, plot.y + plot.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.textAlign = "left";

  return { pad, plot };
}

function getGraphPadding(width) {
  return width < 430 ? 42 : 56;
}

function getPlot(width, height) {
  const pad = getGraphPadding(width);
  return {
    x: pad,
    y: 24,
    w: width - pad - 20,
    h: height - 76
  };
}

function drawTimeSignal() {
  const { ctx, width, height } = resizeCanvas(els.timeCanvas);
  const { plot } = drawGraphFrame(ctx, width, height, "Zeit", "Signalamplitude");
  const values = getValues();
  const normalizedDoppler = values.dopplerHz / getMaxDoppler();
  const visualFreq = 7 + normalizedDoppler * 3;
  const points = 260;

  ctx.strokeStyle = "#1f8fb8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const envelope = Math.exp(-Math.pow((t - 0.52) / 0.23, 2));
    const phase = Math.PI * 2 * (visualFreq * t + 0.1 * Math.sin(t * 8));
    const noise = stableNoise(i, Math.round(state.noise * 100)) * state.noise * 0.55;
    const signal = envelope * Math.sin(phase) + noise;
    const x = plot.x + t * plot.w;
    const y = plot.y + plot.h / 2 - signal * plot.h * 0.36;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawSpectrum() {
  const { ctx, width, height } = resizeCanvas(els.spectrumCanvas);
  if (!state.showSpectrum) {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  const { plot } = drawGraphFrame(ctx, width, height, "Frequenz", "Amplitude");
  const values = getValues();
  const normalized = Math.max(-1, Math.min(1, values.dopplerHz / getMaxDoppler()));
  const centerX = plot.x + plot.w / 2;
  const peakX = centerX + normalized * plot.w * 0.42;
  const baseline = plot.y + plot.h;

  ctx.strokeStyle = "#c0ccd4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, plot.y);
  ctx.lineTo(centerX, baseline);
  ctx.stroke();

  ctx.fillStyle = "#6d7b86";
  ctx.font = "700 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("0 Hz", centerX, baseline + 18);

  drawNoisePeaks(ctx, plot, baseline);
  drawSpectrumPeak(ctx, peakX, plot, baseline, values.dopplerHz);
  ctx.textAlign = "left";
}

function drawNoisePeaks(ctx, plot, baseline) {
  ctx.strokeStyle = "#9aaeba";
  ctx.lineWidth = 2;

  for (let i = 0; i < 24; i++) {
    const t = (i + 0.5) / 24;
    const x = plot.x + t * plot.w;
    const random = (stableNoise(i * 17, Math.round(state.noise * 100)) + 1) / 2;
    const height = (10 + random * 68) * state.noise;

    ctx.globalAlpha = 0.25 + state.noise * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, baseline);
    ctx.lineTo(x, baseline - height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSpectrumPeak(ctx, x, plot, baseline, dopplerHz) {
  const peakHeight = plot.h * 0.78;

  ctx.strokeStyle = "#1f8fb8";
  ctx.fillStyle = "#1f8fb8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, baseline);
  ctx.lineTo(x, baseline - peakHeight);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, baseline - peakHeight, 6, 0, Math.PI * 2);
  ctx.fill();

  const labelX = Math.max(plot.x + 88, Math.min(plot.x + plot.w - 88, x));
  const labelY = Math.max(plot.y + 26, baseline - peakHeight - 22);
  ctx.fillStyle = "#182b3a";
  ctx.font = "800 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Doppler-Peak fD", labelX, labelY);
  ctx.font = "700 12px Arial, sans-serif";
  ctx.fillText(`${formatSigned(dopplerHz, 0)} Hz`, labelX, labelY + 18);
}

function stableNoise(index, seed) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function getMaxDoppler() {
  const maxSpeedMps = MAX_SPEED_KMH / 3.6;
  const wavelength = C / (state.frequencyGhz * 1e9);
  return (2 * maxSpeedMps) / wavelength;
}

function animate(timestamp) {
  state.time = timestamp / 1000;
  drawRadarScene();
  requestAnimationFrame(animate);
}

["input", "change"].forEach((eventName) => {
  els.speedInput.addEventListener(eventName, updateFromControls);
  els.noiseInput.addEventListener(eventName, updateFromControls);
  els.frequencyInput.addEventListener(eventName, updateFromControls);
  els.spectrumToggle.addEventListener(eventName, updateFromControls);
});

window.addEventListener("resize", () => {
  drawRadarScene();
  drawStaticGraphs();
});

updateFromControls();
animate();
