"use client"
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import ChatEmpty from './chat-empty';
import ChatMessages from './chat-messages';
import { useQueryClient } from '@tanstack/react-query';
import { useConversations } from '../hooks/use-conversation';
import { useMemo } from 'react';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatComposer } from './chat-composer';

type ConversationViewProps = {
  conversationId: string;
  initialMessages: UIMessage[];
};

const ConversationView = ({ conversationId, initialMessages }: ConversationViewProps) => {

  const queryClient = useQueryClient();
  const { data: conversations } = useConversations();

  //* This is used by the useChat hook . and this done the HTTP work . prepareSendMessagesRequest gets called right before the HTTP request is sent.
  //* We kept this inside useMemo so that it is not recreated on every render.
  //* messages.at(-1) means the last message in the messages array. (the message that the user just sent)
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({id, messages}) => ({
      body: {
        id, message: messages.at(-1)
      }
    })
  }), []);

  /* 
    - useChat() is the core AI SDK hook that manages your chat state, sends messages to the backend, receives streaming AI responses,
    - and automatically updates the UI in real time. It exposes APIs like messages, sendMessage, status, stop, 
    - and callbacks such as onFinish and onError so you can build ChatGPT-like experiences with minimal code.
  */

  const { messages, status, sendMessage } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const title = conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";


  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <h1 className="truncate text-sm font-medium">{title}</h1>
      </header>

      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <ChatMessages messages={messages} status={status} />
      )}

      <ChatComposer
        onSend={(text) => {
          void sendMessage({ text });
        }}
        isSending={status !== "ready"}
        autoFocus
      />
    </div>
  );
}

export default ConversationView