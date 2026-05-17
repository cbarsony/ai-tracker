// SampleEditor renders a waveform for the selected instrument and lets the
// user enable looping with draggable start/end markers. Loop state is stored
// on `instrument.loop = { enabled, start, end }` where `start` and `end` are
// in seconds.

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 160;
const MARKER_HIT_PX = 6;
const DEFAULT_PREVIEW_NOTE = 60;
const MIN_PREVIEW_NOTE = 24;
const MAX_PREVIEW_NOTE = 96;

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

function noteLabel(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export class SampleEditor {
  constructor({ container, song, getBuffer, player }) {
    this.container = container;
    this.song = song;
    this.getBuffer = getBuffer;
    this.player = player;

    this.selectedIndex = 0;
    this.previewNote = DEFAULT_PREVIEW_NOTE;
    this.canvas = null;
    this.ctx = null;
    this.select = null;
    this.loopCheckbox = null;
    this.playButton = null;
    this.pitchSelect = null;
    this.dragging = null; // "start" | "end" | null
    this.previewHandle = null;
    this.animationId = null;
  }

  render() {
    this.container.innerHTML = "";
    this.container.classList.add("sample-editor");

    const header = document.createElement("div");
    header.classList.add("sample-editor-header");

    const label = document.createElement("span");
    label.textContent = "Sample: ";

    const select = document.createElement("select");
    this.song.instruments.forEach((instrument, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index.toString(16).toUpperCase().padStart(2, "0")} ${instrument.name}`;
      select.appendChild(option);
    });
    select.value = String(this.selectedIndex);
    select.addEventListener("change", () => {
      this.selectedIndex = Number(select.value);
      this.stopPreview();
      this.syncLoopCheckbox();
      this.draw();
    });
    this.select = select;

    const loopLabel = document.createElement("label");
    loopLabel.classList.add("sample-editor-loop");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => {
      this.setLoopEnabled(checkbox.checked);
    });
    this.loopCheckbox = checkbox;
    loopLabel.append(checkbox, document.createTextNode(" Loop"));

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.classList.add("toolbar-button");
    playButton.textContent = "Play";
    playButton.addEventListener("click", () => this.togglePreview());
    this.playButton = playButton;

    const pitchLabel = document.createElement("span");
    pitchLabel.textContent = "Pitch: ";
    const pitchSelect = document.createElement("select");
    for (let midi = MIN_PREVIEW_NOTE; midi <= MAX_PREVIEW_NOTE; midi += 1) {
      const option = document.createElement("option");
      option.value = String(midi);
      option.textContent = noteLabel(midi);
      pitchSelect.appendChild(option);
    }
    pitchSelect.value = String(this.previewNote);
    pitchSelect.addEventListener("change", () => {
      this.previewNote = Number(pitchSelect.value);
    });
    this.pitchSelect = pitchSelect;

    header.append(label, select, loopLabel, playButton, pitchLabel, pitchSelect);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.classList.add("sample-canvas");
    canvas.addEventListener("mousedown", (event) => this.onMouseDown(event));
    canvas.addEventListener("mousemove", (event) => this.onHoverMove(event));
    window.addEventListener("mousemove", (event) => this.onDragMove(event));
    window.addEventListener("mouseup", () => this.onMouseUp());
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.container.append(header, canvas);

    this.syncLoopCheckbox();
    this.draw();
  }

  // Called by the host once audio buffers become available.
  refresh() {
    this.syncLoopCheckbox();
    this.draw();
  }

  currentInstrument() {
    return this.song.instruments[this.selectedIndex];
  }

  ensureLoop(instrument) {
    if (instrument.loop) return instrument.loop;
    const buffer = this.getBuffer(this.selectedIndex);
    const duration = buffer ? buffer.duration : 0;
    instrument.loop = { enabled: false, start: 0, end: duration };
    return instrument.loop;
  }

  setLoopEnabled(enabled) {
    const instrument = this.currentInstrument();
    const loop = this.ensureLoop(instrument);
    loop.enabled = enabled;
    // If buffer wasn't loaded when defaults were set, fill end now.
    const buffer = this.getBuffer(this.selectedIndex);
    if (buffer && loop.end <= 0) {
      loop.end = buffer.duration;
    }
    this.draw();
  }

  syncLoopCheckbox() {
    if (!this.loopCheckbox) return;
    const loop = this.currentInstrument().loop;
    this.loopCheckbox.checked = !!(loop && loop.enabled);
  }

  draw() {
    if (!this.ctx) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = "rgb(15, 30, 36)";
    ctx.fillRect(0, 0, width, height);

    // Centre line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const buffer = this.getBuffer(this.selectedIndex);
    if (!buffer) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "12px sans-serif";
      ctx.fillText("Press Play once to load sample data.", 12, 20);
      return;
    }

    this.drawWaveform(buffer);
    this.drawLoopOverlay(buffer);
    this.drawPlayhead(buffer);
  }

  drawWaveform(buffer) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const data = buffer.getChannelData(0);
    const mid = height / 2;
    const samplesPerPixel = data.length / width;

    ctx.strokeStyle = "rgb(80, 200, 220)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      const start = Math.floor(x * samplesPerPixel);
      const end = Math.min(data.length, Math.floor((x + 1) * samplesPerPixel));
      let min = 1;
      let max = -1;
      for (let i = start; i < end; i += 1) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min > max) {
        min = 0;
        max = 0;
      }
      ctx.moveTo(x + 0.5, mid + min * mid);
      ctx.lineTo(x + 0.5, mid + max * mid);
    }
    ctx.stroke();
  }

  drawLoopOverlay(buffer) {
    const loop = this.currentInstrument().loop;
    if (!loop || !loop.enabled) return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const startX = this.timeToX(loop.start, buffer);
    const endX = this.timeToX(loop.end, buffer);

    ctx.fillStyle = "rgba(255, 200, 80, 0.12)";
    ctx.fillRect(startX, 0, endX - startX, height);

    ctx.strokeStyle = "rgb(255, 200, 80)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = "rgb(255, 200, 80)";
    ctx.font = "10px sans-serif";
    ctx.fillText("L", startX + 3, 12);
    ctx.fillText("L", endX + 3, 12);
  }

  timeToX(time, buffer) {
    return (time / buffer.duration) * this.canvas.width;
  }

  xToTime(x, buffer) {
    const clamped = Math.max(0, Math.min(this.canvas.width, x));
    return (clamped / this.canvas.width) * buffer.duration;
  }

  pickMarker(x, buffer) {
    const loop = this.currentInstrument().loop;
    if (!loop || !loop.enabled) return null;
    const startX = this.timeToX(loop.start, buffer);
    const endX = this.timeToX(loop.end, buffer);
    const dStart = Math.abs(x - startX);
    const dEnd = Math.abs(x - endX);
    if (dStart > MARKER_HIT_PX && dEnd > MARKER_HIT_PX) {
      // Outside hit range; still allow picking the nearer one so the user
      // can grab a marker quickly anywhere on the canvas.
      return dStart <= dEnd ? "start" : "end";
    }
    return dStart <= dEnd ? "start" : "end";
  }

  onMouseDown(event) {
    const buffer = this.getBuffer(this.selectedIndex);
    if (!buffer) return;
    const loop = this.currentInstrument().loop;
    if (!loop || !loop.enabled) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    this.dragging = this.pickMarker(x, buffer);
    this.applyDrag(event);
  }

  onDragMove(event) {
    if (!this.dragging) return;
    this.applyDrag(event);
  }

  onHoverMove(event) {
    const buffer = this.getBuffer(this.selectedIndex);
    const loop = this.currentInstrument().loop;
    if (!buffer || !loop || !loop.enabled) {
      this.canvas.style.cursor = "default";
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const startX = this.timeToX(loop.start, buffer);
    const endX = this.timeToX(loop.end, buffer);
    const near =
      Math.abs(x - startX) <= MARKER_HIT_PX ||
      Math.abs(x - endX) <= MARKER_HIT_PX;
    this.canvas.style.cursor = near ? "ew-resize" : "default";
  }

  onMouseUp() {
    this.dragging = null;
  }

  togglePreview() {
    if (this.previewHandle) {
      this.stopPreview();
    } else {
      this.startPreview();
    }
  }

  async startPreview() {
    if (!this.player) return;
    try {
      this.previewHandle = await this.player.previewInstrument(
        this.selectedIndex,
        this.previewNote,
      );
    } catch (error) {
      console.error(error);
      return;
    }
    if (!this.previewHandle) return;
    this.syncLoopCheckbox();
    this.draw();
    if (this.playButton) this.playButton.textContent = "Stop";
    this.startAnimation();
  }

  stopPreview() {
    if (this.previewHandle) {
      this.previewHandle.stop();
      this.previewHandle = null;
    }
    if (this.playButton) this.playButton.textContent = "Play";
    this.stopAnimation();
    this.draw();
  }

  startAnimation() {
    if (this.animationId !== null) return;
    const tick = () => {
      this.animationId = null;
      if (!this.previewHandle) return;
      if (this.previewHandle.isStopped()) {
        this.previewHandle = null;
        if (this.playButton) this.playButton.textContent = "Play";
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

  computePlayheadTime(buffer) {
    const handle = this.previewHandle;
    if (!handle || !this.player || !this.player.audioContext) return null;
    const elapsed =
      (this.player.audioContext.currentTime - handle.startTime) *
      handle.playbackRate;
    if (elapsed < 0) return null;

    const loop = this.currentInstrument().loop;
    if (loop && loop.enabled) {
      const loopStart = Math.max(0, loop.start ?? 0);
      const loopEnd = Math.min(buffer.duration, loop.end ?? buffer.duration);
      if (elapsed < loopEnd) return elapsed;
      const loopLength = loopEnd - loopStart;
      if (loopLength <= 0) return loopStart;
      return loopStart + ((elapsed - loopStart) % loopLength);
    }

    if (elapsed >= buffer.duration) return null;
    return elapsed;
  }

  drawPlayhead(buffer) {
    const time = this.computePlayheadTime(buffer);
    if (time === null) return;
    const ctx = this.ctx;
    const { height } = this.canvas;
    const x = this.timeToX(time, buffer);
    ctx.strokeStyle = "rgb(120, 255, 160)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  applyDrag(event) {
    const buffer = this.getBuffer(this.selectedIndex);
    if (!buffer) return;
    const loop = this.currentInstrument().loop;
    if (!loop) return;
    const rect = this.canvas.getBoundingClientRect();
    const time = this.xToTime(event.clientX - rect.left, buffer);
    const minGap = 0.001;
    if (this.dragging === "start") {
      loop.start = Math.max(0, Math.min(time, loop.end - minGap));
    } else if (this.dragging === "end") {
      loop.end = Math.min(buffer.duration, Math.max(time, loop.start + minGap));
    }
    this.draw();
  }
}
