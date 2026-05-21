export class PlayView {
  constructor(playButton, statusText) {
    this.playButton = playButton;
    this.statusText = statusText;
  }

  disable() {
    this.playButton.disabled = true;
  }

  enable() {
    this.playButton.disabled = false;
  }

  focus() {
    this.playButton.focus();
  }

  renderPlaying() {
    this.playButton.textContent = "Stop";
    this.setStatus("Playing");
  }

  renderStopped(status = "Stopped") {
    this.playButton.textContent = "Play";
    this.setStatus(status);
  }

  setStatus(message) {
    if (this.statusText) {
      this.statusText.textContent = message;
    }
  }
}
