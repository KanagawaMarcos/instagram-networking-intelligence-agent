import "dotenv/config";
import { buildApp } from "./app.js";

const app = await buildApp();
await app.listen({ host: "0.0.0.0", port: Number(process.env.API_PORT ?? 3001) });
