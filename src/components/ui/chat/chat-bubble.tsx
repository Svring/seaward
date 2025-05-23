import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MessageLoading from "./message-loading";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// ChatBubble
const chatBubbleVariant = cva(
  "flex gap-2 max-w-[100%] items-end relative group",
  {
    variants: {
      variant: {
        received: "self-start",
        sent: "self-end flex-row-reverse",
      },
      layout: {
        default: "",
        ai: "max-w-full w-full items-center",
      },
    },
    defaultVariants: {
      variant: "received",
      layout: "default",
    },
  },
);

interface ChatBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chatBubbleVariant> {}

const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, variant, layout, children, ...props }, ref) => (
    <div
      className={cn(
        chatBubbleVariant({ variant, layout, className }),
        "relative group",
      )}
      ref={ref}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && typeof child.type !== "string"
          ? React.cloneElement(child, {
              variant,
              layout,
            } as React.ComponentProps<typeof child.type>)
          : child,
      )}
    </div>
  ),
);
ChatBubble.displayName = "ChatBubble";

// ChatBubbleAvatar
interface ChatBubbleAvatarProps {
  src?: string;
  fallback?: string;
  className?: string;
}

const ChatBubbleAvatar: React.FC<ChatBubbleAvatarProps> = ({
  src,
  fallback,
  className,
}) => (
  <Avatar className={className}>
    <AvatarImage src={src} alt="Avatar" />
    <AvatarFallback>{fallback}</AvatarFallback>
  </Avatar>
);

// Placeholder type for UIMessagePart, ideally import from 'ai' or shared types
type UIMessagePart = {
  type: string;
  text?: string;
  toolInvocation?: { toolName: string; [key: string]: any };
  providerMetadata?: any;
  url?: string;
  title?: string;
  filename?: string;
  mediaType?: string;
  data?: any;
  [key: string]: any; // Allow other properties
};

function renderUIMessagePart(part: UIMessagePart) {
  switch (part.type) {
    case 'text':
      return <MarkdownRenderer>{part.text || ''}</MarkdownRenderer>;
    case 'reasoning':
      return (
        <div className="italic text-gray-500 dark:text-gray-400 my-1">
          {part.text && <MarkdownRenderer>{part.text}</MarkdownRenderer>}
          {part.providerMetadata && (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">Provider Metadata</summary>
              <pre className="text-gray-400 dark:text-gray-500 whitespace-pre-wrap break-all bg-black/10 dark:bg-white/10 p-1 rounded">
                {JSON.stringify(part.providerMetadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    case 'tool-invocation':
      return (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 p-2 my-1 rounded text-sm">
          <strong>Tool: {part.toolInvocation?.toolName || 'Unknown Tool'}</strong>
          <pre className="text-xs whitespace-pre-wrap break-all mt-1">{JSON.stringify(part.toolInvocation, null, 2)}</pre>
        </div>
      );
    case 'source-url':
      return (
        <div className="my-1 text-sm">
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
            {part.title || part.url}
          </a>
          {part.providerMetadata && (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer">Provider Metadata</summary>
              <pre className="text-gray-400 dark:text-gray-500 whitespace-pre-wrap break-all bg-black/10 dark:bg-white/10 p-1 rounded">
                {JSON.stringify(part.providerMetadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    case 'file':
      return (
        <div className="my-1 text-sm">
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 underline">
            {part.filename || 'View File'}
          </a>
          {part.mediaType && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({part.mediaType})</span>}
        </div>
      );
    case 'step-start':
      return <div className="text-xs text-gray-400 dark:text-gray-500 my-2 py-1 border-t border-b border-gray-200 dark:border-gray-700">--- Step Start ---</div>;
    default:
      if (part.type && part.type.startsWith('data-')) {
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-600 p-2 my-1 rounded text-sm">
            <strong>Custom Data: {part.type.substring(5)}</strong>
            <pre className="text-xs whitespace-pre-wrap break-all mt-1">{JSON.stringify(part.data, null, 2)}</pre>
          </div>
        );
      }
      return (
        <div className="my-1 p-2 border border-red-400 dark:border-red-600 rounded text-sm bg-red-50 dark:bg-red-900/30">
          <strong>Unknown Part Type:</strong> {part.type}
          <pre className="text-xs whitespace-pre-wrap break-all mt-1">{JSON.stringify(part, null, 2)}</pre>
        </div>
      );
  }
}

// ChatBubbleMessage
const chatBubbleMessageVariants = cva("px-3 py-2", {
  variants: {
    variant: {
      received:
        "bg-secondary text-secondary-foreground rounded-xl",
      sent: "bg-primary text-primary-foreground rounded-xl",
    },
    layout: {
      default: "",
      ai: "border-t w-full rounded-none bg-transparent",
    },
  },
  defaultVariants: {
    variant: "received",
    layout: "default",
  },
});

interface ChatBubbleMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chatBubbleMessageVariants> {
  isLoading?: boolean;
  parts?: UIMessagePart[];
}

const ChatBubbleMessage = React.forwardRef<
  HTMLDivElement,
  ChatBubbleMessageProps
>(
  (
    { className, variant, layout, isLoading = false, parts, ...props },
    ref,
  ) => {
    // Determine backdrop class based on variant
    const backdropColorClass = variant === "sent"
      ? "bg-primary/[.2] dark:bg-foreground/[.0]"
      : "bg-secondary/[.2] dark:bg-muted/[.5]";

    return (
      <div // Outer "backdrop" div
        ref={ref}
        className={cn(
          backdropColorClass,
          "rounded-2xl p-1"
        )}
        {...props}
      >
        <div // Inner "top layer" message bubble
          className={cn(
            chatBubbleMessageVariants({ variant, layout }), // Apply CVA variants
            "break-words max-w-full whitespace-pre-wrap", // Base styles for message content
            className // Merge with any className passed as a prop
          )}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <MessageLoading />
            </div>
          ) : (
            parts?.map((part, index) => (
              <div key={`${part.type}-${index}`}>{renderUIMessagePart(part)}</div>
            ))
          )}
        </div>
      </div>
    );
  }
);
ChatBubbleMessage.displayName = "ChatBubbleMessage";

// ChatBubbleTimestamp
interface ChatBubbleTimestampProps
  extends React.HTMLAttributes<HTMLDivElement> {
  timestamp: string;
}

const ChatBubbleTimestamp: React.FC<ChatBubbleTimestampProps> = ({
  timestamp,
  className,
  ...props
}) => (
  <div className={cn("text-xs mt-2 text-right", className)} {...props}>
    {timestamp}
  </div>
);

// ChatBubbleAction
type ChatBubbleActionProps = React.ComponentProps<typeof Button> & {
  icon: React.ReactNode;
};

const ChatBubbleAction: React.FC<ChatBubbleActionProps> = ({
  icon,
  onClick,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}) => (
  <Button
    variant={variant}
    size={size}
    className={className}
    onClick={onClick}
    {...props}
  >
    {icon}
  </Button>
);

interface ChatBubbleActionWrapperProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "sent" | "received";
  className?: string;
}

const ChatBubbleActionWrapper = React.forwardRef<
  HTMLDivElement,
  ChatBubbleActionWrapperProps
>(({ variant, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      variant === "sent"
        ? "-left-1 -translate-x-full flex-row-reverse"
        : "-right-1 translate-x-full",
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
ChatBubbleActionWrapper.displayName = "ChatBubbleActionWrapper";

export {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
  chatBubbleVariant,
  chatBubbleMessageVariants,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
};
