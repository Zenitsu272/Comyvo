import { Suspense } from "react";
import { connection } from "next/server";
import { isTemporaryLoginEnabled } from "@/lib/login-mode";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  await connection();
  return <Suspense><LoginForm temporaryLogin={isTemporaryLoginEnabled()} /></Suspense>;
}
