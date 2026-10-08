'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';

const acceptedExtensions = ['.mp3', '.wav', '.flac'];
const maxFileSize = 120 * 1024 * 1024;

function UploadIcon() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="size-16">
      <path d="M24 60h35a14 14 0 0 0 1-28 22 22 0 0 0-41-3A16 16 0 0 0 24 60Z" fill="url(#upload-gradient)" />
      <path d="M40 57V30m0 0-12 12m12-12 12 12" fill="none" stroke="#c7f5d9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      <defs>
        <linearGradient id="upload-gradient" x1="16" x2="64" y1="23" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#91e277" />
          <stop offset="1" stopColor="#32bce5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function isSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  return acceptedExtensions.some((extension) => name.endsWith(extension)) && file.size <= maxFileSize;
}

export default function UploadSongPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function selectFile(file: File | undefined) {
    if (!file) return;

    if (!isSupportedFile(file)) {
      setSelectedFile(null);
      setError(true);
      return;
    }

    setSelectedFile(file);
    setError(false);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-8 pt-5 text-white sm:px-7 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.04em]">Upload song</h1>

        <div
          role="region"
          aria-label="Upload song file"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={[
            'mt-6 flex min-h-[500px] flex-col items-center justify-start rounded-xl border border-dashed px-5 pt-10 text-center outline-none transition-colors',
            isDragging ? 'border-cyan-300 bg-white/10' : 'border-white/75 bg-gradient-to-b from-white/[0.035] to-black/20',
            'focus-visible:ring-2 focus-visible:ring-cyan-300',
          ].join(' ')}
        >
          <UploadIcon />
          <p className="mt-4 text-[22px] font-bold tracking-[-0.03em]">Upload a file or drag and drop here</p>
          <div className="mt-4 space-y-1 text-xs text-[#9fa8ad]">
            <p>Format support: Mp3, Wav, Flac</p>
            <p>Maximum: 120MB, bit-rate 128kbps at least</p>
            <p>Approval time: 7-12 hours</p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-6 h-12 w-full max-w-[380px] rounded-full bg-[#08c6d9] text-sm font-bold text-[#07363a] outline-none transition-colors hover:bg-[#22d7e7] focus-visible:ring-2 focus-visible:ring-white"
          >
            Upload file
          </button>

          {error ? (
            <p className="mt-7 text-xs font-semibold text-red-400">Incorrect format, please try uploading again.</p>
          ) : selectedFile ? (
            <p className="mt-7 max-w-full truncate text-xs font-semibold text-cyan-300">Selected: {selectedFile.name}</p>
          ) : null}

          <input ref={inputRef} type="file" accept="audio/*,.mp3,.wav,.flac" onChange={handleInputChange} className="hidden" />

          <div className="mt-auto mb-5 flex max-w-[560px] items-start gap-2 text-left text-[11px] leading-4 text-[#9fa8ad]">
            <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border border-[#9fa8ad] text-[9px]">i</span>
            <p>
              Songs that violate the terms of <button type="button" onClick={(event) => event.stopPropagation()} className="text-cyan-300 hover:underline">User Agreement</button> will be removed, and the account will be permanently deleted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
