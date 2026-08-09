"use client";

import { AlertCircle, Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { searchPrograms, type ProgramOption } from "../api";

export default function ProgramSelector({
  universityId,
  value,
  selectedName,
  onSelect,
  disabled,
}: {
  universityId: string;
  value: string;
  selectedName: string;
  onSelect: (program: ProgramOption | null, inputName: string) => void;
  disabled: boolean;
}) {
  const listId = useId();
  const [input, setInput] = useState(selectedName);
  const [options, setOptions] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const request = useRef(0);
  useEffect(() => {
    if (!open || !universityId || (value && input === selectedName)) return;
    const controller = new AbortController();
    const requestId = ++request.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchPrograms(
          universityId,
          input,
          controller.signal,
        );
        if (request.current === requestId) {
          setOptions(results);
          setActiveIndex(results.length ? 0 : -1);
        }
      } catch (cause) {
        if (!controller.signal.aborted && request.current === requestId)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to search programs.",
          );
      } finally {
        if (!controller.signal.aborted && request.current === requestId)
          setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [input, open, selectedName, universityId, value]);
  const choose = (option: ProgramOption) => {
    setInput(option.name);
    setOpen(false);
    onSelect(option, option.name);
  };
  const unavailable = disabled || !universityId;
  return (
    <div className="relative text-sm font-bold">
      <label htmlFor={`${listId}-input`}>Program selector</label>
      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
        />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          value={input}
          disabled={unavailable}
          required
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setInput(event.target.value);
            setOpen(true);
            onSelect(null, event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) =>
                Math.min(index + 1, options.length - 1),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && open && activeIndex >= 0) {
              event.preventDefault();
              choose(options[activeIndex]);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={
            universityId
              ? "Search active programs"
              : "Select a university first"
          }
          className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm disabled:opacity-60"
        />
        {loading ? (
          <Loader2
            aria-label="Loading programs"
            className="absolute right-3 top-3.5 h-4 w-4 animate-spin"
          />
        ) : null}
      </div>
      {open && universityId ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
        >
          {error ? (
            <div role="alert" className="flex gap-2 p-3 text-rose-700">
              <AlertCircle className="h-4 w-4" />
              Unable to load programs.
            </div>
          ) : loading ? (
            <div className="p-3 text-slate-500">Searching programs…</div>
          ) : options.length === 0 ? (
            <div className="p-3 text-slate-500">No programs found.</div>
          ) : (
            options.map((option, index) => (
              <button
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                key={option.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`block w-full rounded-lg px-3 py-2 text-left ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <span className="block font-bold">{option.name}</span>
                <span className="block text-xs font-normal text-slate-500">
                  {option.program_code ? `${option.program_code} · ` : ""}
                  {option.credential_level.replaceAll("_", " ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
