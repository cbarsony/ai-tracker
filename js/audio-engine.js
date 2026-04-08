import { createMachine } from "./state-machine.js";
import { getSample, getAudioBuffer } from "./sample-bank.js";
import { calculatePlaybackRate } from "./note-util.js";

let audioContext = null;
let currentSource = null;
let machine = null;

function stopCurrent() {
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
  }
}

function buildMachine() {
  return createMachine({
    initial: "idle",
    states: {
      idle: {
        on: {
          PLAY: {
            target: "playing",
            action: null // set dynamically before send
          }
        }
      },
      playing: {
        on: {
          STOP: {
            target: "idle",
            action: stopCurrent
          },
          PLAY: {
            target: "playing",
            action: stopCurrent
          }
        }
      }
    }
  });
}

export function init() {
  audioContext = new AudioContext();
  machine = buildMachine();
}

export function playNote(sampleId, noteStr) {
  if (!audioContext || !machine) return;

  const sample = getSample(sampleId);
  if (!sample) return;

  const buffer = getAudioBuffer(sampleId, audioContext);
  if (!buffer) return;

  const rate = calculatePlaybackRate(noteStr, sample.baseNote);

  // Set the PLAY action dynamically to start the new source after stopping
  const state = machine.getState();
  const stateConfig = state === "idle"
    ? machine // for idle, action is just starting
    : machine; // for playing, stopCurrent runs first via transition action

  machine.send("PLAY");

  // After transition, create and start the new source
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = sample.loopStart / sample.sampleRate;
  source.loopEnd = sample.loopEnd / sample.sampleRate;
  source.playbackRate.value = rate;
  source.connect(audioContext.destination);
  source.start();
  currentSource = source;
}

export function stopNote() {
  if (!machine) return;
  machine.send("STOP");
}

export function getState() {
  if (!machine) return "idle";
  return machine.getState();
}
