"use client"

import React, { useMemo, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Ban, ChevronRight, Code2, Loader2, Terminal } from "lucide-react"
import { UIMessage } from "ai"

import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg px-3 py-2 text-sm w-auto",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
)

type Animation = VariantProps<typeof chatBubbleVariants>["animation"]

interface Attachment {
  name?: string
  contentType?: string
  url: string
}

interface PartialToolCall {
  state: "partial-call"
  toolName: string
}

interface ToolCall {
  state: "call"
  toolName: string
}

interface ToolResult {
  state: "result"
  toolName: string
  result: {
    __cancelled?: boolean
    [key: string]: any
  }
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult

interface ReasoningPart {
  type: "reasoning"
  reasoning: string
}

interface ToolInvocationPart {
  type: "tool-invocation"
  toolInvocation: ToolInvocation
}

interface TextPart {
  type: "text"
  text: string
}

// For compatibility with AI SDK types, not used
interface SourcePart {
  type: "source"
}

type MessagePart = TextPart | ReasoningPart | ToolInvocationPart | SourcePart

export interface Message {
  id: string
  role: "user" | "assistant" | (string & {})
  content: string
  createdAt?: Date
  experimental_attachments?: Attachment[]
  toolInvocations?: ToolInvocation[]
  parts?: MessagePart[]
}

export interface ChatMessageProps extends UIMessage {
  showTimeStamp?: boolean
  animation?: Animation
  actions?: React.ReactNode
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  parts,
  metadata,
  showTimeStamp = false,
  animation = "scale",
  actions,
}) => {
  const isUser = role === "user";

  // Optionally extract createdAt from metadata if present
  const createdAt = metadata && (metadata as any).createdAt ? new Date((metadata as any).createdAt) : undefined;
  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex flex-col items-start")}> 
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div key={`text-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{part.text}</MarkdownRenderer>
              {actions ? (
                <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                  {actions}
                </div>
              ) : null}
              {showTimeStamp && createdAt ? (
                <time
                  dateTime={createdAt.toISOString()}
                  className={cn(
                    "mt-1 block px-1 text-xs opacity-50",
                    animation !== "none" && "duration-500 animate-in fade-in-0"
                  )}
                >
                  {formattedTime}
                </time>
              ) : null}
            </div>
          );
        } else if (part.type === "reasoning") {
          return (
            <div key={`reasoning-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <MarkdownRenderer>{part.text}</MarkdownRenderer>
            </div>
          );
        } else if (part.type === "tool-invocation") {
          return (
            <div key={`tool-invocation-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <pre className="text-xs bg-muted/50 rounded p-2">
                {JSON.stringify(part.toolInvocation, null, 2)}
              </pre>
            </div>
          );
        } else if (part.type === "file") {
          return (
            <div key={`file-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <a href={part.url} target="_blank" rel="noopener noreferrer" className="underline">
                {part.filename || part.url}
              </a>
            </div>
          );
        } else if (part.type === "source-url") {
          return (
            <div key={`source-url-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <a href={part.url} target="_blank" rel="noopener noreferrer" className="underline">
                {part.title || part.url}
              </a>
            </div>
          );
        } else if (part.type === "step-start") {
          return (
            <div key={`step-start-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <span className="text-xs text-muted-foreground">Step started</span>
            </div>
          );
        } else if (part.type && part.type.startsWith('data-')) {
          return (
            <div key={`data-${index}`} className={cn(chatBubbleVariants({ isUser, animation }))}>
              <pre className="text-xs bg-muted/50 rounded p-2">
                {JSON.stringify(part.data, null, 2)}
              </pre>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1]
  const buf = Buffer.from(base64, "base64")
  return new Uint8Array(buf)
}

const ReasoningBlock = ({ part }: { part: ReasoningPart }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mb-2 flex flex-col items-start sm:max-w-[70%]">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="group w-full overflow-hidden rounded-lg border bg-muted/50"
      >
        <div className="flex items-center p-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
              <span>Thinking</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent forceMount>
          <motion.div
            initial={false}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="border-t"
          >
            <div className="p-2">
              <div className="whitespace-pre-wrap text-xs">
                {part.reasoning}
              </div>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
