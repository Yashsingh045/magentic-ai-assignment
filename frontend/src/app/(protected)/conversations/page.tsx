import { IconConversations } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ConversationsPage() {
  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Browse and search customer chat history."
      />
      <EmptyState
        icon={<IconConversations className="h-6 w-6" />}
        title="No conversations yet"
        description="Customer chats from your widget will show up here with full timelines."
      />
    </div>
  );
}
