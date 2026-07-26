"use client";

import { Edit3, Loader2, Pin, Plus, RefreshCw, Search, Shield, StickyNote, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { StudentNoteType, StudentNoteWithAuthor } from "@/app/scholar-dashboard/types/dashboard";

import { useAdvisorNotes } from "../hooks/useAdvisorNotes";
import { NOTE_TYPE_LABELS } from "../services/studentNotes";

const FILTER_TYPES: Array<StudentNoteType | "all"> = [
  "all", "general", "academic", "financial", "visa",
  "communication", "warning", "follow_up",
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

function NoteForm({
  note,
  busy,
  onCancel,
  onSave,
}: {
  note?: StudentNoteWithAuthor;
  busy: boolean;
  onCancel?: () => void;
  onSave: (title: string, body: string, noteType: StudentNoteType) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [noteType, setNoteType] = useState<StudentNoteType>(note?.note_type ?? "general");

  async function submit() {
    if (title.trim().length < 2 || body.trim().length < 2) return;
    if (await onSave(title.trim(), body.trim(), noteType)) {
      setTitle("");
      setBody("");
      setNoteType("general");
      onCancel?.();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Note title" className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-semibold outline-none focus:border-[#C8A24A]" />
        <select value={noteType} onChange={(event) => setNoteType(event.target.value as StudentNoteType)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
          {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={note ? 4 : 5} placeholder="Record an internal observation..." className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-[#C8A24A]" />
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy || title.trim().length < 2 || body.trim().length < 2} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          {note ? "Save Changes" : "Add Internal Note"}
        </button>
        {onCancel ? <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 text-sm font-bold">Cancel</button> : null}
      </div>
    </div>
  );
}

export default function StudentNotesCard({
  studentProfileId,
  studentName,
}: {
  studentProfileId: string;
  studentName: string;
}) {
  const { notes, isLoading, isCreating, busyNoteId, error, successMessage, refresh, create, edit, pin, remove } = useAdvisorNotes(studentProfileId);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<StudentNoteType | "all">("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return notes.filter((note) =>
      (type === "all" || note.note_type === type)
      && (!pinnedOnly || note.is_pinned)
      && (!term || note.title.toLocaleLowerCase().includes(term) || note.body.toLocaleLowerCase().includes(term)),
    );
  }, [notes, pinnedOnly, search, type]);

  return (
    <section className="w-full min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]"><Shield size={16} /> Internal only</p>
          <h2 className="mt-2 text-2xl font-black text-[#071526]">{studentName}&apos;s Notes</h2>
          <p className="mt-1 text-sm text-slate-500">{notes.length} active notes · hidden from students</p>
        </div>
        <button type="button" onClick={() => void refresh()} aria-label="Refresh notes" className="rounded-xl border border-slate-200 p-3"><RefreshCw className={isLoading ? "animate-spin" : ""} size={18} /></button>
      </div>

      {error || successMessage ? <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{error || successMessage}</p> : null}

      <div className="mt-6"><NoteForm busy={isCreating} onSave={(title, body, noteType) => create({ title, body, noteType })} /></div>

      <div className="mt-5 space-y-3">
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or body" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" />
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.map((value) => <button key={value} type="button" onClick={() => setType(value)} className={`rounded-full px-3 py-1.5 text-xs font-black ${type === value ? "bg-[#0F2747] text-white" : "bg-slate-100 text-slate-600"}`}>{value === "all" ? "All" : NOTE_TYPE_LABELS[value]}</button>)}
          <button type="button" onClick={() => setPinnedOnly((current) => !current)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${pinnedOnly ? "bg-[#C8A24A] text-[#071526]" : "bg-slate-100 text-slate-600"}`}><Pin size={12} /> Pinned only</button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? <p className="rounded-2xl border p-6 text-sm text-slate-500">Loading authorized internal notes...</p> : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center"><StickyNote className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-500">No matching notes.</p></div>
        ) : filtered.map((note) => editingId === note.id ? (
          <NoteForm key={note.id} note={note} busy={busyNoteId === note.id} onCancel={() => setEditingId(null)} onSave={(title, body, noteType) => edit({ noteId: note.id, title, body, noteType })} />
        ) : (
          <article key={note.id} className={`rounded-2xl border p-5 ${note.is_pinned ? "border-[#C8A24A] bg-amber-50/30" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-[#071526]">{note.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide">{NOTE_TYPE_LABELS[note.note_type]}</span>
                  {note.is_pinned ? <span className="inline-flex items-center gap-1 rounded-full bg-[#C8A24A] px-2 py-1 text-[10px] font-black uppercase"><Pin size={10} /> Pinned</span> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">By {note.author.display_name} · {formatDate(note.created_at)}{note.updated_at !== note.created_at ? ` · Updated ${formatDate(note.updated_at)}` : ""}</p>
              </div>
              <div className="flex">
                <button type="button" disabled={busyNoteId === note.id} onClick={() => void pin(note.id, !note.is_pinned)} aria-label={note.is_pinned ? "Unpin note" : "Pin note"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pin size={16} /></button>
                <button type="button" onClick={() => setEditingId(note.id)} aria-label="Edit note" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={16} /></button>
                <button type="button" disabled={busyNoteId === note.id} onClick={() => window.confirm("Remove this internal note?") && void remove(note.id)} aria-label="Delete note" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">{busyNoteId === note.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}</button>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
          </article>
        ))}
      </div>
      {(search || type !== "all" || pinnedOnly) ? <button type="button" onClick={() => { setSearch(""); setType("all"); setPinnedOnly(false); }} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><X size={14} /> Clear filters</button> : null}
    </section>
  );
}
