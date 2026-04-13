/**
 * Rocktober Canvas — Event System
 * Mouse/touch → hit test → dispatch to scene nodes.
 * Manages hover state, cursor changes, and DOM overlay bridge.
 */

export class EventManager {
  /** @type {import('./engine.js').Engine} */
  engine = null;
  /** @type {import('./scene.js').CanvasNode|null} */
  #hoveredNode = null;
  /** @type {import('./scene.js').CanvasNode|null} */
  #pressedNode = null;

  /**
   * @param {import('./engine.js').Engine} engine
   */
  constructor(engine) {
    this.engine = engine;
    this.#bindEvents();
  }

  #bindEvents() {
    const canvas = this.engine.canvas;

    canvas.addEventListener('mousemove', (e) => this.#onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.#onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.#onMouseUp(e));
    canvas.addEventListener('click', (e) => this.#onClick(e));
    canvas.addEventListener('mouseleave', () => this.#onMouseLeave());
    canvas.addEventListener('wheel', (e) => this.#onWheel(e), { passive: false });

    // Touch
    canvas.addEventListener('touchstart', (e) => this.#onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.#onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.#onTouchEnd(e));
  }

  /**
   * Convert a DOM event to canvas-local CSS-pixel coordinates.
   */
  #coords(e) {
    const rect = this.engine.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  #hitTest(x, y) {
    if (!this.engine.root) return null;
    return this.engine.root.hitTest(x, y);
  }

  // --- Mouse handlers ---

  #onMouseMove(e) {
    const { x, y } = this.#coords(e);
    let node = this.#hitTest(x, y);
    // Bubble up to find nearest ancestor with hover handler or cursor
    let hoverTarget = node;
    while (hoverTarget && !hoverTarget.onHover && hoverTarget.cursor === 'default') {
      hoverTarget = hoverTarget.parent;
    }
    if (hoverTarget) node = hoverTarget;

    // Hover state changes
    if (node !== this.#hoveredNode) {
      if (this.#hoveredNode) {
        this.#hoveredNode._hovered = false;
        if (this.#hoveredNode.onHoverEnd) this.#hoveredNode.onHoverEnd(this.#hoveredNode);
      }
      if (node) {
        node._hovered = true;
        if (node.onHover) node.onHover(node);
      }
      this.#hoveredNode = node;
      this.engine.requestRender();
    }

    // Cursor
    this.engine.canvas.style.cursor = node?.cursor || 'default';
  }

  #onMouseDown(e) {
    const { x, y } = this.#coords(e);
    this.#pressedNode = this.#hitTest(x, y);
  }

  #onMouseUp(_e) {
    this.#pressedNode = null;
  }

  #onClick(e) {
    const { x, y } = this.#coords(e);
    let node = this.#hitTest(x, y);
    // Bubble up to find nearest ancestor with onClick handler
    while (node && !node.onClick) {
      node = node.parent;
    }
    if (node && node.onClick) {
      node.onClick(node);
    }
  }

  #onMouseLeave() {
    if (this.#hoveredNode) {
      this.#hoveredNode._hovered = false;
      if (this.#hoveredNode.onHoverEnd) this.#hoveredNode.onHoverEnd(this.#hoveredNode);
      this.#hoveredNode = null;
      this.engine.canvas.style.cursor = 'default';
      this.engine.requestRender();
    }
  }

  // --- Wheel ---

  #onWheel(e) {
    const { x, y } = this.#coords(e);
    const node = this.#findScrollable(x, y);
    if (node && node.onScroll) {
      e.preventDefault();
      node.onScroll(e.deltaX, e.deltaY);
    }
  }

  /** Walk up from hit node to find the nearest scrollable ancestor. */
  #findScrollable(x, y) {
    let node = this.#hitTest(x, y);
    while (node) {
      if (node.onScroll) return node;
      node = node.parent;
    }
    return null;
  }

  // --- Touch ---

  #lastTouch = null;

  #onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.#lastTouch = { x: touch.clientX, y: touch.clientY };
      const { x, y } = this.#coordsFromTouch(touch);
      this.#pressedNode = this.#hitTest(x, y);
    }
  }

  #onTouchMove(e) {
    if (e.touches.length === 1 && this.#lastTouch) {
      const touch = e.touches[0];
      const { x, y } = this.#coordsFromTouch(touch);
      const node = this.#findScrollable(x, y);
      if (node && node.onScroll) {
        e.preventDefault();
        const dx = this.#lastTouch.x - touch.clientX;
        const dy = this.#lastTouch.y - touch.clientY;
        node.onScroll(dx, dy);
        this.#lastTouch = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  #onTouchEnd(e) {
    if (this.#pressedNode && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const { x, y } = this.#coordsFromTouch(touch);
      const node = this.#hitTest(x, y);
      // Only fire click if touch ended on the same node it started on
      if (node === this.#pressedNode && node.onClick) {
        node.onClick(node);
      }
    }
    this.#pressedNode = null;
    this.#lastTouch = null;
  }

  #coordsFromTouch(touch) {
    const rect = this.engine.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }
}
