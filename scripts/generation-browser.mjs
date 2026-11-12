// Current mock browser suite; legacy single-level selectors were replaced.
if(process.env.REAL_PUBLIC_AI==='1')throw Error('generation-browser is mock-only');
await import('./batch-browser.mjs');
