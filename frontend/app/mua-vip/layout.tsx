import type { ReactNode } from "react";
import "./vip.css";
import { LoginModalProvider } from "@/components/auth/LoginModalProvider";

export default function MuaVipLayout({ children }: { children: ReactNode }) {
  return <LoginModalProvider variant="vip">{children}</LoginModalProvider>;
}
