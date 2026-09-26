// Partition commune à l'image (main.js) et au son (audio.mjs).
// 96 BPM : 32 temps = 8 mesures = 20,000 s pile.
// Les animations ont des durées fixes (en secondes) : ralentir le tempo allonge les temps de lecture
// sans ramollir les mouvements.
(function (g) {
  const BPM = 96;
  const B = 60 / BPM;
  const b = (n) => n * B;

  const C = {
    BPM, B, FPS: 60, DUR: 20, b,

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
    qOut: b(6.15),
    collapse: b(6.3),
    bubbleIn: b(6.75),
    bubbleChecks: b(7),

    // 03 — La réponse
    drop: b(8),
    dotPop: b(8.6),
    base1: b(9),
    zoomPrep: b(11),
    zoomStart: b(11.25),

    // 04 — La méthode (une étape = 3 temps)
    sc4: b(12),
    st: [b(12), b(15), b(18), b(21)],
    pans: [b(15), b(18), b(21)],
    panDur: 0.5,
    qr0: b(12) + 0.16,
    qr1: b(12) + 0.6,
    scan0: b(12) + 0.62,
    scan1: b(12) + 1.08,
    photos: b(12) + 0.72,
    chip1: b(12) + 0.95,
    gauge: b(15) + 0.25,
    chips2: [0, 1, 2, 3].map((i) => b(15) + 0.3 + i * 0.11),
    flip2: b(15) + 1.1,
    route0: b(18) + 0.2,
    route1: b(18) + 1.15,
    chips3: [b(18) + 0.95, b(18) + 1.07],
    checks: [b(21.6), b(22), b(22.4)],
    resolved: b(22.75),
    folder: b(23),

    // 05 — La promesse
    slab: b(23.4),
    sc5: b(24),
    count0: b(24.4),
    count1: b(25.2),
    line2: b(25.25),
    ring0: b(25.4),
    ringFull: b(26.4),
    ringFly: b(27.1),

    // 06 — Roger
    sc6: b(28),
    base2: b(28.75),
    mono2: b(29.25),
    beep: b(30.5),
    beepGap: 0.16,
  };

  g.CUES = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
