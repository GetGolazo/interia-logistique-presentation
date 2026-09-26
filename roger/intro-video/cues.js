// Partition commune à l'image (main.js) et au son (audio.mjs).
// 128 BPM : 32 temps = 8 mesures = 15,000 s pile.
(function (g) {
  const BPM = 128;
  const B = 60 / BPM;
  const b = (n) => n * B;

  const C = {
    BPM, B, FPS: 60, DUR: 15, b,

    // 01 — Le problème
    capIn: 0.05,
    impact: b(1),
    swap2: b(2),
    swap3: b(3),

    // 02 — Le chaos
    chaos: b(4),
    cardPops: [4.0, 4.125, 4.375, 4.5, 4.625, 4.75, 4.875, 5.0, 5.125, 5.375, 5.5, 5.625, 5.75, 5.875].map(b),
    q1: b(4.25),
    q2: b(5.25),
    qOut: b(6.1),
    collapse: b(6.25),
    bubbleIn: b(6.75),
    bubbleChecks: b(7),

    // 03 — La réponse
    drop: b(8),
    dotPop: b(8.6),
    base1: b(9.25),
    zoomPrep: b(11),
    zoomStart: b(11.25),

    // 04 — La méthode
    sc4: b(12),
    st: [b(12), b(15), b(18), b(21)],
    pans: [b(15), b(18), b(21)],
    panDur: 0.42,
    qr0: b(12) + 0.14,
    qr1: b(12) + 0.52,
    scan0: b(12) + 0.55,
    scan1: b(12) + 1.0,
    photos: b(12) + 0.75,
    chip1: b(12) + 0.95,
    gauge: b(15) + 0.2,
    chips2: [0, 1, 2, 3].map((i) => b(15) + 0.25 + i * 0.09),
    flip2: b(15) + 0.9,
    route0: b(18) + 0.15,
    route1: b(18) + 0.95,
    chips3: [b(18) + 0.85, b(18) + 0.95],
    checks: [b(21.75), b(22.25), b(22.75)],
    resolved: b(23),
    folder: b(23.25),

    // 05 — La promesse
    slab: b(23.4),
    sc5: b(24),
    count0: b(24.5),
    count1: b(25.75),
    line2: b(26),
    ring0: b(26.1),
    ringFull: b(26.9),
    ringFly: b(27.15),

    // 06 — Roger
    sc6: b(28),
    base2: b(29),
    mono2: b(29.5),
    beep: b(30),
    beepGap: 0.16,
  };

  g.CUES = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
