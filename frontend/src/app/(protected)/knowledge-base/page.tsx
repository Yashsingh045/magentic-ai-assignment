import { IconKnowledge } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function KnowledgeBasePage() {
  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Upload documents your AI uses to answer customer questions."
        action={<Button disabled>Upload document</Button>}
      />
      <EmptyState
        icon={<IconKnowledge className="h-6 w-6" />}
        title="No documents yet"
        description="Upload PDF, DOCX, TXT, or Markdown files. They'll be parsed, chunked, and embedded for retrieval."
      />
    </div>
  );
}
