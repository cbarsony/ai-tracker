const MAX_VOLUME_EFFECT = 0x40;

export class VolumeEffect {
  constructor(text, volumeMultiplier) {
    this.text = text;
    this.volumeMultiplier = volumeMultiplier;
  }

  static parse(effectText, rowIndex, channelIndex) {
    if (effectText === "---") {
      return new VolumeEffect(effectText, 1);
    }

    const volumeMatch = /^v([0-9a-fA-F]{2})$/.exec(effectText);
    if (!volumeMatch) {
      throw new Error(
        `Invalid effect at row ${rowIndex}, channel ${channelIndex}: ${effectText}`,
      );
    }

    return new VolumeEffect(
      effectText,
      VolumeEffect.hexValueToGainMultiplier(
        volumeMatch[1],
        effectText,
        rowIndex,
        channelIndex,
      ),
    );
  }

  static hexValueToGainMultiplier(hexValue, effectText, rowIndex, channelIndex) {
    const volumeValue = Number.parseInt(hexValue, 16);
    if (volumeValue > MAX_VOLUME_EFFECT) {
      throw new Error(
        `Volume effect at row ${rowIndex}, channel ${channelIndex} must be between v00 and v40; received ${effectText}`,
      );
    }

    const perceivedVolume = volumeValue / MAX_VOLUME_EFFECT;
    return perceivedVolume * perceivedVolume;
  }
}