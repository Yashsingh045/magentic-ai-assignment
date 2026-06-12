/**
 * Demo seed — one-command runnable: `npm run seed` (or `npx prisma db seed`).
 *
 * Creates a demo Organization, a known ADMIN login, a customized BotConfig, a
 * small indexed knowledge base, and sample conversations/tickets/escalations so
 * every admin page has data.
 *
 * Idempotent: deletes any prior demo org (by the fixed public key) first.
 *
 * Embeddings: tries the real OpenAI embedder; if it's unavailable (no key / no
 * quota) it falls back to a deterministic local vector so the seed always works.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { insertChunks } from "../src/lib/pgvector";
import { hashPassword } from "../src/utils/hash";
import { chunkText } from "../src/utils/fileParsers";
import { embedMany } from "../src/services/embedding.service";

const DEMO = {
  orgName: "Acme Corp (Demo)",
  publicApiKey: "pk_demo_acme_123",
  adminEmail: "admin@demo.com",
  adminPassword: "demopassword",
  adminName: "Demo Admin",
};

/** Deterministic 1536-dim vector — fallback when OpenAI isn't available. */
function localEmbed(text: string): number[] {
  const v = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[(text.charCodeAt(i) * 7 + i) % 1536] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

async function embedChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const out = await embedMany(texts);
    console.log("  · embeddings: OpenAI (real)");
    return out;
  } catch {
    console.log("  · embeddings: local fallback (OpenAI unavailable)");
    return texts.map(localEmbed);
  }
}

const KB_DOCS = [
  {
    filename: "orders.md",
    fileType: "MD",
    content: `# Orders & Shipping
Orders are processed within 1 business day. Standard shipping takes 3-5 business days; express shipping takes 1-2 business days. You can track your order using the link in your confirmation email. We currently ship to the United States, Canada, and the EU. If your order hasn't arrived within 7 business days, contact support and we'll investigate.`,
  },
  {
    filename: "pricing.md",
    fileType: "MD",
    content: `# Pricing
We offer three plans:
- Starter: $0/month — up to 100 chats, community support.
- Pro: $49/month — up to 5,000 chats, priority email support.
- Business: $199/month — unlimited chats, a dedicated account manager, and SLA.
Annual billing saves 20%. You can upgrade, downgrade, or cancel at any time from your billing settings.`,
  },
  {
    filename: "refund-policy.md",
    fileType: "MD",
    content: `# Refund Policy
Customers may request a full refund within 30 days of purchase. To start a return, email support@acme.com with your order number. Refunds are processed within 5 business days to the original payment method. Damaged items are replaced free of charge. Shipping costs are non-refundable except for defective products.`,
  },
  {
    filename: "support.md",
    fileType: "TXT",
    content: `# Support
Our support team is available Monday to Friday, 9am-6pm Eastern Time. Premium (Business plan) customers get 24/7 phone support at 1-800-555-0100. You can reach us by email at support@acme.com or through this chat. Average first response time is under 2 hours during business hours.`,
  },
];

