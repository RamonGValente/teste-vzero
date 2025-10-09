import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Small icon button that sits where the bell is in the screenshot.
 * It navigates to /social (the social feed).
 */
export default function SocialAccessButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/social")}
      aria-label="Abrir rede social"
      title="Rede Social"
    >
      <Bell className="h-5 w-5" />
    </Button>
  );
}
