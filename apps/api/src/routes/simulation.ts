import { Router, Request, Response } from 'express';
import { SentinelOrchestrator } from '../services/orchestrator.js';

export function createSimulationRouter(orchestrator: SentinelOrchestrator): Router {
  const router = Router();

  router.get('/simulation/state', (_req: Request, res: Response) => {
    res.json(orchestrator.getSimulationState());
  });

  router.post('/simulation/start', (req: Request, res: Response) => {
    const speed = parseFloat(req.body.speed) || 1.0;
    orchestrator.startSimulation(speed);
    res.json({
      status: 'started',
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/pause', (_req: Request, res: Response) => {
    orchestrator.pauseSimulation();
    res.json({
      status: 'paused',
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/resume', (_req: Request, res: Response) => {
    orchestrator.resumeSimulation();
    res.json({
      status: 'resumed',
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/stop', (_req: Request, res: Response) => {
    orchestrator.stopSimulation();
    res.json({
      status: 'stopped',
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/reset', (_req: Request, res: Response) => {
    orchestrator.resetSimulation();
    res.json({
      status: 'reset',
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/step', async (_req: Request, res: Response) => {
    const tickResult = orchestrator.stepSimulation();
    await orchestrator.handleSimulationTick(tickResult);
    res.json({
      status: 'stepped',
      tickResult,
      state: orchestrator.getSimulationState(),
    });
  });

  router.post('/simulation/speed', (req: Request, res: Response) => {
    const speed = parseFloat(req.body.speed) || 1.0;
    orchestrator.setSpeed(speed);
    res.json({
      status: 'speed_updated',
      speed,
      state: orchestrator.getSimulationState(),
    });
  });

  return router;
}
