import { SQSClient } from "@aws-sdk/client-sqs";
import { createLogger } from "@reelify/shared";
import { PrismaOutboxStore, SqsMessageSender } from "./adapters";
import { loadConfig } from "./config";
import { OutboxDispatcher } from "./dispatcher";

const config = loadConfig();
const logger = createLogger({ service: "outbox-dispatcher" });

const dispatcher = new OutboxDispatcher(config, {
  store: new PrismaOutboxStore(),
  sender: new SqsMessageSender(new SQSClient({ region: config.region })),
  logger,
});

process.on("SIGTERM", () => dispatcher.stop());
process.on("SIGINT", () => dispatcher.stop());

dispatcher.run().catch((err) => {
  logger.error("dispatcher crashed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
