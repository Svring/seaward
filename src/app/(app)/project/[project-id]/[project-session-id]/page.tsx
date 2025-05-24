'use client';

import { useChat } from '@ai-sdk/react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInputArea } from '@/components/ui/chat/chat-input-area';
import { ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { ChatBubble } from '@/components/ui/chat/chat-bubble';
import { defaultChatStore } from 'ai';
import { AppContext } from '@/providers/app-context-provider';
import { useContext, useEffect, useMemo } from 'react';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import { v4 as uuidv4 } from 'uuid';
import { loadSessionMessages } from '@/database/actions/project-sessions-actions';

export default function Chat() {
  const appContext = useContext(AppContext);
  const user = appContext?.user;
  const projectId = appContext?.projectId;
  const projectSessionId = appContext?.projectSessionId;
  const selectedModel = appContext?.selectedModel;

  const chatStore = useMemo(() => defaultChatStore({
    api: '/api/agent',
    maxSteps: 30,
    chats: {},
    body: { user, projectId, projectSessionId, selectedModel },
    generateId: uuidv4,
  }), [user, projectId, projectSessionId, selectedModel]);

  const { messages, setMessages, input, handleInputChange, handleSubmit, status, addToolResult } = useChat({
    chatStore,
  });

  useEffect(() => {
    if (projectSessionId) {
      loadSessionMessages(projectSessionId).then((messages) => {
        if (messages) {
          setMessages(messages);
        }
      });
    }
  }, [projectSessionId]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={40} minSize={20} className="px-2">
        <div className="flex flex-col h-full w-full">
          <div className="flex-1 w-full overflow-y-auto no-scrollbar">
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
          </div>
          <div className="mt-2 border-t border-muted">
            <ChatInputArea
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              className="w-full"
            />
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={60} minSize={20}>
        {/* Empty right panel for future content */}
        <div className="h-full w-full"></div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}