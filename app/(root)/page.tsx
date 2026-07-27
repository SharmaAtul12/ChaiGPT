import { ModeToggle } from "@/components/ui/mode-toggle";
import { startNewChat } from "@/features/home/actions/start-new-chat";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";


const page = async () => {
  const conversationId = await startNewChat();
  redirect(`/c/${conversationId}`)
}

export default page
