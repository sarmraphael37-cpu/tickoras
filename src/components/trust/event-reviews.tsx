import { Star } from "lucide-react";
import { ReviewForm, ReportReviewButton } from "@/components/trust/trust-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listEventReviews } from "@/lib/data/trust";
import { formatDate } from "@/lib/utils";

export async function EventReviewsSection({
  eventId,
  viewerId,
}: {
  eventId: string;
  viewerId: string | null;
}) {
  const { reviews, avgRating, count } = await listEventReviews(eventId);

  return (
    <section className="border-t border-line bg-cream py-14">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Community</p>
            <h2 className="display-title mt-2 text-[30px]">Reviews</h2>
          </div>
          {avgRating !== null ? (
            <p className="flex items-center gap-1.5 text-[12px] text-muted">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <strong className="text-ink">{avgRating}</strong> · {count}{" "}
              review{count === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-[12.5px] text-muted">
                  No reviews yet. Attendees who attended can be the first.
                </CardContent>
              </Card>
            ) : (
              reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-ink">
                        {r.reviewer?.full_name ?? "Attendee"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={
                                n <= r.rating
                                  ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  : "h-3.5 w-3.5 text-line"
                              }
                            />
                          ))}
                        </span>
                        {viewerId && viewerId !== r.user_id ? (
                          <ReportReviewButton reviewId={r.id} />
                        ) : null}
                      </div>
                    </div>
                    {r.comment ? (
                      <p className="mt-2 text-[12.5px] leading-5 text-muted">
                        {r.comment}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[10px] text-faint">
                      {formatDate(r.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {viewerId ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-[14px]">Write a review</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ReviewForm targetType="event" targetId={eventId} />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-fit">
              <CardContent className="py-5 text-center text-[12px] text-muted">
                <a href="/login" className="font-semibold text-accent-300 hover:underline">
                  Sign in
                </a>{" "}
                to review events you&apos;ve attended.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
