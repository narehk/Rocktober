#!/usr/bin/env node
// Claude Code Status Line - Context Usage Monitor
// Reads JSON from stdin, outputs formatted status with color coding

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    const model = data.model?.display_name || 'Claude';
    const ctx = data.context_window || {};
    const usedPct = ctx.used_percentage;
    const windowSize = ctx.context_window_size || 200000;

    // Calculate current context usage from percentage
    const usedTokens = usedPct != null ? Math.round(windowSize * usedPct / 100) : 0;

    // Format tokens with K suffix
    const formatTokens = n => n >= 1000 ? `${Math.round(n/1000)}K` : String(n);

    if (usedPct != null) {
      // Color based on usage: green <50%, yellow 50-75%, red >75%
      const color = usedPct < 50 ? '\x1b[32m' : usedPct < 75 ? '\x1b[33m' : '\x1b[31m';
      const reset = '\x1b[0m';
      console.log(`${model} | ${color}${formatTokens(usedTokens)}/${formatTokens(windowSize)} (${usedPct.toFixed(1)}%)${reset}`);
    } else {
      console.log(`${model} | Context: Ready`);
    }
  } catch {
    console.log('Claude Code');
  }
  process.exit(0);
});

// Timeout after 2 seconds (failsafe)
setTimeout(() => {
  console.log('Claude Code');
  process.exit(0);
}, 2000);
