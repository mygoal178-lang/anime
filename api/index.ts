/**
 * Express app entry for all non-dedicated API routes.
 * Dedicated handlers remain under api/anilist/* and api/db/health.ts
 * (Vercel filesystem routes win over rewrites for those paths).
 */
import app from '../server/app.js';

export default app;
