import { createMachine } from "./state-machine.js";
import { getSample, getAudioBuffer } from "./sample-bank.js";
import { calculatePlaybackRate } from "./note-util.js";

const CHANNEL_COUNT = 4;

let audioContext = null;
let masterGain = null;
let channels = null;

function stopSource(channel) {
  if (channel.source) {
    channel.source.stop();
    channel.source.disconnect();
    channel.source = null;
  }
  channel.currentSampleId = null;
  channel.currentNote = null;
}

function buildMachine(channel) {
  return createMachine({
    initial: "idle",
    states: {
      idle: {
        on: {
          PLAY: {
            target: "playing",
            action: null
          }
        }
      },
      playing: {
        on: {
          STOP: {
            target: "idle",
            action: () => stopSource(channel)
          },
          PLAY: {
            target: "playing",
            action: () => stopSource(channel)
          }
        }
      }
    }
  });
}

export function init() {
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);

  channels = [];
  for (let i = 0; i < CHANNEL_COUNT; i++) {
    const ch = {
      id: i,
      gainNode: audioContext.createGain(),
      source: null,
      machine: null,
      currentSampleId: null,
      currentNote: null
    };
    ch.gainNode.connect(masterGain);
    ch.machine = buildMachine(ch);
    channels.push(ch);
  }
}

export function playNote(channelIndex, sampleId, noteStr) {
  if (!audioContext || !channels) return;
  const ch = channels[channelIndex];
  if (!ch) return;

  const sample = getSample(sampleId);
  if (!sample) return;

  const buffer = getAudioBuffer(sampleId, audioContext);
  if (!buffer) return;

  const rate = calculatePlaybackRate(noteStr, sample.baseNote);

  ch.machine.send("PLAY");

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  if (sample.loopEnd > 0) {
    source.loop = true;
    source.loopStart = sample.loopStart / sample.sampleRate;
    source.loopEnd = sample.loopEnd / sample.sampleRate;
  } else {
    source.loop = false;
    source.onended = () => {
      if (ch.source === source) {
        ch.machine.send("STOP");
      }
    };
  }

  source.playbackRate.value = rate;
  source.connect(ch.gainNode);
  source.start();
  ch.source = source;
  ch.currentSampleId = sampleId;
  ch.currentNote = noteStr;
}

export function stopNote(channelIndex) {
  if (!channels) return;
  const ch = channels[channelIndex];
  if (!ch) return;
  ch.machine.send("STOP");
}

export function stopAll() {
  if (!channels) return;
  for (const ch of channels) {
    ch.machine.send("STOP");
  }
}

export function getChannelState(channelIndex) {
  if (!channels) return "idle";
  const ch = channels[channelIndex];
  if (!ch) return "idle";
  return ch.machine.getState();
}

export function getChannelCount() {
  return CHANNEL_COUNT;
}
