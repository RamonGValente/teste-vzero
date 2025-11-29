import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUdgRanking } from "@/hooks/useUdgRanking";
import { UserLink } from "@/components/UserLink";

export default function Rankings() {
  const { heartsRanking, bombsRanking } = useUdgRanking();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-4">Rankings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Top corações</h2>
          <div className="space-y-2">
            {heartsRanking.map((entry, index) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-sm">
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback>
                      {entry.username?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <UserLink userId={entry.userId} username={entry.username || ""}>
                    {entry.username}
                  </UserLink>
                </div>
                <span className="text-sm font-semibold">
                  {entry.heartsTotal} ❤
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Top bombas</h2>
          <div className="space-y-2">
            {bombsRanking.map((entry, index) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-right text-sm">
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback>
                      {entry.username?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <UserLink userId={entry.userId} username={entry.username || ""}>
                    {entry.username}
                  </UserLink>
                </div>
                <span className="text-sm font-semibold">
                  {entry.bombsTotal} 💣
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
