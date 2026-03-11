import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export type CategoryItem = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  groupName: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetches all active categories from the database.
 * Falls back to an empty array while loading.
 * Use this hook in any component that needs the dynamic category list.
 */
export function useCategories() {
  const { data = [], isLoading, error } = trpc.categories.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
  });

  const bySlug = useMemo(() => {
    const map: Record<string, CategoryItem> = {};
    for (const cat of data) map[cat.slug] = cat;
    return map;
  }, [data]);

  const byGroup = useMemo(() => {
    const map: Record<string, CategoryItem[]> = {};
    for (const cat of data) {
      const g = cat.groupName ?? "general";
      if (!map[g]) map[g] = [];
      map[g].push(cat);
    }
    return map;
  }, [data]);

  return { categories: data, bySlug, byGroup, isLoading, error };
}

/**
 * Returns the display name for a category slug.
 * Falls back to the slug itself if not found.
 */
export function useCategoryName(slug: string | null | undefined): string {
  const { bySlug } = useCategories();
  if (!slug) return "";
  return bySlug[slug]?.name ?? slug;
}
