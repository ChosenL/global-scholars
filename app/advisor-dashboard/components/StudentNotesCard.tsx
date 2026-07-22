"use client";

import { Plus, StickyNote, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export interface AdvisorNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface StudentNotesCardProps {
  notes?: AdvisorNote[];
  onAddNote?: (title: string, content: string) => void;
  onDeleteNote?: (id: string) => void;
}

const DEFAULT_NOTES: AdvisorNote[] = [
  {
    id: "1",
    title: "Initial Consultation",
    content:
      "Student is interested in Computer Science programs in Canada. Wants Fall intake.",
    createdAt: "2026-07-15",
  },
  {
    id: "2",
    title: "Documents Reminder",
    content:
      "Need updated financial statement before application submission.",
    createdAt: "2026-07-17",
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function StudentNotesCard({
  notes = DEFAULT_NOTES,
  onAddNote,
  onDeleteNote,
}: StudentNotesCardProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
    [notes],
  );

  function handleSubmit() {
    if (!title.trim() || !content.trim()) return;

    onAddNote?.(title.trim(), content.trim());

    setTitle("");
    setContent("");
  }

  return (
    <section className="w-full min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Advisor Notes
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071526]">
            Private Notes
          </h2>
        </div>

        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
          {notes.length} Notes
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none transition focus:border-[#C8A24A]"
        />

        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your advisor note..."
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#C8A24A]"
        />

        <button
          type="button"
          onClick={handleSubmit}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 font-bold text-white transition hover:bg-[#173B68]"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {sortedNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
            <StickyNote className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-4 font-semibold text-slate-500">
              No advisor notes yet.
            </p>
          </div>
        ) : (
          sortedNotes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-slate-200 p-5 transition hover:border-[#C8A24A]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#071526]">
                    {note.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(note.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteNote?.(note.id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">
                {note.content}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
