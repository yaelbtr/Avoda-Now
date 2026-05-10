"use client";

import React, { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

interface GridItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

interface FluidExpandingGridProps {
  items?: GridItem[];
  className?: string;
  id?: string;
}

const DEFAULT_ITEMS: GridItem[] = [
  {
    id: "cleaning",
    title: "ניקיון ותחזוקה",
    subtitle: "עבודות ניקיון בבתים ומשרדים",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=60",
  },
  {
    id: "events",
    title: "אירועים",
    subtitle: "הגשה, ברמנות ושירות שולחנות",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=60",
  },
  {
    id: "moving",
    title: "הובלות ושינועים",
    subtitle: "פינוי דירות ומשרדים",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=60",
  },
];

export function FluidExpandingGrid({
  items = DEFAULT_ITEMS,
  className,
  id = "fluid-gallery",
}: FluidExpandingGridProps) {
  const [layout, setLayout] = useState(() => ({
    row1: items.slice(0, 2).map((i) => i.id),
    row2: items.slice(2, 4).map((i) => i.id),
  }));

  const handleExpand = (itemId: string) => {
    const inRow1 = layout.row1.includes(itemId);
    const inRow2 = layout.row2.includes(itemId);

    if (
      (inRow1 && layout.row1.length === 1) ||
      (inRow2 && layout.row2.length === 1)
    )
      return;

    if (inRow1) {
      const neighbor = layout.row1.find((i) => i !== itemId)!;
      setLayout({
        row1: [itemId],
        row2: [neighbor, ...layout.row2.filter((i) => i !== neighbor)].slice(0, 2),
      });
    } else {
      const neighbor = layout.row2.find((i) => i !== itemId)!;
      setLayout({
        row1: [neighbor, ...layout.row1.filter((i) => i !== neighbor)].slice(0, 2),
        row2: [itemId],
      });
    }
  };

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <LayoutGroup id={id}>
        <motion.div
          layout
          className="grid grid-cols-2 grid-rows-2 gap-3 w-full"
          style={{ height: 280 }}
        >
          {items.map((item) => {
            const isRow1 = layout.row1.includes(item.id);
            const rowArr = isRow1 ? layout.row1 : layout.row2;
            const isSelected = rowArr.length === 1 && rowArr[0] === item.id;

            const gridRow = isRow1 ? 1 : 2;
            let gridColumn: string;
            if (isSelected) {
              gridColumn = "1 / span 2";
            } else if (isRow1) {
              gridColumn = layout.row1.indexOf(item.id) === 0 ? "1" : "2";
            } else {
              gridColumn = layout.row2.indexOf(item.id) === 0 ? "1" : "2";
            }

            return (
              <motion.div
                key={item.id}
                layoutId={`${id}-${item.id}`}
                onClick={() => handleExpand(item.id)}
                style={{ gridRow, gridColumn } as React.CSSProperties}
                className={cn(
                  "relative cursor-pointer w-full h-full",
                  isSelected ? "z-30" : "z-10"
                )}
                transition={{ layout: { type: "spring", stiffness: 100, damping: 25 } }}
              >
                {/* תמונה */}
                <motion.div
                  layoutId={`${id}-${item.id}-mask`}
                  className="absolute inset-0 overflow-hidden bg-zinc-100"
                  style={{ borderRadius: 18 }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 transition-colors duration-700"
                    style={{ background: isSelected ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.18)" }}
                  />
                </motion.div>

                {/* גרדיאנט תחתי */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: 18,
                    background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)",
                  }}
                />

                {/* טקסט */}
                <motion.div
                  layout="position"
                  className="absolute inset-0 p-4 flex flex-col justify-end text-white z-10 select-none"
                >
                  <h3 className="text-sm font-bold leading-tight" style={{ fontFamily: "var(--font-editorial-ui)" }}>
                    {item.title}
                  </h3>
                  {isSelected && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      {item.subtitle}
                    </motion.p>
                  )}
                </motion.div>

                {/* גבול עדין */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </LayoutGroup>
    </div>
  );
}

export default FluidExpandingGrid;
