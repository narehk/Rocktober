/**
 * Rocktober Canvas — Accessibility Manager
 * Shadow DOM tree for screen readers, focus management, aria-live announcements.
 */

export class A11yManager {
  /** @type {HTMLDivElement} container for shadow DOM elements */
  container = null;
  /** @type {HTMLDivElement} aria-live region for announcements */
  liveRegion = null;
  /** @type {import('./engine.js').Engine} */
  engine = null;
  /** @type {Map<string, import('./scene.js').CanvasNode>} tracked nodes by id */
  #tracked = new Map();
  /** @type {string[]} stack of focus-trapped container IDs (for modals) */
  #focusTrapStack = [];

  /**
   * @param {import('./engine.js').Engine} engine
   */
  constructor(engine) {
    this.engine = engine;
    this.#createContainer();
  }

  #createContainer() {
    // Main a11y tree — visually hidden but accessible
    this.container = document.createElement('div');
    this.container.id = 'a11y-tree';
    this.container.setAttribute('role', 'application');
    this.container.setAttribute('aria-label', 'Rocktober');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(this.container);

    // Live region for dynamic announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    Object.assign(this.liveRegion.style, {
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Sync the shadow DOM tree with the current scene graph.
   * Call after scene changes (screen switch, data load, etc.).
   * @param {import('./scene.js').CanvasNode} root
   */
  sync(root) {
    const newTracked = new Map();
    this.#walkAndSync(root, this.container, newTracked);

    // Remove shadow elements for nodes no longer in the tree
    for (const [id, node] of this.#tracked) {
      if (!newTracked.has(id)) {
        node.destroyA11y();
      }
    }

    this.#tracked = newTracked;
  }

  #walkAndSync(node, parentEl, newTracked) {
    if (!node.visible) return;

    if (node.role) {
      if (!node._shadowEl) {
        node.createA11y(parentEl);
      } else {
        node.updateA11y();
      }
      newTracked.set(node.id, node);
    }

    for (const child of node.children) {
      this.#walkAndSync(child, node._shadowEl || parentEl, newTracked);
    }
  }

  /**
   * Announce a message to screen readers via aria-live region.
   * @param {string} message
   * @param {'polite'|'assertive'} priority
   */
  announce(message, priority = 'polite') {
    this.liveRegion.setAttribute('aria-live', priority);
    // Clear first to ensure re-announcement of identical messages
    this.liveRegion.textContent = '';
    // Use setTimeout instead of rAF — rAF may not fire in headless/hidden contexts
    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 50);
  }

  /**
   * Trap focus within a canvas node's shadow DOM subtree (for modals).
   * @param {string} nodeId - ID of the modal root node
   */
  trapFocus(nodeId) {
    this.#focusTrapStack.push(nodeId);
    this.#applyFocusTrap();
  }

  /**
   * Release the most recent focus trap.
   */
  releaseFocus() {
    this.#focusTrapStack.pop();
    this.#applyFocusTrap();
  }

  #applyFocusTrap() {
    if (this.#focusTrapStack.length === 0) {
      // No active trap — all elements focusable
      for (const node of this.#tracked.values()) {
        if (node._shadowEl) node._shadowEl.tabIndex = 0;
      }
      return;
    }

    const trapId = this.#focusTrapStack[this.#focusTrapStack.length - 1];
    const trapNode = this.engine.root?.findById(trapId);
    if (!trapNode) return;

    // Collect IDs within the trap subtree
    const trapIds = new Set();
    this.#collectIds(trapNode, trapIds);

    for (const [id, node] of this.#tracked) {
      if (node._shadowEl) {
        node._shadowEl.tabIndex = trapIds.has(id) ? 0 : -1;
      }
    }

    // Focus first focusable element in trap
    const firstInTrap = trapNode._shadowEl || this.#findFirstFocusable(trapNode);
    if (firstInTrap) firstInTrap.focus();
  }

  #collectIds(node, set) {
    set.add(node.id);
    for (const child of node.children) {
      this.#collectIds(child, set);
    }
  }

  #findFirstFocusable(node) {
    if (node._shadowEl) return node._shadowEl;
    for (const child of node.children) {
      const found = this.#findFirstFocusable(child);
      if (found) return found;
    }
    return null;
  }

  /** Clean up all DOM elements. */
  destroy() {
    for (const node of this.#tracked.values()) {
      node.destroyA11y();
    }
    this.#tracked.clear();
    this.container.remove();
    this.liveRegion.remove();
  }
}
