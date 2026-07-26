"use client";

import { FileCheck2, Upload, X } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import {
  DOCUMENT_TYPE_LABELS,
  STUDENT_DOCUMENT_ACCEPT,
  validateStudentDocumentFile,
} from "../services/studentDocuments";
import type { StudentDocumentType } from "../types/dashboard";

interface FileUploadProps {
  isUploading: boolean;
  onUpload: (
    documentType: StudentDocumentType,
    customDocumentName: string | null,
    expiresAt: string | null,
    file: File,
  ) => Promise<boolean>;
}

export const acceptedDocumentExtensions = STUDENT_DOCUMENT_ACCEPT;
export { validateStudentDocumentFile as validateDocumentFile };

export default function FileUpload({
  isUploading,
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] =
    useState<StudentDocumentType>("passport");
  const [customName, setCustomName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");

  function selectFile(file: File) {
    const nextError = validateStudentDocumentFile(file);
    setValidationError(nextError);
    setSelectedFile(nextError ? null : file);
  }

  async function submit() {
    if (documentType === "other" && !customName.trim()) {
      setValidationError("Enter a custom document name.");
      return;
    }
    if (!selectedFile) {
      setValidationError("Choose a file to upload.");
      return;
    }

    const succeeded = await onUpload(
      documentType,
      documentType === "other" ? customName.trim() : null,
      expiresAt || null,
      selectedFile,
    );
    if (succeeded) {
      setCustomName("");
      setExpiresAt("");
      setSelectedFile(null);
      setValidationError("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F4F7FA] p-5">
      <label className="block text-sm font-black text-[#071526]">
        Document type
        <select
          value={documentType}
          onChange={(event) =>
            setDocumentType(event.target.value as StudentDocumentType)
          }
          disabled={isUploading}
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#C8A24A]"
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {documentType === "other" ? (
        <label className="mt-4 block text-sm font-black text-[#071526]">
          Custom document name
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            maxLength={150}
            disabled={isUploading}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#C8A24A]"
          />
        </label>
      ) : null}

      <label className="mt-4 block text-sm font-black text-[#071526]">
        Expiration date <span className="font-normal text-slate-500">(optional)</span>
        <input
          type="date"
          value={expiresAt}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setExpiresAt(event.target.value)}
          disabled={isUploading}
          className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#C8A24A]"
        />
      </label>

      <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
        <Upload className="mx-auto text-[#0F2747]" size={28} />
        <p className="mt-3 font-black">PDF, JPG, JPEG, or PNG</p>
        <p className="mt-1 text-sm text-slate-500">Maximum file size: 10 MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="mt-4 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={STUDENT_DOCUMENT_ACCEPT}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) selectFile(file);
          }}
          disabled={isUploading}
          className="hidden"
        />
      </div>

      {selectedFile ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <FileCheck2 className="text-emerald-700" size={20} />
          <p className="min-w-0 flex-1 truncate text-sm font-black">
            {selectedFile.name}
          </p>
          <button
            type="button"
            aria-label="Remove selected file"
            onClick={() => setSelectedFile(null)}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      {validationError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {validationError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={isUploading || !selectedFile}
        className="mt-5 w-full rounded-xl bg-[#C8A24A] px-5 py-4 font-black text-[#071526] disabled:opacity-60"
      >
        {isUploading ? "Uploading securely..." : "Upload Document"}
      </button>
    </div>
  );
}
