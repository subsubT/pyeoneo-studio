// Exactly two real public batches, followed by explicit test-teacher bulk approval/output.
process.env.REAL_PUBLIC_AI='1';
await import('./batch-browser.mjs');
