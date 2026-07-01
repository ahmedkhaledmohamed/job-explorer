import { auth, signOut } from "@/auth";
import { NavBar } from "./nav-bar";

export async function Nav() {
  const session = await auth();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <NavBar user={session?.user || null} signOutAction={handleSignOut} />;
}
