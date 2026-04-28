import { Link } from "wouter";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavPillProps = {
  href: string;
  icon?: ReactNode;
  active?: boolean;
  external?: boolean;
  className?: string;
  children: ReactNode;
};

export function NavPill({ href, icon, active, external, className, children }: NavPillProps) {
  const cls = cn("nav-pill", active && "is-active", className);
  const content = (
    <>
      {icon != null && <span className="nav-pill__icon">{icon}</span>}
      <span>{children}</span>
    </>
  );
  return external
    ? <a href={href} className={cls}>{content}</a>
    : <Link href={href} className={cls}>{content}</Link>;
}
