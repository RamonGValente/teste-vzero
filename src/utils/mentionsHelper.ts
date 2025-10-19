import { supabase } from "@/integrations/supabase/client";

export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

export const saveMentions = async (
  contentId: string,
  contentType: 'post' | 'message' | 'comment',
  content: string,
  userId: string
) => {
  const mentionedUsernames = extractMentions(content);

  if (mentionedUsernames.length === 0) return;

  // Get user IDs from usernames
  const { data: users } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", mentionedUsernames);

  if (!users || users.length === 0) return;

  // Create mention records
  const mentions = users.map(user => ({
    user_id: userId,
    mentioned_user_id: user.id,
    content_type: contentType,
    content_id: contentId,
  }));

  await supabase.from("mentions").insert(mentions);
};
