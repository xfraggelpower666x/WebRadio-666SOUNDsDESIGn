import { WorkerEntrypoint } from 'cloudflare:workers';
import worker from './index.js';

export { GoveeRateGate } from './index.js';
export default worker;

// Cloudflare grants access to this entrypoint only through the service binding.
// Reuse the existing token inside this Worker, where it is already available.
export class GoveeRadioService extends WorkerEntrypoint {
  fetch(request) {
    const headers = new Headers(request.headers);
    headers.delete('authorization');
    if (this.env.CONTROL_TOKEN) {
      headers.set('authorization', 'Bearer ' + this.env.CONTROL_TOKEN);
    }
    return worker.fetch(new Request(request, { headers }), this.env);
  }
}
