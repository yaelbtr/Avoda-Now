import { useEffect, useMemo, useRef, useState } from "react";
import { AppLabel } from "@/components/ui";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { CategoryItem } from "@/hooks/useCategories";

interface CategoryAutocompleteProps {
  categories: CategoryItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("he-IL");
}

export default function CategoryAutocomplete({
  categories,
  value,
  onChange,
  label = "קטגוריה",
  required = false,
  placeholder = "חפש או בחר קטגוריה",
  error,
}: CategoryAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === value) ?? null,
    [categories, value]
  );

  const filteredCategories = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return categories;

    return categories.filter((category) => {
      const searchableText = normalizeSearch(`${category.name} ${category.slug}`);
      return searchableText.includes(normalizedQuery);
    });
  }, [categories, query]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const displayValue = isOpen ? query : selectedCategory?.name ?? "";

  const openList = () => {
    setIsOpen(true);
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectCategory = (category: CategoryItem) => {
    onChange(category.slug);
    setQuery("");
    setIsOpen(false);
  };

  const clearCategory = () => {
    onChange("");
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} dir="rtl" className="relative w-full">
      <AppLabel required={required}>{label}</AppLabel>

      <div
        className="flex min-h-11 items-center overflow-hidden rounded-[10px] border bg-white transition-shadow"
        style={{
          borderColor: error ? "#e53e3e" : isOpen ? "oklch(0.55 0.12 140)" : "oklch(0.88 0.04 122)",
          borderWidth: 1.5,
          boxShadow: error
            ? "0 0 0 3px #e53e3e22"
            : isOpen
              ? "0 0 0 3px oklch(0.55 0.12 140 / 0.15)"
              : "none",
        }}
      >
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground"
          onClick={openList}
          aria-label="פתח בחירת קטגוריה"
        >
          <Search className="h-4 w-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-invalid={!!error}
          value={displayValue}
          placeholder={placeholder}
          onFocus={openList}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              setQuery("");
            }
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
        />

        {value ? (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground"
            onClick={clearCategory}
            aria-label="נקה קטגוריה"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground"
            onClick={openList}
            aria-label="פתח רשימת קטגוריות"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-right text-xs font-medium text-red-600">{error}</p>}

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white shadow-xl">
          <div className="max-h-[min(56vh,360px)] overflow-y-auto overscroll-contain p-1.5">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isSelected = category.slug === value;

                return (
                  <button
                    key={category.slug}
                    type="button"
                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted active:bg-muted"
                    }`}
                    onClick={() => selectCategory(category)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {category.icon ?? "💼"}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">{category.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                לא נמצאה קטגוריה מתאימה
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
