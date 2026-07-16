import { createContext, useContext, useState, type ReactNode } from "react";

const SearchCtx = createContext<{ query: string; setQuery: (v: string) => void } | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchCtx.Provider value={{ query, setQuery }}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be inside SearchProvider");
  return ctx;
}
