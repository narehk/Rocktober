/**
 * Rocktober Canvas — Animation System
 * Tween engine with easing functions.
 */

const easings = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: t => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },
};

/**
 * Animate properties on a CanvasNode over time.
 * @param {import('./engine.js').Engine} engine
 * @param {import('./scene.js').CanvasNode} node
 * @param {Record<string, number>} props - target property values
 * @param {number} duration - ms
 * @param {string} [easing='easeOutQuad']
 * @returns {Promise<void>} resolves when animation completes
 */
export function tween(engine, node, props, duration, easing = 'easeOutQuad') {
  const easeFn = easings[easing] || easings.linear;

  // Snapshot starting values
  const starts = {};
  for (const key of Object.keys(props)) {
    starts[key] = node[key] ?? 0;
  }

  let startTime = 0;

  return new Promise((resolve) => {
    const dispose = engine.onFrame((timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeFn(t);

      for (const key of Object.keys(props)) {
        node[key] = starts[key] + (props[key] - starts[key]) * eased;
      }
      node.markDirty();

      if (t >= 1) {
        // Snap to final values
        for (const key of Object.keys(props)) {
          node[key] = props[key];
        }
        dispose();
        resolve();
      }
    });
  });
}

/**
 * Stagger animations across multiple nodes.
 * @param {import('./engine.js').Engine} engine
 * @param {import('./scene.js').CanvasNode[]} nodes
 * @param {Record<string, number>} props
 * @param {number} duration - ms per node
 * @param {number} delay - ms between each node start
 * @param {string} [easing='easeOutQuad']
 * @returns {Promise<void>}
 */
export function stagger(engine, nodes, props, duration, delay, easing = 'easeOutQuad') {
  const promises = nodes.map((node, i) =>
    new Promise((resolve) => {
      setTimeout(() => {
        tween(engine, node, props, duration, easing).then(resolve);
      }, i * delay);
    })
  );
  return Promise.all(promises).then(() => {});
}
