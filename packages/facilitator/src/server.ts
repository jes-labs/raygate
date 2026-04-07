import { loadConfig } from "./config.js";
import { createFacilitatorApp } from "./index.js";

const config = loadConfig();
const app = createFacilitatorApp(config);

app.listen(config.port, () => {
  console.log(`[raygate/facilitator] Running on port ${config.port}`);
  console.log(`[raygate/facilitator] Network: ${config.network}`);
  console.log(`[raygate/facilitator] Endpoints: /verify, /settle, /capabilities, /health`);
});
