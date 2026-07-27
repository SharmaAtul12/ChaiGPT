import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import {convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage} from "ai";
import { requireUser } from "@/features/auth/actions/require-user";
import prisma from "@/lib/db";
import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";

export async function POST(req: NextRequest) {
  await auth.protect();
  const {message, id} : {message: UIMessage, id:string} =  await req.json()

  if (!message || !id) {
     return new Response("Missing message or conversation id", { status: 400 });
  }

  const user = await requireUser();

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: user.id
    }
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const previousMessages = await loadChatMessages(id);

  //! Ye Specific message Jo UI ss aa rha hh , vo mere DB kk andar already saved hh ya nhi , ye check krne k liye hh
  //! Why some method ? because it checks if at least one element in the array passes the test implemented by the provided function. In this case, it checks if any message in previousMessages has the same id as the incoming message. If it finds a match, it returns true, indicating that the message is already saved in the database. If no match is found, it returns false, meaning the message is new and needs to be saved.
  const alreadySaved = previousMessages.some((msg) => msg.id === message.id);

  const messages = alreadySaved ? previousMessages : [...previousMessages, message];

  if (!alreadySaved) {
      await saveChatMessages(id, [message]);
  }

  const result = streamText({
    model : getChatModel(conversation.model),
    system: conversation.systemPrompt ?? "You are ChaiGpt , a helpful assistant",
    messages : await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await saveChatMessages(id, finalMessages, { updateTitle: false });
        } catch (error) {
          console.error(error);
        }
      },
    }),
  });


}