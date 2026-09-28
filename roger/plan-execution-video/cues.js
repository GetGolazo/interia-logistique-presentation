// Partition commune à l'image (main.js) et au son (audio.mjs).
// 96 BPM : 48 temps = 12 mesures = 30,000 s pile.
(function (g) {
  const BPM = 96;
  const B = 60 / BPM;
  const b = (n) => n * B;

  const C = {
    BPM, B, FPS: 60, DUR: 30, b,

    // 01 — La panne : l'immeuble se dessine en axonométrie, l'étage 3 est coupé
    frame: 0.05,
    axo0: b(0.2),
    axo1: b(2.3),
    stamp: b(0.5),
    head1: b(0.9),
    lift: b(2.4),
    leak: b(3.1),
    head1Out: b(3.45),
    head2: b(3.65),
    head2Out: b(5.35),
    zoomOut0: b(5.5),
    zoomOut1: b(6.5),
    drips: [2.9, 3.4, 3.9, 4.4, 4.9, 5.4].map(b),

    // 02 — Les allers-retours : plan de situation
    map0: b(5.8),
    trips: [[6.6, 7.6], [7.85, 8.6], [8.85, 9.9], [10.15, 10.9], [11.15, 12.15]].map(([a, z]) => [b(a), b(z)]),
    msgs: [7.2, 8.2, 8.9, 9.9, 10.9, 11.6].map(b),
    ex: [6.9, 7.2, 7.6, 8.2, 8.6, 8.9, 9.3, 9.9, 10.3, 10.9, 11.2, 11.6, 12.0, 12.3].map(b),
    dim: b(12.6),
    key1: b(12.75),
    key2: b(13.75),
    keyCote: b(14.6),
    keyOut: b(16.55),

    // 03 — Le déclic : on efface, un seul trajet, le dossier s'ouvre
    erase: b(16.7),
    clean0: b(17.1),
    clean1: b(17.8),
    cart: b(17.4),
    tag: b(17.75),
    callout: b(18.9),
    zoomIn0: b(19.35),
    zoomIn1: b(20),

    // 04 — La méthode : une phase = une mesure
    sc4: b(20),
    st: [20, 24, 28, 32, 36].map(b),
    pans: [24, 28, 32, 36].map(b),
    panDur: 0.5,

    // 05 — La promesse, sur tirage bleu
    blue0: b(39.45),
    blue1: b(40.05),
    sc5: b(40),
    prom: [40.1, 41.1, 42.1].map(b),
    nota: b(42.7),

    // 06 — Roger : le cartouche
    sc6: b(44),
    svc: b(44.9),
    zone: b(45.5),
    seal: b(46.2),
    beep: b(46.5),
    beepGap: 0.16,
  };

  g.CUES = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
