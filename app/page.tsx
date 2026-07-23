import Image from "next/image";
import { ModeToggle } from "@/components/ui/mode-toggle";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold underline">
      Hello World!
    </h1>
    <ModeToggle />
    </div>
  );
}
