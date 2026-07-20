"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  isUploading: boolean;
  onUpload: (documentName: string, file: File) => Promise<void>;
}

const acceptedFileTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const maximumFileSize = 10 * 1024 * 1024;

export default function FileUpload({
  isUploading,
  onUpload,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function validateFile(file: File): string {
    if (!acceptedFileTypes.includes(file.type)) {
      return "Upload a PDF, DOCX, JPG, or PNG file.";
    }

    if (file.size > maximumFileSize) {
      return "The file must be 10 MB or smaller.";
    }

    return "";
  }

  function selectFile(file: File) {
    const nextError = validateFile(file);
    setValidationError(nextError);

    if (nextError) {
      setSelectedFile(null);
      return;
    }

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
    if (!selectedFile || !documentName.trim()) {
      setValidationError("Enter a document name and choose a file.");
      return;
    }

    await onUpload(documentName.trim(), selectedFile);
    setDocumentName("");
    setSelectedFile(null);
    setValidationError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#F4F7FA] p-5">
      <label
        htmlFor="document-name"
        className="text-sm font-black text-[#071526]"
      >
        Document name
      </label>

      <input
        id="document-name"
        value={documentName}
        onChange={(event) => setDocumentName(event.target.value)}
        placeholder="Example: Academic Transcript"
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#C8A24A] focus:ring-2 focus:ring-[#C8A24A]/20"
      />

      <div
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-[#C8A24A] bg-[#C8A24A]/10"
            : "border-slate-300 bg-white"
        }`}
      >
        <Upload className="mx-auto text-[#0F2747]" size={28} />
        <p className="mt-3 font-black text-[#071526]">
          Drag and drop your file here
        </p>
        <p className="mt-1 text-sm text-slate-500">
          PDF, DOCX, JPG, or PNG. Maximum 10 MB.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white"
        >
          Choose File
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {selectedFile && (
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Selected: {selectedFile.name}
        </p>
      )}

      {validationError && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {validationError}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isUploading}
        className="mt-5 w-full rounded-xl bg-[#C8A24A] px-5 py-4 font-black text-[#071526] transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload Document"}
      </button>
    </div>
  );
}
