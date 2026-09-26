import { Router } from 'express';
import { globalManusAgent } from '../agent/ManusAgent';

export const agentRouter = Router();

// Start the autonomous Manus Agent
agentRouter.post('/start', (req, res) => {
  try {
    const { query, targetCount, minFitScore, resume } = req.body;
    globalManusAgent.startGoal({
      id: `goal_${Date.now()}`,
      query: query || 'Senior Developer',
      targetCount: targetCount || 10,
      minFitScore: minFitScore || 75,
      resume,
    });
    res.json({ success: true, message: 'Manus Agent started.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Stop the agent
agentRouter.post('/stop', (req, res) => {
  globalManusAgent.stop();
  res.json({ success: true, message: 'Manus Agent stopped.' });
});

// Get Agent Status
agentRouter.get('/status', (req, res) => {
  res.json(globalManusAgent.getStatus());
});
