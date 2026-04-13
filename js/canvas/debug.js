/**
 * Rocktober Canvas — Debug Overlay
 * Toggle with Ctrl+Shift+D. Shows bounding boxes, hit regions, node IDs.
 */

export class DebugOverlay {
  enabled = false;
  /** @type {import('./engine.js').Engine} */
  engine = null;

  constructor(engine) {
    this.engine = engine;
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        this.toggle();
      }
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    console.log(`[Canvas Debug] ${this.enabled ? 'ON' : 'OFF'}`);
    if (this.enabled) this.dumpSceneGraph();
    this.engine.requestRender();
  }

  /**
   * Draw debug overlay after the scene renders.
   * Call this at the end of the frame.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./scene.js').CanvasNode} root
   */
  drawOverlay(ctx, root) {
    if (!this.enabled || !root) return;
    ctx.save();
    this.#drawNodeBounds(ctx, root, 0);
    ctx.restore();
  }

  #drawNodeBounds(ctx, node, depth) {
    if (!node.visible) return;

    ctx.save();
    ctx.translate(node.x, node.y);

    // Bounding box
    ctx.strokeStyle = this.#colorForDepth(depth);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(0, 0, node.width, node.height);
    ctx.setLineDash([]);

    // Hit region fill (if interactive)
    if (node.onClick || node.onHover) {
      ctx.fillStyle = 'rgba(0, 100, 255, 0.08)';
      ctx.fillRect(0, 0, node.width, node.height);
    }

    // Node ID label
    const label = node.id + (node.role ? ` [${node.role}]` : '');
    ctx.font = '9px monospace';
    ctx.fillStyle = this.#colorForDepth(depth);
    const metrics = ctx.measureText(label);
    // Background for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, -11, metrics.width + 4, 12);
    ctx.fillStyle = this.#colorForDepth(depth);
    ctx.fillText(label, 2, -2);

    // Recurse
    for (const child of node.children) {
      this.#drawNodeBounds(ctx, child, depth + 1);
    }

    ctx.restore();
  }

  #colorForDepth(depth) {
    const colors = [
      '#ff2d95',  // pink
      '#00e5ff',  // cyan
      '#39ff14',  // green
      '#ffe600',  // yellow
      '#b026ff',  // purple
      '#ff6600',  // orange
    ];
    return colors[depth % colors.length];
  }

  /** Dump the scene graph to console as a formatted tree. */
  dumpSceneGraph() {
    if (!this.engine.root) {
      console.log('[Canvas Debug] No root node');
      return;
    }
    console.group('[Canvas Debug] Scene Graph');
    this.#dumpNode(this.engine.root, 0);
    console.groupEnd();
  }

  #dumpNode(node, depth) {
    const indent = '  '.repeat(depth);
    const flags = [
      node.visible ? '' : 'HIDDEN',
      node._hovered ? 'hover' : '',
      node._focused ? 'focus' : '',
      node.onClick ? 'click' : '',
      node.role ? `role=${node.role}` : '',
    ].filter(Boolean).join(' ');

    console.log(
      `${indent}${node.id} (${node.constructor.name}) ` +
      `[${Math.round(node.x)},${Math.round(node.y)} ${Math.round(node.width)}x${Math.round(node.height)}]` +
      (flags ? ` {${flags}}` : '')
    );

    for (const child of node.children) {
      this.#dumpNode(child, depth + 1);
    }
  }
}
