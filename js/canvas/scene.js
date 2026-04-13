/**
 * Rocktober Canvas — Scene Graph
 * CanvasNode base class with tree ops, drawing, hit testing, and a11y hooks.
 */

let _nextId = 1;

export class CanvasNode {
  id = '';
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  visible = true;
  opacity = 1;
  cursor = 'default';

  /** @type {CanvasNode|null} */
  parent = null;
  /** @type {CanvasNode[]} */
  children = [];
  /** @type {import('./engine.js').Engine|null} */
  _engine = null;

  // a11y
  /** @type {string} role for shadow DOM (e.g. 'button', 'heading', 'region') */
  role = '';
  /** @type {string} accessible label */
  ariaLabel = '';
  /** @type {number|null} heading level (1-6) for role='heading' */
  ariaLevel = null;
  /** @type {HTMLElement|null} shadow DOM element managed by a11y system */
  _shadowEl = null;

  // Event handlers (set by consumers)
  onClick = null;
  onHover = null;
  onHoverEnd = null;

  // Layout hints (used by layout.js)
  layout = 'absolute';        // 'absolute' | 'flex'
  direction = 'column';       // 'row' | 'column'
  gap = 0;
  padding = [0, 0, 0, 0];    // [top, right, bottom, left]
  alignItems = 'start';       // 'start' | 'center' | 'end'
  justifyContent = 'start';   // 'start' | 'center' | 'end' | 'space-between'
  wrap = false;
  flexGrow = 0;
  flexShrink = 0;

  // Internal state
  _dirty = true;
  _hovered = false;
  _focused = false;

  /**
   * @param {Partial<CanvasNode>} props
   */
  constructor(props = {}) {
    this.id = props.id || `node-${_nextId++}`;
    Object.assign(this, props);
  }

  // --- Tree operations ---

  addChild(node) {
    if (node.parent) node.parent.removeChild(node);
    node.parent = this;
    node._engine = this._engine;
    this.children.push(node);
    this.markDirty();
    return node;
  }

  removeChild(node) {
    const idx = this.children.indexOf(node);
    if (idx === -1) return;
    this.children.splice(idx, 1);
    node.parent = null;
    node._engine = null;
    this.markDirty();
  }

  removeAllChildren() {
    for (const child of this.children) {
      child.parent = null;
      child._engine = null;
    }
    this.children = [];
    this.markDirty();
  }

  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  /** Walk ancestors up to root. */
  ancestors() {
    const result = [];
    let node = this.parent;
    while (node) {
      result.push(node);
      node = node.parent;
    }
    return result;
  }

  // --- Dirty tracking ---

  markDirty() {
    this._dirty = true;
    if (this._engine) this._engine.requestRender();
  }

  // --- Drawing ---

  /**
   * Override in subclasses to draw this node.
   * Coordinates are in local space (0,0 = top-left of this node).
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Base class: no-op
  }

  /**
   * Draw this node and all children. Handles transform, opacity, visibility.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawTree(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.opacity < 1) {
      ctx.globalAlpha *= this.opacity;
    }

    this.draw(ctx);

    for (const child of this.children) {
      child.drawTree(ctx);
    }

    ctx.restore();
    this._dirty = false;
  }

  // --- Hit testing ---

  /**
   * Returns the deepest node at (px, py) in parent-local coordinates.
   * Children are checked in reverse order (last = top of z-stack).
   */
  hitTest(px, py) {
    if (!this.visible || this.opacity <= 0) return null;

    // Convert to local coords
    const lx = px - this.x;
    const ly = py - this.y;

    // Check bounds
    if (lx < 0 || ly < 0 || lx > this.width || ly > this.height) return null;

    // Check children in reverse (topmost first)
    for (let i = this.children.length - 1; i >= 0; i--) {
      const hit = this.children[i].hitTest(lx, ly);
      if (hit) return hit;
    }

    // This node is the hit target
    return this;
  }

  /**
   * Get the absolute position of this node on the canvas.
   */
  absolutePosition() {
    let ax = 0, ay = 0;
    let node = this;
    while (node) {
      ax += node.x;
      ay += node.y;
      node = node.parent;
    }
    return { x: ax, y: ay };
  }

  // --- a11y lifecycle hooks (called by a11y.js) ---

