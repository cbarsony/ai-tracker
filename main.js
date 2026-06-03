import { song } from "./song.js";
import { Player } from "./player.js";
import { createMachine } from "./statechart.js";
import { appMachineConfig, EVENTS, ACTIONS } from "./app-machine.js";
import { createGridView, FIELDS } from "./grid-view.js";

const playButton = document.getElementById("play");
const grid = document.getElementById("grid");
const cursor = { channel: 0, position: 0 };
const renderGrid = createGridView(grid, song.instruments.length, cursor);

const player = new Player(
  song,
  (row) => {
    focusRow = row;
    render();
  },
  () => trackerMachine.send({ type: EVENTS.SONG_END }),
);

const trackerMachine = createMachine(appMachineConfig, {
  actions: {
    [ACTIONS.START_PLAYBACK]() {
      player.play(focusRow);
      playButton.textContent = "Stop";
    },
    [ACTIONS.STOP_PLAYBACK]() {
      player.stop();
      playButton.textContent = "Play";
    },
  },
});

let focusRow = 0;

function render() {
  renderGrid(song.pattern, focusRow);
}

render();

const CHANNEL_COUNT = song.instruments.length;
const FIELDS_PER_CHANNEL = FIELDS.length;

function moveCursor(delta) {
  const total = CHANNEL_COUNT * FIELDS_PER_CHANNEL;
  const flat = cursor.channel * FIELDS_PER_CHANNEL + cursor.position;
  const next = (flat + delta + total) % total;
  cursor.channel = Math.floor(next / FIELDS_PER_CHANNEL);
  cursor.position = next % FIELDS_PER_CHANNEL;
}

const keyHandlers = {
  ArrowLeft: () => {
    moveCursor(-1);
    render();
  },
  ArrowRight: () => {
    moveCursor(1);
    render();
  },
  ArrowUp: () => {
    focusRow > 0 && focusRow--;
    render();
  },
  ArrowDown: () => {
    focusRow < song.pattern.length - 1 && focusRow++;
    render();
  },
  Home: () => {
    focusRow > 0 && (focusRow = 0);
    render();
  },
  End: () => {
    focusRow < song.pattern.length - 1 && (focusRow = song.pattern.length - 1);
    render();
  },
  Space: () => trackerMachine.send(EVENTS.TOGGLE_PLAY),
};

document.addEventListener("keydown", (event) => {
  const handler = keyHandlers[event.code];
  if (handler) {
    event.preventDefault();
    handler();
  }
});

grid.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    moveCursor(event.shiftKey ? -FIELDS_PER_CHANNEL : FIELDS_PER_CHANNEL);
    render();
  } else if (event.code === "Escape") {
    playButton.focus();
  }
});

playButton.addEventListener("click", () => {
  trackerMachine.send(EVENTS.TOGGLE_PLAY);
});

// Rainbow "energy" handed between the focusable elements. The feeling of transfer
// comes entirely from timing: the element losing focus drains its ring, and the
// instant that drain finishes, the element gaining focus pulses its ring to life.
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function restartAnimation(el, className) {
  el.classList.remove("receive", "release");
  void el.offsetWidth; // force reflow so the animation restarts every time
  el.classList.add(className);
}

function transferEnergy(source, target) {
  if (source && !reducedMotion) {
    restartAnimation(source, "release");
    // Pulse the target the moment the source's ring has fully drained away.
    source.addEventListener(
      "animationend",
      () => restartAnimation(target, "receive"),
      { once: true },
    );
  } else {
    restartAnimation(target, "receive");
  }
}

const energyElements = [grid, playButton];
const isEnergyElement = (el) => energyElements.includes(el);

for (const el of energyElements) {
  el.addEventListener("focus", (event) => {
    transferEnergy(isEnergyElement(event.relatedTarget) ? event.relatedTarget : null, el);
  });
  el.addEventListener("blur", (event) => {
    // Focus left the energy system entirely: let the ring drain away.
    if (!isEnergyElement(event.relatedTarget)) restartAnimation(el, "release");
  });
}
