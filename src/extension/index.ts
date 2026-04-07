import { bootstrap } from './bootstrap.js';
import { registerTestInternals } from './testing.js';

registerTestInternals();

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  void bootstrap();
}
