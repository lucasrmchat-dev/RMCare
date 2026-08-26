import { redirect } from "next/navigation";

export default function AcessoInternoRedirect() {
  redirect("/login");
}
