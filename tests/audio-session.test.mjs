import assert from "node:assert/strict";
import test from "node:test";
import { AudioEngine } from "../js/audio-engine.js";
import { LoopPlayer } from "../js/loop-player.js";

test("leaving a session stops all playback while the band Stop preserves independent playback", () => {
  const engine = new AudioEngine({}, {});
  const calls = [];
  const ctx = { state: "running" };
  engine.ctx = ctx;
  engine.transport = { stop: () => calls.push("stems") };
  engine.voiceLinks.set("mic", { voice: { stop: () => calls.push("voice") } });
  engine.loops.set("preshow", { stop: () => calls.push("loop"), start: () => calls.push("start loop") });
  engine.devices.set("rec", { type: "recorder", rt: { stopPlayback: () => calls.push("take") } });

  engine.stop();
  assert.deepEqual(calls, ["voice", "stems"]);
  calls.length = 0;
  engine.stopSessionAudio();
  assert.deepEqual(calls, ["voice", "stems", "loop", "take"]);
  assert.equal(engine.wantPlay, false);
  engine.start();
  assert.equal(engine.ctx, ctx);
  assert.equal(engine.wantPlay, true);
  assert.equal(calls.at(-1), "start loop");
});

test("leaving during source loading prevents the stems from starting", async () => {
  const engine = new AudioEngine({}, { SOURCES_BY_ID: { mic: { stem: "vocals" } } });
  let loaded;
  let plays = 0;
  engine.transport = {
    prepare() {},
    load: () => new Promise((resolve) => { loaded = resolve; }),
    play: () => plays++,
    stop() {},
  };
  engine.setStage = () => {};
  engine.rewire = () => {};
  const pending = engine.setSources(["mic"]);
  engine.stopSessionAudio();
  loaded(true);
  await pending;
  assert.equal(plays, 0);

  engine.ctx = { state: "running" };
  engine.start();
  const reentry = engine.setSources(["mic"]);
  assert.equal(plays, 0);
  loaded(true);
  await reentry;
  assert.equal(plays, 1);
});

test("a pending preshow loop stays stopped and re-entry starts exactly one new node", async () => {
  const nodes = [];
  const ctx = {
    createGain: () => ({ gain: {}, connect: (dest) => dest }),
    createBufferSource: () => {
      const node = {
        starts: 0, stops: 0, disconnects: 0,
        connect() {},
        start() { this.starts++; },
        stop() { this.stops++; },
        disconnect() { this.disconnects++; },
      };
      nodes.push(node);
      return node;
    },
  };
  const player = new LoopPlayer(ctx, {});
  let finishLoad;
  let loads = 0;
  player.load = () => {
    loads++;
    return new Promise((resolve) => { finishLoad = resolve; });
  };
  const pending = player.start();
  player.stop();
  finishLoad({ duration: 2 });
  await pending;
  assert.equal(nodes.length, 0);

  await Promise.all([player.start(), player.start()]);
  assert.equal(loads, 1);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].starts, 1);
  player.stop();
  player.stop();
  assert.equal(nodes[0].stops, 1);
  assert.equal(nodes[0].disconnects, 1);
  assert.equal(player.source, null);
  await player.start();
  assert.equal(nodes.length, 2);
  assert.equal(nodes[1].starts, 1);
});