  /** Create the shadow DOM element for this node. Override in subclasses for custom elements. */
  createA11y(container) {
    if (!this.role) return null;

    let el;
    if (this.role === 'button') {
      el = document.createElement('button');
    } else if (this.role === 'link') {
      el = document.createElement('a');
    } else if (this.role === 'heading') {
      const level = this.ariaLevel || 2;
      el = document.createElement(`h${Math.min(Math.max(level, 1), 6)}`);
    } else if (this.role === 'textbox') {
      el = document.createElement('input');
      el.type = 'text';
    } else {
      el = document.createElement('div');
      el.setAttribute('role', this.role);
    }

    el.setAttribute('data-canvas-id', this.id);
    if (this.ariaLabel) el.setAttribute('aria-label', this.ariaLabel);
    el.textContent = this.ariaLabel || '';

    // Bridge keyboard activation back to canvas
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.onClick) this.onClick(this);
    });
    el.addEventListener('focus', () => {
      this._focused = true;
      if (this._engine) this._engine.requestRender();
    });
    el.addEventListener('blur', () => {
      this._focused = false;
      if (this._engine) this._engine.requestRender();
    });

    container.appendChild(el);
    this._shadowEl = el;
    return el;
  }

  /** Update shadow DOM element properties. */
  updateA11y() {
    if (!this._shadowEl) return;
    if (this.ariaLabel) {
      this._shadowEl.setAttribute('aria-label', this.ariaLabel);
      this._shadowEl.textContent = this.ariaLabel;
    }
  }

  /** Remove shadow DOM element. */
  destroyA11y() {
    if (this._shadowEl) {
      this._shadowEl.remove();
      this._shadowEl = null;
    }
  }
}

/**
 * A concrete rectangle node — draws a filled/stroked rounded rect.
 */
export class RectNode extends CanvasNode {
  fill = '';
  stroke = '';
  strokeWidth = 1;
  cornerRadius = 0;

  constructor(props = {}) {
    super(props);
    Object.assign(this, props);
  }

  draw(ctx) {
    const r = this.cornerRadius;
    const w = this.width;
    const h = this.height;

    ctx.beginPath();
    if (r > 0) {
      ctx.roundRect(0, 0, w, h, r);
    } else {
      ctx.rect(0, 0, w, h);
    }

    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }

    // Focus ring
    if (this._focused) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-2, -2, w + 4, h + 4);
      ctx.setLineDash([]);
    }
  }
}

/**
 * A text node — draws single or multi-line text.
 * For word-wrapped text, use TextNode with maxWidth set.
 */
export class TextNode extends CanvasNode {
  content = '';
  font = '';
  fontSize = 14;
  color = '#f0f0f5';
  align = 'left';       // 'left' | 'center' | 'right'
  maxWidth = 0;          // 0 = no limit
  lineHeight = 1.4;
  maxLines = 0;          // 0 = unlimited

  // Glow
  glowColor = '';
  glowLayers = null;     // Array of {blur, color}

  // Cached line breaks
  _lines = null;
  _lastContent = '';
  _lastFont = '';
  _lastMaxWidth = 0;

  constructor(props = {}) {
    super(props);
    Object.assign(this, props);
  }

  draw(ctx) {
    const fontStr = `${this.fontSize}px ${this.font}`;
    ctx.font = fontStr;
    ctx.textBaseline = 'top';

    // Word wrap if needed
    const lines = this.#getLines(ctx);
    const lh = this.fontSize * this.lineHeight;

    // Update node height based on content
    this.height = lines.length * lh;

    // Draw each line, with optional glow
    for (let i = 0; i < lines.length; i++) {
      const y = i * lh;
      let x = 0;
      if (this.align === 'center') {
        const w = this.maxWidth || this.width;
        const tw = ctx.measureText(lines[i]).width;
        x = (w - tw) / 2;
      } else if (this.align === 'right') {
        const w = this.maxWidth || this.width;
        const tw = ctx.measureText(lines[i]).width;
        x = w - tw;
      }

      // Glow pass
      if (this.glowLayers) {
        for (const layer of this.glowLayers) {
          ctx.save();
          ctx.shadowColor = layer.color;
          ctx.shadowBlur = layer.blur;
          ctx.fillStyle = layer.color;
          ctx.fillText(lines[i], x, y);
          ctx.restore();
        }
      }

      // Main text pass
      ctx.fillStyle = this.color;
      if (this.glowColor) {
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 7;
      }
      ctx.fillText(lines[i], x, y);
      ctx.shadowBlur = 0;
    }
  }

  #getLines(ctx) {
    const fontStr = `${this.fontSize}px ${this.font}`;
    if (
      this._lines &&
      this._lastContent === this.content &&
      this._lastFont === fontStr &&
      this._lastMaxWidth === this.maxWidth
    ) {
      return this._lines;
    }

    ctx.font = fontStr;
    const maxW = this.maxWidth || Infinity;

    if (maxW === Infinity || !this.content) {
      this._lines = this.content ? [this.content] : [''];
      this._lastContent = this.content;
      this._lastFont = fontStr;
      this._lastMaxWidth = this.maxWidth;
      return this._lines;
    }

    // Word wrap
    const words = this.content.split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    // Truncate
    if (this.maxLines > 0 && lines.length > this.maxLines) {
      lines.length = this.maxLines;
      const last = lines[lines.length - 1];
      // Trim to fit with ellipsis
      let trimmed = last;
      while (ctx.measureText(trimmed + '...').width > maxW && trimmed.length > 0) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lines.length - 1] = trimmed + '...';
    }

    this._lines = lines;
    this._lastContent = this.content;
    this._lastFont = fontStr;
    this._lastMaxWidth = this.maxWidth;
    return lines;
  }
}
