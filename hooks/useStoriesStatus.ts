/**
 * useStoriesStatus
 * Given a list of user IDs, returns which ones have active (non-expired) stories
 * and which of those the current user has NOT yet seen.
 *
 * Used to drive StoryRing visibility in DMs and member lists.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuth";

export interface StoryStatus {
  hasStory: boolean;
  hasUnseenStory: boolean;
}

export function useStoriesStatus(userIds: string[]): Record<string, StoryStatus> {
  const { session } = useAuthStore();
  const viewerId = session?.user.id;
  const [status, setStatus] = useState<Record<string, StoryStatus>>({});

  const fetch = useCallback(async () => {
    if (!viewerId || userIds.length === 0) return;

    // Active stories for the given users
    const { data: stories } = await supabase
      .from("stories")
      .select("id, author_id")
      .in("author_id", userIds)
      .gt("expires_at", new Date().toISOString());

    if (!stories || stories.length === 0) {
      const empty: Record<string, StoryStatus> = {};
      userIds.forEach(id => { empty[id] = { hasStory: false, hasUnseenStory: false }; });
      setStatus(empty);
      return;
    }

    const storyIds = stories.map(s => s.id);

    // Which of those has the viewer seen?
    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", viewerId)
      .in("story_id", storyIds);

    const seenIds = new Set((views ?? []).map((v: any) => v.story_id));

    // Build per-user map
    const result: Record<string, StoryStatus> = {};
    userIds.forEach(uid => { result[uid] = { hasStory: false, hasUnseenStory: false }; });

    stories.forEach(s => {
      if (!result[s.author_id]) result[s.author_id] = { hasStory: false, hasUnseenStory: false };
      result[s.author_id].hasStory = true;
      if (!seenIds.has(s.id)) result[s.author_id].hasUnseenStory = true;
    });

    setStatus(result);
  }, [viewerId, userIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  return status;
}
