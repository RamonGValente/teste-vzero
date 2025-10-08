import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Loader2, Sparkles } from 'lucide-react';

interface QuickRepliesProps {
  lastMessage?: any;
  messages: any[];
  onSelectReply: (reply: string) => void;
  isVisible: boolean;
}

export const QuickReplies = ({ lastMessage, messages, onSelectReply, isVisible }: QuickRepliesProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { generateReplySuggestions, loading } = useAIAssistant();

  useEffect(() => {
    if (!isVisible || !lastMessage || lastMessage.message_type !== 'text') {
      setSuggestions([]);
      return;
    }

    const generateSuggestions = async () => {
      const context = messages
        .slice(-5)
        .map(m => m.content)
        .filter(Boolean);

      const result = await generateReplySuggestions(lastMessage.content, context);
      setSuggestions(result.suggestions || []);
    };

    // Delay to avoid too many API calls
    const timer = setTimeout(generateSuggestions, 1000);
    return () => clearTimeout(timer);
  }, [lastMessage, messages, isVisible, generateReplySuggestions]);

  if (!isVisible || !lastMessage || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t bg-muted/20 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Sugestões de resposta
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs px-3 py-1 h-7 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onSelectReply(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};