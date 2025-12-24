import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  userId: string;
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export function UserLink({ userId, username, className, children }: UserLinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/profile/${userId}`);
  };

  return (
    <span
      onClick={handleClick}
      className={cn(
        "font-semibold hover:underline cursor-pointer text-foreground",
        className
      )}
    >
      {children || `@${username}`}
    </span>
  );
}