async function main() {
  console.log(`Seeding demo data…`);

  // 1. Clean any prior demo org (cascade removes everything under it).
  await prisma.organization.deleteMany({
    where: {
      OR: [{ publicApiKey: DEMO.publicApiKey }, { name: DEMO.orgName }],
    },
  });

  // 2. Organization + ADMIN user + BotConfig.
  const org = await prisma.organization.create({
    data: { name: DEMO.orgName, publicApiKey: DEMO.publicApiKey },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: DEMO.adminEmail,
      passwordHash: await hashPassword(DEMO.adminPassword),
      name: DEMO.adminName,
      role: "ADMIN",
    },
  });
  await prisma.botConfig.create({
    data: {
      organizationId: org.id,
      botName: "Acme Assistant",
      welcomeMessage: "Hi! I'm the Acme support assistant. How can I help you today?",
      personality: "FRIENDLY",
      escalationRules: {
        refundRequested: true,
        legalComplaint: true,
        customerAngry: true,
        humanRequested: true,
        customKeywords: ["chargeback", "lawsuit"],
      },
    },
  });
  console.log(`  · org + admin + bot config`);

  // 3. Knowledge base — chunk → embed (real or fallback) → store, mark INDEXED.
  const allChunks = KB_DOCS.map((d) => chunkText(d.content));
  const embeddings = await embedChunks(allChunks.flat());
  const docIdByName: Record<string, string> = {};
  let offset = 0;
  for (let i = 0; i < KB_DOCS.length; i++) {
    const doc = KB_DOCS[i];
    const chunks = allChunks[i];
    const document = await prisma.document.create({
      data: {
        organizationId: org.id,
        filename: doc.filename,
        fileType: doc.fileType,
        status: "PROCESSING",
        sizeBytes: Buffer.byteLength(doc.content),
      },
    });
    await insertChunks(
      chunks.map((content, idx) => ({
        organizationId: org.id,
        documentId: document.id,
        content,
        embedding: embeddings[offset + idx],
        chunkIndex: idx,
      })),
    );
    offset += chunks.length;
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "INDEXED" },
    });
    docIdByName[doc.filename] = document.id;
  }
  console.log(`  · ${KB_DOCS.length} documents indexed`);

  // 4. Sample conversations (with response times + referenced docs for analytics).
  const now = Date.now();
  const at = (minsAgo: number) => new Date(now - minsAgo * 60_000);

  // Conv 1 — answered from the refund doc (rich content).
  const c1 = await prisma.conversation.create({
    data: {
      organizationId: org.id,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      channel: "WIDGET",
      createdAt: at(120),
      lastMessageAt: at(119),
    },
  });
  await prisma.message.create({
    data: { conversationId: c1.id, role: "USER", content: "What is your refund policy?", createdAt: at(120) },
  });
  await prisma.message.create({
    data: {
      conversationId: c1.id,
      role: "ASSISTANT",
      content:
        "You can request a **full refund within 30 days** of purchase. Just email support@acme.com with your order number.",
      responseTimeMs: 820,
      referencedDocIds: [docIdByName["refund-policy.md"]],
      richContent: {
        blocks: [
          {
            type: "bullets",
            items: [
              "Full refund within 30 days",
              "Email support@acme.com with your order number",
              "Processed within 5 business days",
            ],
          },
        ],
        suggestedQuestions: [
          "How long do refunds take?",
          "Are shipping costs refundable?",
        ],
      },
      createdAt: at(119),
    },
  });

  // Conv 2 — payment failure → escalation + URGENT ticket.
  const c2 = await prisma.conversation.create({
    data: {
      organizationId: org.id,
      customerName: "Bob Smith",
      customerEmail: "bob@example.com",
      channel: "WIDGET",
      createdAt: at(90),
      lastMessageAt: at(89),
    },
  });
  await prisma.message.create({
    data: { conversationId: c2.id, role: "USER", content: "My payment was declined and I think I was charged twice!", createdAt: at(90) },
  });
  await prisma.message.create({
    data: {
      conversationId: c2.id,
      role: "ASSISTANT",
      content: "I'm sorry about the billing trouble — I'm escalating this to our team right away.",
      responseTimeMs: 910,
      referencedDocIds: [],
      createdAt: at(89),
    },
  });
  const t2 = await prisma.ticket.create({
    data: {
      organizationId: org.id,
      conversationId: c2.id,
      customerName: "Bob Smith",
      customerEmail: "bob@example.com",
      query: "Payment declined and possibly charged twice",
      priority: "URGENT",
      status: "OPEN",
      createdAt: at(89),
    },
  });
  await prisma.escalationEvent.create({
    data: {
      organizationId: org.id,
      conversationId: c2.id,
      ticketId: t2.id,
      reason: "payment failure detected",
      priority: "URGENT",
      createdAt: at(89),
    },
  });

  // Conv 3 — human requested → escalation + MEDIUM ticket (in progress).
  const c3 = await prisma.conversation.create({
    data: {
      organizationId: org.id,
      customerName: "Carol Lee",
      customerEmail: "carol@example.com",
      channel: "WIDGET",
      createdAt: at(60),
      lastMessageAt: at(59),
    },
  });
  await prisma.message.create({
    data: { conversationId: c3.id, role: "USER", content: "I'd like to speak to a human agent please", createdAt: at(60) },
  });
  await prisma.message.create({
    data: {
      conversationId: c3.id,
      role: "ASSISTANT",
      content: "Of course — I'll connect you with a support agent.",
      responseTimeMs: 540,
      referencedDocIds: [],
      createdAt: at(59),
    },
  });
  const t3 = await prisma.ticket.create({
    data: {
      organizationId: org.id,
      conversationId: c3.id,
      customerName: "Carol Lee",
      customerEmail: "carol@example.com",
      query: "Customer requested a human agent",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      createdAt: at(59),
    },
  });
  await prisma.escalationEvent.create({
    data: {
      organizationId: org.id,
      conversationId: c3.id,
      ticketId: t3.id,
      reason: "customer requested a human agent",
      priority: "MEDIUM",
      createdAt: at(59),
    },
  });

  // Conv 4 — answered from the pricing doc.
  const c4 = await prisma.conversation.create({
    data: {
      organizationId: org.id,
      customerName: "Dan Patel",
      customerEmail: "dan@example.com",
      channel: "WIDGET",
      createdAt: at(30),
      lastMessageAt: at(29),
    },
  });
  await prisma.message.create({
    data: { conversationId: c4.id, role: "USER", content: "What are your pricing plans?", createdAt: at(30) },
  });
  await prisma.message.create({
    data: {
      conversationId: c4.id,
      role: "ASSISTANT",
      content: "We offer Starter ($0), Pro ($49/mo), and Business ($199/mo) plans. Annual billing saves 20%.",
      responseTimeMs: 700,
      referencedDocIds: [docIdByName["pricing.md"]],
      createdAt: at(29),
    },
  });

  // Standalone resolved ticket (created by an agent, no conversation).
  await prisma.ticket.create({
    data: {
      organizationId: org.id,
      customerName: "Eve Turner",
      customerEmail: "eve@example.com",
      query: "How do I update my billing address?",
      priority: "LOW",
      status: "RESOLVED",
      createdAt: at(200),
    },
  });

  console.log(`  · 4 conversations, 3 tickets, 2 escalations`);

  console.log(`\n✅ Seed complete.`);
  console.log(`   Admin login : ${DEMO.adminEmail} / ${DEMO.adminPassword}`);
  console.log(`   Widget key  : ${DEMO.publicApiKey}`);
  console.log(`   Widget demo : /widget?key=${DEMO.publicApiKey}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
