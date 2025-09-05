import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssistantWidgetProps {
  name: string;
  description: string;
  color: string;
  avatar: string;
  message?: string;
  className?: string;
}

const AssistantWidget = ({ 
  name, 
  description, 
  color, 
  avatar, 
  message,
  className 
}: AssistantWidgetProps) => {
  return (
    <div className={cn(
      "glass-glow rounded-xl p-4 max-w-sm",
      className
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-2xl",
          "bg-gradient-to-br shadow-elegant",
          color === 'blue' && "from-blue-500 to-blue-600",
          color === 'green' && "from-green-500 to-green-600", 
          color === 'purple' && "from-purple-500 to-purple-600"
        )}>
          {avatar}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{name}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      
      {message && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-foreground/90">{message}</p>
        </div>
      )}
    </div>
  );
};

export default AssistantWidget;