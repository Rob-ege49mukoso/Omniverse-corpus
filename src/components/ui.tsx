import { useEffect } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

type ClassProps = { className?: string; children?: ReactNode };
type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & { icon: LucideIcon; label: string };

export function Button({ className, children, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn("inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50", className)} {...props}>{children}</button>;
}
export function Card({ className, children }: ClassProps) {
  return <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-4", className)}>{children}</div>;
}
export function Badge({ className, children }: ClassProps) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}>{children}</span>;
}
export function SectionTitle({ className, children }: ClassProps) {
  return <h2 className={cn("text-lg font-semibold tracking-tight", className)}>{children}</h2>;
}
export function IconButton({ icon: Icon, label, className, children, type = "button", ...props }: IconButtonProps) {
  return <button type={type} aria-label={label} title={label} className={cn("icon-button", className)} {...props}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{children}</button>;
}
export function NexusLogo() {
  return <div className="nexus-logo">
    <span className="nexus-logo-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none">
      <path d="M20 3.5 35 12v16L20 36.5 5 28V12L20 3.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 3.5V20m0 0 15-8M20 20 5 12m15 8v16.5m0-16.5 15 8m-15-8L5 28" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="20" cy="20" r="2.2" fill="currentColor" />
    </svg></span>
    <span className="nexus-logo-type"><strong>NEXUS</strong><small>ZERO</small></span>
  </div>;
}
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <div className="toast" role="status" aria-live="polite">
    <span className="toast-indicator" /><p>{message}</p>
    <button type="button" className="toast-close" onClick={onClose} aria-label="Fermer la notification"><X size={16} /></button>
  </div>;
}
