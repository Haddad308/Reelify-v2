# Module: iam

Separate least-privilege roles for the ECS workloads (plan §11). One shared
**execution role** (image pull + logs + secret injection), and one **task role**
per service scoped to exactly what it needs:

| Role            | S3 (media)              | SQS                         | Secrets              |
| --------------- | ----------------------- | --------------------------- | -------------------- |
| `web`           | none                    | none                        | none                 |
| `api`           | put/get + multipart     | none                        | database/url         |
| `dispatcher`    | none                    | SendMessage (all queues)    | database/url         |
| `ffmpeg`        | get source, put audio   | consume `extraction`        | database/url         |
| `transcription` | get audio               | consume `transcription`     | elevenlabs + db      |
| `scoring`       | none                    | consume `scoring`           | gemini + db          |

Queue consumers get only `Receive/Delete/GetQueueAttributes/ChangeMessageVisibility`
on their own queue; only the dispatcher may `SendMessage` (messages originate
from the transactional outbox). KMS decrypt is scoped to the specific media /
secrets keys.

## Inputs

`media_bucket_arn`, `media_kms_key_arn`, `secrets_kms_key_arn`, `secret_arns`
(map), `queue_arns` (map with `extraction`/`transcription`/`scoring`).

## Outputs

`execution_role_arn`, `task_role_arns` (map of service -> ARN), consumed by the
`compute` module's task definitions.
