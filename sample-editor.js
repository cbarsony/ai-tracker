import {
  LOOP_TYPES,
  getLoopSettings,
  setLoopEnabled,
  setLoopPoint,
  setLoopType,
} from "./sample-loop.js";

const WAVEFORM_HEIGHT = 180;
const LINE_HIT_RADIUS = 10;
const DEFAULT_PREVIEW_NOTE = 60;
const MIN_PREVIEW_NOTE = 24;
const MAX_PREVIEW_NOTE = 96;

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function noteLabel(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export class SampleEditor {
  constructor({ container, song, player, onInstrumentChange } = {}) {
    this.container = container;
    this.song = song;
    this.player = player;
    this.onInstrumentChange = onInstrumentChange ?? null;

    this.currentInstrument = 0;
    this.previewNote = DEFAULT_PREVIEW_NOTE;
    this.buffer = null;
    this.draggingPoint = null;
    this.previewHandle = null;
    this.animationId = null;

    this.instrumentSelect = null;
    this.loopCheckbox = null;
    this.loopTypeSelect = null;
    this.playButton = null;
    this.pitchSelect = null;
    this.canvas = null;
    this.context = null;
    this.statusEl = null;
  }

  render() {
    this.container.innerHTML = "";
    this.container.classList.add("sample-editor");

    const header = document.createElement("div");
    header.classList.add("sample-editor-header");

    const title = document.createElement("h2");
    title.textContent = "Sample editor";

    const instrumentLabel = document.createElement("label");
    instrumentLabel.textContent = "Sample";
    this.instrumentSelect = document.createElement("select");
    this.song.instruments.forEach((instrument, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index.toString(16).toUpperCase().padStart(2, "0")} ${instrument.name}`;
      this.instrumentSelect.appendChild(option);
    });
    this.instrumentSelect.addEventListener("change", () => {
      this.setInstrument(Number(this.instrumentSelect.value));
      if (this.onInstrumentChange) {
        this.onInstrumentChange(this.currentInstrument);
      }
    });
    instrumentLabel.appendChild(this.instrumentSelect);

    const loopLabel = document.createElement("label");
    loopLabel.classList.add("loop-toggle");
    this.loopCheckbox = document.createElement("input");
    this.loopCheckbox.type = "checkbox";
    this.loopCheckbox.addEventListener("change", () => {
      const instrument = this.getCurrentInstrument();
      const loop = setLoopEnabled(instrument, this.loopCheckbox.checked, this.getDuration());
      this.player.updateInstrumentLoop(this.currentInstrument, loop);
      this.syncControls();
      this.setStatus(this.formatLoopStatus());
      this.draw();
    });
    loopLabel.append(this.loopCheckbox, " Loop sample");

    const loopTypeLabel = document.createElement("label");
    loopTypeLabel.textContent = "Loop type";
    this.loopTypeSelect = document.createElement("select");
    const normalOption = document.createElement("option");
    normalOption.value = LOOP_TYPES.NORMAL;
    normalOption.textContent = "Normal";
    const pingPongOption = document.createElement("option");
    pingPongOption.value = LOOP_TYPES.PING_PONG;
    pingPongOption.textContent = "Ping-pong";
    this.loopTypeSelect.append(normalOption, pingPongOption);
    this.loopTypeSelect.addEventListener("change", () => {
      const instrument = this.getCurrentInstrument();
      const loop = setLoopType(instrument, this.loopTypeSelect.value, this.getDuration());
      this.player.updateInstrumentLoop(this.currentInstrument, loop);
      this.syncControls();
      this.setStatus(this.formatLoopStatus());
      this.draw();
    });
    loopTypeLabel.appendChild(this.loopTypeSelect);

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.classList.add("toolbar-button");
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => this.togglePreview());
    this.playButton = playButton;

    const pitchLabel = document.createElement("label");
    pitchLabel.textContent = "Pitch";
    this.pitchSelect = document.createElement("select");
    for (let midi = MIN_PREVIEW_NOTE; midi <= MAX_PREVIEW_NOTE; midi += 1) {
      const option = document.createElement("option");
      option.value = String(midi);
      option.textContent = noteLabel(midi);
      this.pitchSelect.appendChild(option);
    }
    this.pitchSelect.value = String(this.previewNote);
    this.pitchSelect.addEventListener("change", () => {
      this.previewNote = Number(this.pitchSelect.value);
    });
    pitchLabel.appendChild(this.pitchSelect);

    header.append(title, instrumentLabel, loopLabel, loopTypeLabel, playButton, pitchLabel);

    const waveformWrap = document.createElement("div");
    waveformWrap.classList.add("waveform-wrap");
    this.canvas = document.createElement("canvas");
    this.canvas.height = WAVEFORM_HEIGHT;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute("aria-label", "Waveform loop editor");
    this.context = this.canvas.getContext("2d");
    waveformWrap.appendChild(this.canvas);

    this.statusEl = document.createElement("p");
    this.statusEl.classList.add("sample-editor-status");

    this.container.append(header, waveformWrap, this.statusEl);
    this.addCanvasEvents();
    this.setInstrument(this.currentInstrument);
  }

  setInstrument(index) {
    const max = this.song.instruments.length - 1;
    const nextInstrument = Math.max(0, Math.min(max, index));
    const changed = nextInstrument !== this.currentInstrument;
    if (changed) {
      this.stopPreview();
    }
    this.currentInstrument = nextInstrument;

    if (this.instrumentSelect) {
      this.instrumentSelect.value = String(this.currentInstrument);
    }

    this.loadCurrentBuffer();

    if (!changed) {
      return;
    }
  }

  async loadCurrentBuffer() {
    const requestIndex = this.currentInstrument;
    this.buffer = null;
    this.setStatus("Loading sample...");
    this.draw();

    try {
      const buffer = await this.player.getInstrumentBuffer(requestIndex);
      if (requestIndex !== this.currentInstrument) {
        return;
      }
      this.buffer = buffer;
      this.syncControls();
      this.setStatus(this.formatLoopStatus());
      this.draw();
    } catch (error) {
      console.error(error);
      this.setStatus(error.message);
      this.draw();
    }
  }

  syncControls() {
    if (!this.loopCheckbox) {
      return;
    }
    const loop = getLoopSettings(this.getCurrentInstrument(), this.getDuration());
    this.loopCheckbox.checked = loop.enabled;
    if (this.loopTypeSelect) {
      this.loopTypeSelect.value = loop.type;
      this.loopTypeSelect.disabled = !loop.enabled;
    }
  }

  addCanvasEvents() {
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerup", () => this.stopDragging());
    this.canvas.addEventListener("pointercancel", () => this.stopDragging());
    window.addEventListener("resize", () => this.draw());
  }

  onPointerDown(event) {
    if (!this.isLoopEditable()) {
      return;
    }

    const x = this.pointerX(event);
    const loop = getLoopSettings(this.getCurrentInstrument(), this.getDuration());
    const startX = this.timeToX(loop.start);
    const endX = this.timeToX(loop.end);
    this.draggingPoint = Math.abs(x - startX) <= Math.abs(x - endX) ? "start" : "end";

    if (Math.min(Math.abs(x - startX), Math.abs(x - endX)) > LINE_HIT_RADIUS) {
      this.draggingPoint = x < (startX + endX) / 2 ? "start" : "end";
    }

    this.canvas.setPointerCapture(event.pointerId);
    this.updateDraggedPoint(event);
  }

  onPointerMove(event) {
    if (!this.draggingPoint) {
      return;
    }
    this.updateDraggedPoint(event);
  }

  updateDraggedPoint(event) {
    const instrument = this.getCurrentInstrument();
    const loop = setLoopPoint(
      instrument,
      this.draggingPoint,
      this.xToTime(this.pointerX(event)),
      this.getDuration(),
    );
    this.player.updateInstrumentLoop(this.currentInstrument, loop);
    this.setStatus(this.formatLoopStatus());
    this.draw();
  }

  stopDragging() {
    this.draggingPoint = null;
  }

  draw() {
    if (!this.canvas || !this.context) {
      return;
    }

    const rect = this.canvas.parentElement.getBoundingClientRect();
    const cssWidth = Math.max(320, Math.floor(rect.width));
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${WAVEFORM_HEIGHT}px`;
    this.canvas.width = Math.floor(cssWidth * pixelRatio);
    this.canvas.height = Math.floor(WAVEFORM_HEIGHT * pixelRatio);

    const ctx = this.context;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, WAVEFORM_HEIGHT);
    ctx.fillStyle = "rgb(14, 29, 34)";
    ctx.fillRect(0, 0, cssWidth, WAVEFORM_HEIGHT);

    if (!this.buffer) {
      this.drawCenterLine(cssWidth);
      return;
    }

    this.drawWaveform(cssWidth);
    this.drawCenterLine(cssWidth);

    if (this.isLoopEditable()) {
      const loop = getLoopSettings(this.getCurrentInstrument(), this.getDuration());
      this.drawLoopRegion(loop, cssWidth);
    }
    this.drawPlayhead(cssWidth);
  }

  drawWaveform(width) {
    const channel = this.buffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(channel.length / width));
    const middle = WAVEFORM_HEIGHT / 2;
    const scale = WAVEFORM_HEIGHT * 0.42;
    const ctx = this.context;

    ctx.strokeStyle = "rgb(116, 221, 210)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x += 1) {
      const start = x * samplesPerPixel;
      const end = Math.min(channel.length, start + samplesPerPixel);
      let min = 1;
      let max = -1;
      for (let i = start; i < end; i += 1) {
        const sample = channel[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      ctx.moveTo(x + 0.5, middle + min * scale);
      ctx.lineTo(x + 0.5, middle + max * scale);
    }

    ctx.stroke();
  }

  drawCenterLine(width) {
    const ctx = this.context;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, WAVEFORM_HEIGHT / 2 + 0.5);
    ctx.lineTo(width, WAVEFORM_HEIGHT / 2 + 0.5);
    ctx.stroke();
  }

  drawLoopRegion(loop, width) {
    const ctx = this.context;
    const startX = this.timeToX(loop.start);
    const endX = this.timeToX(loop.end);

    ctx.fillStyle = "rgba(255, 202, 89, 0.16)";
    ctx.fillRect(startX, 0, Math.max(1, endX - startX), WAVEFORM_HEIGHT);
    this.drawLoopLine(startX, "Loop start");
    this.drawLoopLine(Math.min(width - 1, endX), "Loop end");
  }

  drawLoopLine(x, label) {
    const ctx = this.context;
    ctx.strokeStyle = "rgb(255, 211, 100)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WAVEFORM_HEIGHT);
    ctx.stroke();

    ctx.fillStyle = "rgb(255, 211, 100)";
    ctx.font = "12px sans-serif";
    ctx.fillText(label, Math.min(x + 6, this.canvas.clientWidth - 70), 18);
  }

  togglePreview() {
    if (this.previewHandle) {
      this.stopPreview();
    } else {
      this.startPreview();
    }
  }

  async startPreview() {
    try {
      this.previewHandle = await this.player.previewInstrument(
        this.currentInstrument,
        this.previewNote,
      );
    } catch (error) {
      console.error(error);
      this.setStatus(error.message);
      return;
    }

    if (!this.previewHandle) {
      return;
    }

    if (this.playButton) {
      this.playButton.textContent = "Stop";
    }
    this.startAnimation();
  }

  stopPreview() {
    if (this.previewHandle) {
      this.previewHandle.stop();
      this.previewHandle = null;
    }
    if (this.playButton) {
      this.playButton.textContent = "Play";
    }
    this.stopAnimation();
    this.draw();
  }

  startAnimation() {
    if (this.animationId !== null) {
      return;
    }

    const tick = () => {
      this.animationId = null;
      if (!this.previewHandle) {
        return;
      }
      if (this.previewHandle.isStopped()) {
        this.previewHandle = null;
        if (this.playButton) {
          this.playButton.textContent = "Play";
        }
        this.draw();
        return;
      }
      this.draw();
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  stopAnimation() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  drawPlayhead(width) {
    const time = this.computePlayheadTime();
    if (time === null) {
      return;
    }

    const x = (time / this.getDuration()) * width;
    const ctx = this.context;
    ctx.strokeStyle = "rgb(120, 255, 160)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WAVEFORM_HEIGHT);
    ctx.stroke();
  }

  computePlayheadTime() {
    if (!this.previewHandle || !this.player.audioContext || !this.buffer) {
      return null;
    }

    const elapsed =
      (this.player.audioContext.currentTime - this.previewHandle.startTime) *
      this.previewHandle.playbackRate;
    if (elapsed < 0) {
      return null;
    }

    const loop = getLoopSettings(this.getCurrentInstrument(), this.getDuration());
    if (loop.enabled && loop.end > loop.start) {
      if (elapsed < loop.start) {
        return elapsed;
      }
      if (loop.type === LOOP_TYPES.PING_PONG) {
        const loopLength = loop.end - loop.start;
        const cycleLength = loopLength * 2;
        const phase = (elapsed - loop.start) % cycleLength;
        if (phase <= loopLength) {
          return loop.start + phase;
        }
        return loop.end - (phase - loopLength);
      }
      if (elapsed < loop.end) {
        return elapsed;
      }
      const loopLength = loop.end - loop.start;
      return loop.start + ((elapsed - loop.start) % loopLength);
    }

    if (elapsed >= this.getDuration()) {
      return null;
    }
    return elapsed;
  }

  pointerX(event) {
    const rect = this.canvas.getBoundingClientRect();
    return Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  }

  timeToX(time) {
    const duration = this.getDuration();
    if (duration <= 0) {
      return 0;
    }
    return (time / duration) * this.canvas.clientWidth;
  }

  xToTime(x) {
    const duration = this.getDuration();
    if (duration <= 0) {
      return 0;
    }
    return (x / this.canvas.clientWidth) * duration;
  }

  getCurrentInstrument() {
    return this.song.instruments[this.currentInstrument];
  }

  getDuration() {
    return this.buffer?.duration ?? 0;
  }

  isLoopEditable() {
    return this.buffer && getLoopSettings(this.getCurrentInstrument(), this.getDuration()).enabled;
  }

  formatLoopStatus() {
    const duration = this.getDuration();
    const loop = getLoopSettings(this.getCurrentInstrument(), duration);
    if (!loop.enabled) {
      return `${this.getCurrentInstrument().name}: ${duration.toFixed(3)}s`;
    }
    const loopType = loop.type === LOOP_TYPES.PING_PONG ? "ping-pong loop" : "loop";
    return `${this.getCurrentInstrument().name}: ${loopType} ${loop.start.toFixed(3)}s to ${loop.end.toFixed(3)}s`;
  }

  setStatus(message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }
}