import {
  IconAnalytics,
  IconConfig,
  IconConversations,
  IconDashboard,
  IconEscalations,
  IconKnowledge,
  IconTickets,
} from "./icons";

export interface NavItem {
  label: string;
  href: string;
  icon: (props: { className?: string }) => JSX.Element;
}

/** Sidebar navigation — order matches the product spec. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  { label: "Knowledge Base", href: "/knowledge-base", icon: IconKnowledge },
  { label: "AI Configuration", href: "/ai-config", icon: IconConfig },
  { label: "Conversations", href: "/conversations", icon: IconConversations },
  { label: "Tickets", href: "/tickets", icon: IconTickets },
  { label: "Escalations", href: "/escalations", icon: IconEscalations },
  { label: "Analytics", href: "/analytics", icon: IconAnalytics },
];
