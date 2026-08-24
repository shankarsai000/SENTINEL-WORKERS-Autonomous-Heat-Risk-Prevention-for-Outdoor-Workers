import { Router, Request, Response } from 'express';
import { FortyGuardAdapter } from '@sentinel/fortyguard-provider';

export function createFortyGuardRouter(adapter: FortyGuardAdapter): Router {
  const router = Router();

  router.get('/fortyguard/usage', (_req: Request, res: Response) => {
    res.json(adapter.getUsageMetrics());
  });

  return router;
}
