import { createAgentContext } from './agent/agentContext';
import { runIngestion } from './agent/agents/ingestion';

(async () => {
  const c = await createAgentContext('8679c8eb-725e-48b3-930a-f35bbbf3b2c2');
  if (!c) throw new Error('no ctx');
  const n = await runIngestion(c);
  console.log('processed', n);
})().catch(e => {
  console.error(e?.message || e);
});
