import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface DockItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  isActive?: boolean
  badge?: boolean
  onClick?: () => void
}

interface DockProps {
  items: DockItem[]
  className?: string
}

export function Dock({ items, className }: DockProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <motion.div
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "flex items-end justify-around px-4 py-2.5 rounded-[999px]",
        "border border-white/80 bg-white/60 backdrop-blur-3xl",
        "shadow-[0_16px_56px_rgba(30,55,28,0.18),0_4px_16px_rgba(30,55,28,0.10),inset_0_1.5px_0_rgba(255,255,255,0.95)]",
        className
      )}
    >
      {items.map((item, i) => {
        const isHovered = hovered === i
        const Icon = item.icon

        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <motion.button
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered(null)}
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  rotate: isHovered ? -5 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5",
                  "h-12 w-12 rounded-2xl outline-none transition-shadow",
                  isHovered && "shadow-lg shadow-[oklch(0.42_0.08_130)]/20"
                )}
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={item.isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "transition-colors",
                    item.isActive
                      ? "h-[20px] w-[20px] text-[oklch(0.42_0.08_130)]"
                      : "h-[22px] w-[22px] text-[oklch(0.50_0.06_130)]"
                  )}
                  strokeWidth={item.isActive ? 2.5 : 1.75}
                />

                {/* Active dot */}
                <AnimatePresence>
                  {item.isActive && (
                    <motion.div
                      key="dot"
                      layoutId="active-dot"
                      className="w-1.5 h-1.5 rounded-full bg-[oklch(0.42_0.08_130)]"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </AnimatePresence>

                {/* Unread badge */}
                {item.badge && (
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ background: "oklch(0.60 0.22 25)" }}
                  />
                )}

                {/* Hover ring */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.span
                      key="ring"
                      className="absolute inset-0 rounded-2xl border border-[oklch(0.42_0.08_130)]/40"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </motion.div>
  )
}
