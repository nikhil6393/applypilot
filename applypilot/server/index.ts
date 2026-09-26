import { configRouter } from './routes/config.js';
import { resumeRouter } from './routes/resume.js';
import { jobsRouter } from './routes/jobs.js';
import { scoringRouter } from './routes/scoring.js';
import { tailorRouter } from './routes/tailor.js';
import { trackerRouter } from './routes/tracker.js';
import { createApp, bootstrap } from './app.js';
import { config } from './config.js';

await bootstrap();
const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  console.log(`[server] env=${config.nodeEnv}`);
  console.log(
    `[server] NVIDIA=${config.nvidiaApiKey ? 'set' : 'unset'} OpenRouter=${config.openRouterApiKey ? 'set' : 'unset'}`
  );
});

const shutdown = async (sig: string) => {
  console.log(`[server] ${sig} received, shutting down`);
  server.close();
  const { shutdown } = await import('./app.js');
  await shutdown();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
