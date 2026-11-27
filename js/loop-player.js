// Plays one looping stereo asset (e.g. preshow music) on its own timeline.
// No DOM; owned by the audio engine.
//
// This is deliberately separate from StemTransport: the band's stems share one
// timeline that nothing may disturb, and playback devices like the preshow
// laptop are independent of it. Like a transport output, `out` is persistent and
// wired at zero gain to the destination (keep-alive), so patching, unpatching
// and muting only change what happens downstream and never touch the player.
// It loops while a session is open, independently of the band transport.

export class LoopPlayer {
  constructor(ctx, { sourceId, url, errors, emit }) {
    this.ctx = ctx;
    this.sourceId = sourceId;
    this.url = url;
    this.errors = errors; // shared Map: url → message
    this.emit = emit;
    // Explicit stereo so left and right survive into a stereo channel strip.
    this.out = ctx.createGain();
    this.out.channelCount = 2;
    this.out.channelCountMode = "explicit";
    this.out.channelInterpretation = "speakers";
    this.keepAlive = ctx.createGain();
    this.keepAlive.gain.value = 0;
    this.out.connect(this.keepAlive).connect(ctx.destination);
    this.started = false;
    this.token = 0;
  }

  async load() {
    try {
      const res = await fetch(this.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (err) {
      this.errors.set(this.url, `${this.url.split("/").pop()}: ${err.message || err}`);
      this.emit({ type: "load-errors", errors: [...this.errors.entries()] });
      return testTone(this.ctx);
    }
  }

  async start() {
    if (this.started) return;
    this.started = true;
    const token = ++this.token;
    this.loading ||= this.load();
    const buffer = await this.loading;
    if (token !== this.token) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.out);
    src.start();
    this.source = src;
    this.duration = buffer.duration;
  }

  stop() {
    this.started = false;
    this.token++;
    if (!this.source) return;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
  }
}

// Development fallback only: different pitches left and right, so a stereo
// path can still be checked if the file fails to load.
function testTone(ctx) {
  const buf = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
  [220, 330].forEach((f, c) => {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = 0.4 * Math.sin((2 * Math.PI * f * i) / ctx.sampleRate);
  });
  return buf;
}
