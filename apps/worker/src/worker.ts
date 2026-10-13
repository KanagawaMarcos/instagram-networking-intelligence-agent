import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { loadConfig } from "@ina/config";
import { ANALYSIS_QUEUE, type AnalysisQueuePayload, analysisJobOptions } from "./queue.js";

const config = loadConfig();
if (!config.REDIS_URL) {
  console.info("Worker não iniciado: REDIS_URL não configurada. No modo demo, a API processa análises localmente.");
  process.exitCode = 0;
} else {
  const worker = new Worker<AnalysisQueuePayload>(ANALYSIS_QUEUE, async (job: Job<AnalysisQueuePayload>) => {
    // O adaptador de persistência de produção registra progresso por contato.
    // Nunca há scraping, rotação de conta ou reenvio de DM neste worker.
    const total = job.data.contactIds.length;
    for (let index = 0; index < total; index++) await job.updateProgress({ processed: index + 1, total });
    return { processed: total, batchSize: config.ANALYSIS_BATCH_SIZE };
  }, { connection: { url: config.REDIS_URL }, concurrency: config.WORKER_CONCURRENCY, limiter: { max: config.ANALYSIS_BATCH_SIZE, duration: 60_000 } });
  worker.on("failed", (job, error) => console.error("Falha na análise", { jobId: job?.id, attemptsMade: job?.attemptsMade, error: error.message }));
  worker.on("error", (error) => console.error("Erro do worker", error));
  console.info(`Worker ativo com concorrência ${config.WORKER_CONCURRENCY} e ${analysisJobOptions.attempts} tentativas.`);
}
