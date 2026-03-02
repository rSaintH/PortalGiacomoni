import { supabase } from "@/integrations/supabase/client";

export async function toggleManagementReview(payload: {
  reviewId?: string;
  clientId: string;
  yearMonth: string;
  reviewerNumber: number;
  userId?: string;
}) {
  if (payload.reviewId) {
    const { error } = await supabase
      .from("management_reviews" as any)
      .delete()
      .eq("id", payload.reviewId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("management_reviews" as any)
    .insert({
      client_id: payload.clientId,
      year_month: payload.yearMonth,
      reviewer_number: payload.reviewerNumber,
      reviewed_by: payload.userId,
    });
  if (error) throw error;
}
