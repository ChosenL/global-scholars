"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { FileCheck2, Upload, X } from "lucide-react";

interface FileUploadProps {
  isUploading: boolean;
  onUpload: (documentName: string, file: File) => Promise<void>;
}

export const acceptedDocumentExtensions = ".pdf,.docx,.jpg,.jpeg,.png";
export const maximumDocumentFileSize = 10 * 1024 * 1024;

const acceptedFileTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export function validateDocumentFile(file: File): string {
  if (!acceptedFileTypes.has(file.type)) {
    return "Upload a PDF, DOCX, JPG, or PNG file.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  if (file.size > maximumDocumentFileSize) {
    return "The file must be 10 MB or smaller.";
  }

  return "";
}

function formatSelectedFileSize(fileSize: number): string {
  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({
  isUploading,
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function clearSelectedFile() {
    setSelectedFile(null);
    setValidationError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function selectFile(file: File) {
    const nextError = validateDocumentFile(file);

    if (nextError) {
      setSelectedFile(null);
      setValidationError(nextError);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setValidationError("");
    setSelectedFile(file);

    if (!documentName.trim()) {
      setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      selectFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      selectFile(file);
    }
  }

  async function handleSubmit() {
    if (!documentName.trim()) {
      setValidationError("Enter a clear document name.");
      return;
    }

    if (!selectedFile) {
      setValidationError("Choose a file to upload.");
      return;
    }

    try {
      await onUpload(documentName.trim(), selectedFile);
      setDocumentName("");
      clearSelectedFile();
    } catch {
      // The parent hook displays the upload error.
    }
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#F4F7FA] p-4 sm:p-5">
      <label
        htmlFor="document-name"
        className="block text-sm font-black text-[#071526]"
      >
        Document name
      </label>

      <input
        id="document-name"
        value={documentName}
        onChange={(event) => {
          setDocumentName(event.target.value);
          setValidationError("");
        }}
        placeholder="Example: Academic Transcript"
        disabled={isUploading}
        className="mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20 disabled:opacity-60"
      />

      <div
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={`mt-4 w-full min-w-0 overflow-hidden rounded-2xl border-2 border-dashed px-4 py-6 text-center transition sm:p-6 ${
          isDragging
            ? "border-[#C8A24A] bg-[#C8A24A]/10"
            : "border-slate-300 bg-white"
        }`}
      >
        <Upload className="mx-auto text-[#0F2747]" size={28} />

        <p className="mt-3 break-words font-black text-[#071526]">
          Drag and drop your file here
        </p>

        <p className="mt-1 break-words text-sm leading-6 text-slate-500">
          PDF, DOCX, JPG, or PNG. Maximum 10 MB.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="mt-4 inline-flex min-w-[140px] items-center justify-center whitespace-nowrap rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Choose File
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={acceptedDocumentExtensions}
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
        />
      </div>

      {selectedFile && (
        <div className="mt-4 flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <FileCheck2 className="shrink-0 text-emerald-700" size={20} />

          <div className="min-w-0 flex-1 overflow-hidden">
            <p
              className="block w-full truncate text-sm font-black text-emerald-900"
              title={selectedFile.name}
            >
              {selectedFile.name}
            </p>

            <p className="text-xs font-semibold text-emerald-700">
              {formatSelectedFileSize(selectedFile.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={clearSelectedFile}
            disabled={isUploading}
            className="shrink-0 rounded-lg p-2 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            aria-label="Remove selected file"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {validationError && (
        <p
          className="mt-3 break-words text-sm font-semibold text-red-700"
          role="alert"
        >
          {validationError}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isUploading || !selectedFile || !documentName.trim()}
        className="mt-5 flex w-full min-w-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#C8A24A] px-5 py-4 text-center font-black text-[#071526] transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload Document"}
      </button>
    </div>
  );
}