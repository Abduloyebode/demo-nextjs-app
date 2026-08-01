import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "northstar-ops" });

export const DOCUMENT_PROCESS_EVENT = "document/process.requested" as const;
