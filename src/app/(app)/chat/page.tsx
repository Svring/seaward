'use client';

import { useChat } from '@ai-sdk/react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInputArea } from '@/components/ui/chat/chat-input-area';
import { ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { ChatBubble } from '@/components/ui/chat/chat-bubble';
import { motion } from "framer-motion";
import { Hero } from "@/components/blocks/hero"
import { defaultChatStore } from 'ai';
import { AppContext } from '@/providers/app-context-provider';
import { useContext } from 'react';


export default function Chat() {
  const appContext = useContext(AppContext);
  const user = appContext?.user;
  const projectId = appContext?.projectId;
  const projectSessionId = appContext?.projectSessionId;

  const chatStore = defaultChatStore({
    api: '/api/agent',
    maxSteps: 30,
    chats: {},
    body: { user, projectId, projectSessionId },
  });

  const { messages, input, handleInputChange, handleSubmit, status, addToolResult } = useChat({
    chatStore
  });
  const showMessageArea = messages.length > 0 || status === "submitted";

  return (
    <motion.div layout className="flex flex-col h-full w-full">
      {showMessageArea && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col flex-1 w-full rounded-xl max-w-3xl mx-auto overflow-auto no-scrollbar mt-12"
        >
          <ScrollArea className="flex-1">
            <ChatMessageList className="rounded-xl">
              {messages.map((message, index) => (
                <ChatBubble
                  key={message.id}
                  variant={message.role === "user" ? "sent" : "received"}
                >
                  <ChatBubbleMessage
                    variant={message.role === "user" ? "sent" : "received"}
                    parts={message.parts}
                    index={index}
                    addToolResult={addToolResult}
                  >
                  </ChatBubbleMessage>
                </ChatBubble>
              ))}

              {/* {JSON.stringify(messages)} */}

              {status === "submitted" && (
                <ChatBubble variant="received">
                  <ChatBubbleMessage isLoading />
                </ChatBubble>
              )}
            </ChatMessageList>
          </ScrollArea>
        </motion.div>
      )}

      {!showMessageArea && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center px-4"
        >
          <Hero
            heroTitle="Seaward"
            subtitle="Look up models with a license of cc-by-sa-4.0 and sort by most likes on Hugging face, save top 5 to file."
            actions={[
              {
                label: "View Projects",
                href: "#",
                variant: "outline"
              },
              {
                label: "Create Project",
                href: "#",
                variant: "default"
              }
            ]}
            titleClassName="text-5xl md:text-6xl font-extrabold"
            subtitleClassName="text-lg md:text-xl max-w-[600px]"
            actionsClassName="mt-4"
          />
        </motion.div>
      )}

      <motion.div
        layout
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full max-w-3xl mx-auto"
      >
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
        />
      </motion.div>
    </motion.div>
  );
}