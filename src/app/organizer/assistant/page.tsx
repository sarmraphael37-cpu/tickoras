import type { Metadata } from "next";
import { AssistantChat } from "@/components/organizer/assistant-chat";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOrganizer } from "@/lib/auth";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "AI Assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const viewer = await requireOrganizer("/organizer/assistant");
  if (!viewer.organizerId) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No organizer profile"
        description="The business assistant appears once your organizer account is approved."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Business intelligence"
        title="Ask your data anything"
        description="Sales forecasts, revenue, profit, marketing ROI and recommendations — answered from your real records, never guessed."
      />
      <AssistantChat />
    </div>
  );
}
