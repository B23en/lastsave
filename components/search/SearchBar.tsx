"use client";

import { useEffect, useRef, useState } from "react";
import { useTripStore, type Place } from "@/lib/store/useTripStore";

type Suggestion = {
  id: string;
  name: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
};

type SearchResponse = {
  query: string;
  suggestions: Suggestion[];
};

const DEBOUNCE_MS = 250;

/**
 * 목적지 검색 입력 + 제안 드롭다운. 선택 시 trip store 의 destination 을 업데이트한다.
 */
export function SearchBar() {
  const destination = useTripStore((s) => s.destination);
  const setDestination = useTripStore((s) => s.setDestination);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);

      fetch(`/api/kakao/search?q=${encodeURIComponent(trimmed)}&size=8`, {
        signal: ac.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`search failed: ${res.status}`);
          return res.json() as Promise<SearchResponse>;
        })
        .then((data) => {
          setSuggestions(data.suggestions);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name === "AbortError") return;
          setError("검색 중 문제가 발생했습니다");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (next.trim().length < 2) {
      setSuggestions([]);
      setError(null);
      setOpen(false);
    }
  };

  const choose = (s: Suggestion) => {
    const place: Place = {
      id: s.id,
      name: s.name,
      address: s.address,
      category: s.category,
      coord: { lat: s.lat, lng: s.lng },
    };
    setDestination(place);
    setQuery(s.name);
    setOpen(false);
  };

  const clear = () => {
    setDestination(null);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative w-full max-w-lg">
      <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/95 px-4 py-3 shadow-md backdrop-blur">
        <span aria-hidden className="text-lg">
          🔎
        </span>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="어디로 갈까요? (예: 강남역, 홍대입구역)"
          className="flex-1 bg-transparent text-base outline-none placeholder:text-[color:var(--muted-foreground)]"
          aria-label="목적지 검색"
        />
        {loading && (
          <span className="text-xs text-[color:var(--muted-foreground)]">
            검색 중…
          </span>
        )}
        {destination && (
          <button
            type="button"
            onClick={clear}
            className="rounded-full bg-[color:var(--muted)] px-2 py-1 text-xs text-[color:var(--muted-foreground)]"
            aria-label="목적지 초기화"
          >
            초기화
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || error) && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/95 p-1 text-sm shadow-xl backdrop-blur"
        >
          {error && (
            <li className="px-3 py-2 text-[color:var(--danger)]">{error}</li>
          )}
          {suggestions.map((s) => (
            <li key={s.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => choose(s)}
                className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[color:var(--muted)]"
              >
                <span className="font-medium text-[color:var(--foreground)]">
                  {s.name}
                </span>
                {s.address && (
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    {s.address}
                  </span>
                )}
                {s.category && (
                  <span className="text-[10px] uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    {s.category}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
