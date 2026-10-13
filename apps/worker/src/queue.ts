import { Queue, type JobsOptions } from "bullmq";

export const ANALYSIS_QUEUE = "contact-analysis";
export type AnalysisQueuePayload = { analysisJobId: string; contactIds: string[]; requestedAt: string };
export const analysisJobOptions: JobsOptions = { attempts: 4, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 500, removeOnFail: 1_000 };

export function createAnalysisQueue(connection: string) { return new Queue<AnalysisQueuePayload>(ANALYSIS_QUEUE, { connection: { url: connection }, defaultJobOptions: analysisJobOptions }); }
