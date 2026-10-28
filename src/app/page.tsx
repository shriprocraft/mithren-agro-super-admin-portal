import { redirect } from "next/navigation";

// This application only serves the Super Admin panel; the root is a defined redirect to it.
export default function Home() {
  redirect("/admin");
}
