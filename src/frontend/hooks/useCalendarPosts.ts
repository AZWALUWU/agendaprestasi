import { useQuery } from "@tanstack/react-query";
import { supabase } from "@backend/supabase/client";
import { useAuth } from "@frontend/hooks/use-auth";

export function useCalendarPosts(year: number, month: number) {
  const { loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["calendar-posts", year, month],
    queryFn: async () => {
      const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("posts")
        .select("id, title, slug, category, open_date, deadline, announcement_date, status")
        .eq("status", "published")
        .or(
          `open_date.gte.${firstDay},open_date.lte.${lastDay},deadline.gte.${firstDay},deadline.lte.${lastDay},announcement_date.gte.${firstDay},announcement_date.lte.${lastDay}`
        );

      if (error) throw error;
      return data;
    },
    enabled: !authLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}