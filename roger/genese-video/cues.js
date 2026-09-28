// Partition commune à l'image (main.js) et au son (audio.mjs).
// 96 BPM : 48 temps = 12 mesures = 30,000 s pile.
(function (g) {
  const BPM = 96;
  const B = 60 / BPM;
  const b = (n) => n * B;

  const C = {
    BPM, B, FPS: 60, DUR: 30, b,

    // 01 — La panne (une fuite sous l'évier)
    stamp: b(0.25),
    head1: b(1),
    head2: b(2.5),
    headOut: b(3.55),
    zoom0: b(3.7),
    zoom1: b(4.35),
    // la fuite continue dans la pastille « logement » pendant les allers-retours
    drips: [0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75, 4.75, 5.75, 6.75, 7.75, 8.75, 9.75, 10.75, 11.75, 12.75, 13.75, 14.75].map(b),

    // 02 — Les allers-retours
    map: b(4),
    trips: [[4.5, 5.75], [6.1, 7.0], [7.6, 8.9], [9.3, 10.1], [10.4, 11.4]].map(([a, z]) => [b(a), b(z)]),
    bubbles: [5.0, 6.5, 7.25, 8.25, 9.75, 10.5].map(b),
    ex: [4.75, 5.0, 5.5, 6.5, 7.0, 7.25, 7.75, 8.25, 8.75, 9.75, 10.0, 10.5, 11.0, 11.25].map(b),
    dim: b(11.75),
    key1: b(12),
    key2: b(13),
    keyOut: b(15.85),

    // 03 — Le déclic
    rewind: b(16),
    clean0: b(16.35),
    clean1: b(16.95),
    drop: b(17),
    dotPop: b(17.5),
    tag: b(17.4),
    zoomPrep: b(19.25),
    zoomStart: b(19.45),

    // 04 — La méthode (une étape = une mesure)
    sc4: b(20),
    st: [20, 24, 28, 32, 36].map(b),
    pans: [24, 28, 32, 36].map(b),
    panDur: 0.5,

    // 05 — La promesse
    slab: b(39.4),
    sc5: b(40),
    prom: [40, 41, 42].map(b),

    // 06 — Roger
    sc6: b(44),
    svc: b(44.75),
    tagEnd: b(45.25),
    zone: b(45.6),
    beep: b(46.5),
    beepGap: 0.16,
  };

  g.CUES = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
