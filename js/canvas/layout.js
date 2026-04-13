/**
 * Rocktober Canvas — Layout Engine
 * Computes positions and sizes for nodes using flex and grid modes.
 */

/**
 * Compute layout for a node and its children recursively.
 * Modifies x, y, width, height on child nodes in place.
 *
 * @param {import('./scene.js').CanvasNode} node
 * @param {number} availWidth  - available width from parent
 * @param {number} availHeight - available height from parent
 */
export function computeLayout(node, availWidth, availHeight) {
  // Assign available space if not explicitly sized
  if (!node.width) node.width = availWidth;
  if (!node.height) node.height = availHeight;

  if (node.layout === 'flex') {
    computeFlex(node);
  } else if (node.layout === 'grid') {
    computeGrid(node);
  }
  // 'absolute': children keep their explicit x/y, just recurse
  for (const child of node.children) {
    if (child.layout === 'flex' || child.layout === 'grid') {
      computeLayout(child, child.width, child.height);
    }
  }
}

/**
 * Flex layout — stacks children vertically or horizontally.
 * Supports gap, padding, alignItems, justifyContent, wrap, flexGrow.
 */
function computeFlex(node) {
  const [pt, pr, pb, pl] = node.padding;
  const innerW = node.width - pl - pr;
  const innerH = node.height - pt - pb;
  const isRow = node.direction === 'row';
  const gap = node.gap || 0;

  const visible = node.children.filter(c => c.visible);
  if (visible.length === 0) return;

  if (node.wrap && isRow) {
    computeFlexWrap(node, visible, innerW, innerH, pl, pt, gap);
    return;
  }

  // Main axis = direction, cross axis = perpendicular
  const mainSize = isRow ? innerW : innerH;
  const crossSize = isRow ? innerH : innerW;

  // Measure children's natural main-axis size
  let totalFixed = 0;
  let totalGrow = 0;
  for (const child of visible) {
    const childMain = isRow ? child.width : child.height;
    if (child.flexGrow > 0) {
      totalGrow += child.flexGrow;
    } else {
      totalFixed += childMain;
    }
  }
  const totalGap = gap * (visible.length - 1);
  const freeSpace = Math.max(0, mainSize - totalFixed - totalGap);

  // Assign sizes
  let offset = 0;

  // justifyContent spacing
  let extraBefore = 0;
  let extraBetween = 0;
  if (totalGrow === 0 && node.justifyContent === 'center') {
    extraBefore = freeSpace / 2;
  } else if (totalGrow === 0 && node.justifyContent === 'end') {
    extraBefore = freeSpace;
  } else if (totalGrow === 0 && node.justifyContent === 'space-between' && visible.length > 1) {
    extraBetween = freeSpace / (visible.length - 1);
  }

  offset = extraBefore;

  for (const child of visible) {
    const childMainNatural = isRow ? child.width : child.height;
    let childMain = childMainNatural;

    if (child.flexGrow > 0 && totalGrow > 0) {
      childMain = (child.flexGrow / totalGrow) * freeSpace;
    }

    // Cross-axis alignment
    let crossOffset = 0;
    const childCross = isRow ? child.height : child.width;
    if (node.alignItems === 'center') {
      crossOffset = (crossSize - childCross) / 2;
    } else if (node.alignItems === 'end') {
      crossOffset = crossSize - childCross;
    }

    if (isRow) {
      child.x = pl + offset;
      child.y = pt + crossOffset;
      child.width = childMain;
      if (child.flexGrow > 0) child.height = child.height || crossSize;
    } else {
      child.x = pl + crossOffset;
      child.y = pt + offset;
      child.height = childMain;
      if (child.flexGrow > 0) child.width = child.width || crossSize;
    }

    offset += childMain + gap + extraBetween;

    // Recurse into child
    computeLayout(child, child.width, child.height);
  }
}

/**
 * Flex-wrap for row direction — wraps children into lines.
 */
function computeFlexWrap(node, visible, innerW, innerH, pl, pt, gap) {
  const lines = [];
  let currentLine = [];
  let lineWidth = 0;

  for (const child of visible) {
    const childW = child.width || 100;
    if (currentLine.length > 0 && lineWidth + gap + childW > innerW) {
      lines.push(currentLine);
      currentLine = [child];
      lineWidth = childW;
    } else {
      if (currentLine.length > 0) lineWidth += gap;
      lineWidth += childW;
      currentLine.push(child);
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  let y = pt;
  for (const line of lines) {
    let x = pl;
    let maxH = 0;
    for (const child of line) {
      child.x = x;
      child.y = y;
      x += child.width + gap;
      if (child.height > maxH) maxH = child.height;
      computeLayout(child, child.width, child.height);
    }
    y += maxH + gap;
  }
}

/**
 * Grid layout — positions children in a grid.
 * Uses minCellWidth to compute columns, fills left-to-right, top-to-bottom.
 *
 * Set node.minCellWidth and node.cellHeight for grid behavior.
 */
function computeGrid(node) {
  const [pt, pr, pb, pl] = node.padding;
  const innerW = node.width - pl - pr;
  const gap = node.gap || 0;
  const minCellW = node.minCellWidth || 250;
  const cellH = node.cellHeight || 200;

  const cols = Math.max(1, Math.floor((innerW + gap) / (minCellW + gap)));
  const cellW = (innerW - gap * (cols - 1)) / cols;

  const visible = node.children.filter(c => c.visible);

  for (let i = 0; i < visible.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const child = visible[i];
    child.x = pl + col * (cellW + gap);
    child.y = pt + row * (cellH + gap);
    child.width = cellW;
    child.height = cellH;
    computeLayout(child, cellW, cellH);
  }

  // Update parent height to fit content
  const rows = Math.ceil(visible.length / cols);
  const contentH = pt + rows * (cellH + gap) - gap + pb;
  if (contentH > node.height) node.height = contentH;
}
