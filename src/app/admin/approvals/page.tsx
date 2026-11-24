import { redirect } from "next/navigation";

export default function LegacyApprovalsPage() {
  redirect("/admin/events/pending");
}
