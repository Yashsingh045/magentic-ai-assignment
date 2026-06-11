import { IconConfig } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AiConfigPage() {
  return (
    <div>
      <PageHeader
        title="AI Configuration"
        description="Tune your assistant's name, personality, and escalation rules."
      />
      <EmptyState
        icon={<IconConfig className="h-6 w-6" />}
        title="Bot configuration coming soon"
        description="Set the bot name, welcome message, personality, and escalation rules here."
      />
    </div>
  );
}
