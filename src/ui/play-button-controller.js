export class PlayButtonController {
  constructor(button, player) {
    if (!button) {
      throw new Error("Missing play button");
    }

    this.button = button;
    this.player = player;
  }

  bind() {
    this.button.addEventListener("click", async () => {
      await this.player.toggle();
      this.syncLabel();
    });
  }

  syncLabel() {
    this.button.textContent = this.player.isPlaying ? "Stop" : "Play";
  }
}