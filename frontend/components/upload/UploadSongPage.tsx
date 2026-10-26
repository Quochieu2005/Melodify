'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useLoginModal } from '@/components/auth/LoginModalProvider';
import { ApiError, deleteStagedUserAudio, listArtists, listGenres, stageMySongAudio, uploadMySong, type Artist, type GenreRecord } from '@/lib/api';

const acceptedAudioExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.oga', '.opus', '.webm'];
const acceptedAudioFormats = 'MP3, M4A, WAV, FLAC, AAC, OGG/OGA, OPUS, WEBM';
const maxAudioSize = 100 * 1024 * 1024;
const maxCoverSize = 5 * 1024 * 1024;

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

function AudioWaveIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2"><path d="M4 10v4m4-8v12m4-15v18m4-14v10m4-7v4" strokeLinecap="round" /></svg>;
}

function supportedAudio(file: File): boolean {
  const name = file.name.toLowerCase();
  return acceptedAudioExtensions.some((extension) => name.endsWith(extension)) && file.size <= maxAudioSize;
}

function fileSizeLabel(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadSongPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverValidationRef = useRef(0);
  const stageRequestRef = useRef<AbortController | null>(null);
  const { user, authReady, openLogin } = useLoginModal();
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [coverError, setCoverError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stagedUploadToken, setStagedUploadToken] = useState<string | null>(null);
  const [stagingAudio, setStagingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [checkingCover, setCheckingCover] = useState(false);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artistQuery, setArtistQuery] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistResultsTerm, setArtistResultsTerm] = useState('');
  const [genreId, setGenreId] = useState('');
  const [genres, setGenres] = useState<GenreRecord[]>([]);
  const [genresLoaded, setGenresLoaded] = useState(false);
  const [genresError, setGenresError] = useState('');
  const [genresRetry, setGenresRetry] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [moderationRequested, setModerationRequested] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!selectedFile || genresLoaded) return;

    let isCurrent = true;
    void listGenres({ perPage: 50 }).then((response) => {
      if (isCurrent) {
        setGenres(response.data);
        setGenresLoaded(true);
        setGenresError('');
      }
    }).catch((error: unknown) => {
      if (isCurrent) setGenresError(error instanceof Error ? error.message : 'Không thể tải thể loại.');
    });

    return () => {
      isCurrent = false;
    };
  }, [genresLoaded, genresRetry, selectedFile]);

  useEffect(() => {
    const term = artistQuery.trim();
    if (term.length < 2) return;

    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      void listArtists({ query: term, perPage: 8 }).then((response) => {
        if (isCurrent) {
          setArtists(response.data);
          setArtistResultsTerm(term);
        }
      }).catch(() => {
        if (isCurrent) {
          setArtists([]);
          setArtistResultsTerm(term);
        }
      });
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [artistQuery]);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => () => stageRequestRef.current?.abort(), []);

  function selectAudioFile(file: File | undefined) {
    if (!file) return;

    if (!supportedAudio(file)) {
      stageRequestRef.current?.abort();
      stageRequestRef.current = null;
      if (stagedUploadToken) void deleteStagedUserAudio(stagedUploadToken).catch(() => undefined);
      setSelectedFile(null);
      setStagedUploadToken(null);
      setStagingAudio(false);
      setUploadProgress(0);
      setFileError(file.size > maxAudioSize ? 'File âm thanh vượt quá giới hạn 100 MB.' : `Chỉ hỗ trợ các định dạng ${acceptedAudioFormats}.`);
      return;
    }

    stageRequestRef.current?.abort();
    if (stagedUploadToken) void deleteStagedUserAudio(stagedUploadToken).catch(() => undefined);
    const controller = new AbortController();
    stageRequestRef.current = controller;
    setSelectedFile(file);
    setStagedUploadToken(null);
    setStagingAudio(true);
    setUploadProgress(0);
    setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 160));
    setFileError('');
    setUploadError('');
    setSuccessMessage('');

    void stageMySongAudio(file, setUploadProgress, controller.signal).then(({ data }) => {
      if (stageRequestRef.current !== controller) return;
      setStagedUploadToken(data.upload_token);
      setUploadProgress(100);
      window.setTimeout(() => {
        if (stageRequestRef.current === controller) setStagingAudio(false);
      }, 450);
    }).catch((error: unknown) => {
      if (stageRequestRef.current !== controller || (error instanceof DOMException && error.name === 'AbortError')) return;
      setSelectedFile(null);
      setUploadProgress(0);
      setStagingAudio(false);
      setFileError(error instanceof Error ? error.message : 'Không thể tải file nhạc lên. Vui lòng thử lại.');
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectAudioFile(event.target.files?.[0]);
    event.currentTarget.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectAudioFile(event.dataTransfer.files[0]);
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const validationId = ++coverValidationRef.current;
    setCheckingCover(false);
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['jpg', 'jpeg', 'png'].includes(extension ?? '') || (file.type && !['image/jpeg', 'image/png'].includes(file.type))) {
      setCoverFile(null);
      setCoverPreview(null);
      setCoverError('Ảnh bìa chỉ hỗ trợ JPG hoặc PNG.');
      return;
    }
    if (file.size > maxCoverSize) {
      setCoverFile(null);
      setCoverPreview(null);
      setCoverError('Ảnh bìa không được lớn hơn 5 MB.');
      return;
    }

    setCheckingCover(true);
    setCoverError('');
    const temporaryUrl = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      image.src = temporaryUrl;
      await image.decode();
      if (validationId !== coverValidationRef.current) return;
      if (image.naturalWidth < 640 || image.naturalHeight < 640) {
        setCoverFile(null);
        setCoverPreview(null);
        setCoverError('Ảnh bìa cần có kích thước tối thiểu 640 × 640 px.');
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    } catch {
      if (validationId === coverValidationRef.current) {
        setCoverFile(null);
        setCoverPreview(null);
        setCoverError('Không thể đọc ảnh này. Hãy chọn file JPG hoặc PNG khác.');
      }
    } finally {
      URL.revokeObjectURL(temporaryUrl);
      if (validationId === coverValidationRef.current) setCheckingCover(false);
    }
  }

  function cancelUploadForm() {
    stageRequestRef.current?.abort();
    stageRequestRef.current = null;
    if (stagedUploadToken) void deleteStagedUserAudio(stagedUploadToken).catch(() => undefined);
    setSuccessMessage('');
    setSelectedFile(null);
    setStagedUploadToken(null);
    setStagingAudio(false);
    setUploadProgress(0);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverError('');
    setUploadError('');
    setTitle('');
    setArtistName('');
    setArtistId(null);
    setArtistQuery('');
    setGenreId('');
    setTermsAccepted(true);
    setModerationRequested(true);
    setCheckingCover(false);
    coverValidationRef.current += 1;
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      openLogin();
      return;
    }
    if (!selectedFile || !stagedUploadToken || !coverFile || !title.trim() || !artistName.trim() || !genreId || !termsAccepted || !moderationRequested) return;

    setUploading(true);
    setUploadError('');
    setSuccessMessage('');

    try {
      const response = await uploadMySong(stagedUploadToken, {
        title: title.trim(),
        artistName: artistName.trim(),
        artistId,
        genreId,
        coverFile,
      });
      setSuccessMessage(response.message);
      setSelectedFile(null);
      setStagedUploadToken(null);
      setCoverFile(null);
      setCoverPreview(null);
      setTitle('');
      setArtistName('');
      setArtistId(null);
      setArtistQuery('');
      setGenreId('');
      setTermsAccepted(true);
      setModerationRequested(true);
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setUploadError(error instanceof ApiError || error instanceof Error ? error.message : 'Không thể tải bài hát lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  }

  if (!authReady) {
    return <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-7">Đang kiểm tra tài khoản…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#202a28] px-5 py-10 text-white sm:px-7">
        <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-3xl font-extrabold">Đăng nhập để tải nhạc lên</h1>
          <p className="mt-3 text-white/60">Bài hát bạn gửi sẽ được lưu vào tài khoản và chờ xét duyệt.</p>
          <button type="button" onClick={() => openLogin()} className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-bold text-[#07363a] hover:bg-cyan-300">Đăng nhập</button>
        </section>
      </main>
    );
  }

  const artistResults = artistResultsTerm === artistQuery.trim() ? artists : [];
  const canSubmit = Boolean(selectedFile && stagedUploadToken && coverFile && title.trim() && artistName.trim() && genreId && termsAccepted && moderationRequested && !checkingCover && !uploading && !stagingAudio);

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#202a28] px-5 pb-10 pt-5 text-white sm:px-7 lg:px-7">
      <div className="w-full max-w-[1582px]">
        <h1 className="text-[30px] font-extrabold tracking-[-0.04em]">Đăng tải nhạc</h1>

        {successMessage ? (
          <section role="status" aria-live="polite" className="mx-auto flex min-h-[620px] max-w-[620px] flex-col items-center justify-center px-4 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-white/10 text-[#08c6d9]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 fill-none stroke-current stroke-[2.5]"><path d="m5 12.5 4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h2 className="mt-2 text-xl font-extrabold">Tải lên thành công</h2>
            <p className="mt-2 text-sm text-[#9fa8ad]">Bài hát của bạn sẽ được hệ thống xem xét trong vòng 72 giờ.</p>
            <p className="mt-4 max-w-[470px] text-sm leading-6 text-[#9fa8ad]">Lưu ý: bài hát vi phạm Thỏa thuận sử dụng hoặc có hình ảnh không phù hợp sẽ bị gỡ khỏi hệ thống.</p>
            <span className="sr-only">{successMessage}</span>
            <div className="mt-7 flex w-full max-w-[440px] flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => router.push('/me/uploaded')} className="h-12 flex-1 rounded-full bg-white/10 px-5 text-sm font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300">Nghe bài hát đã tải lên</button>
              <button type="button" onClick={cancelUploadForm} className="h-12 flex-1 rounded-full bg-[#08c6d9] px-5 text-sm font-bold text-[#07363a] transition-colors hover:bg-[#22d7e7] focus-visible:outline-2 focus-visible:outline-white">Tải lên thêm</button>
            </div>
          </section>
        ) : stagingAudio ? (
          <section className="mt-6 flex min-h-[500px] flex-col items-center justify-start rounded-xl border border-dashed border-white/75 bg-gradient-to-b from-white/[0.035] to-black/20 px-5 pt-12 text-center" aria-live="polite">
            <UploadIcon />
            <h2 className="mt-5 text-[22px] font-bold tracking-[-0.03em]">Tải tệp lên</h2>
            <p className="mt-2 max-w-xl truncate text-sm text-white/65">{selectedFile?.name}</p>
            <p className="mt-1 text-xs text-[#9fa8ad]">{fileSizeLabel(selectedFile?.size ?? 0)} · {selectedFile?.name.split('.').pop()?.toUpperCase()}</p>
            <div
              className="relative mt-7 h-12 w-full max-w-[400px] overflow-hidden rounded-full bg-white/10 p-1"
              role="progressbar"
              aria-label="Tiến độ tải tệp nhạc lên"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#08c6d9] to-[#8de5ad] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.max(uploadProgress, 5)}%` }} />
              <span className="absolute inset-0 grid place-items-center whitespace-nowrap px-3 text-sm font-bold text-white">{uploadProgress === 95 ? 'Đang hoàn tất lưu tệp…' : `Đang tải lên … ${uploadProgress}%`}</span>
            </div>
            <p className="mt-4 text-xs text-[#9fa8ad]">Vui lòng giữ trang này mở cho đến khi tải xong.</p>
            <button type="button" onClick={cancelUploadForm} className="mt-6 h-11 min-w-36 rounded-full bg-white/10 px-6 text-sm font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300">Hủy tải lên</button>
          </section>
        ) : !selectedFile ? (
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
              <p>Format support: {acceptedAudioFormats}</p>
              <p>Maximum file size: 100 MB</p>
              <p>Uploaded songs are private until approved</p>
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
            {fileError && <p role="alert" className="mt-5 text-sm font-semibold text-red-300">{fileError}</p>}
            <input ref={inputRef} type="file" accept={acceptedAudioExtensions.join(',')} onChange={handleInputChange} className="hidden" />
            <div className="mt-auto mb-5 flex max-w-[560px] items-start gap-2 pt-8 text-left text-[11px] leading-4 text-[#9fa8ad]">
              <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border border-[#9fa8ad] text-[9px]">i</span>
              <p>Songs that violate the terms of <span className="text-cyan-300">User Agreement</span> will be removed.</p>
            </div>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-black/15 p-5 sm:p-7 lg:p-8">
            <p className="mb-6 text-sm font-medium text-white/55">Chỉnh sửa thông tin bài hát tải lên</p>
            <form onSubmit={submitUpload}>
              <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,600px)] lg:gap-8">
                <div>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="group relative grid aspect-square w-full max-w-[320px] place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/10 text-center outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    aria-label={coverPreview ? 'Thay đổi ảnh bìa' : 'Chọn ảnh bìa'}
                  >
                    {coverPreview ? (
                      <Image src={coverPreview} alt="Ảnh bìa bài hát" fill unoptimized className="object-cover" sizes="320px" />
                    ) : (
                      <span className="flex flex-col items-center gap-3 px-6 text-white/60"><span className="grid size-16 place-items-center rounded-full bg-white/10 text-4xl font-light">+</span><span className="text-sm font-semibold">Chọn ảnh bìa</span></span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{coverPreview ? 'Thay đổi ảnh bìa' : 'Chọn ảnh bìa'}</span>
                  </button>
                  <input ref={coverInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => void handleCoverChange(event)} className="hidden" />
                  <div className="mt-3 space-y-1 text-xs leading-5 text-[#9fa8ad]">
                    <p>Định dạng: JPG, PNG</p>
                    <p>Kích thước tối đa: 5 MB</p>
                    <p>Kích thước tối thiểu: 640 × 640 px</p>
                  </div>
                  {checkingCover && <p className="mt-2 text-xs text-cyan-200">Đang kiểm tra ảnh…</p>}
                  {coverError && <p role="alert" className="mt-2 text-xs font-semibold text-red-300">{coverError}</p>}
                </div>

                <div className="min-w-0">
                  <div className="mb-6 flex min-h-[58px] items-center gap-3 border-b border-white/10 pb-5">
                    <span className="grid size-14 shrink-0 place-items-center rounded-md bg-white/15 text-white/55"><AudioWaveIcon /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-white/45">{fileSizeLabel(selectedFile.size)} · {selectedFile.name.split('.').pop()?.toUpperCase()}</p>
                    </div>
                    <button type="button" onClick={() => inputRef.current?.click()} className="shrink-0 text-xs font-semibold text-cyan-300 hover:text-cyan-200">Thay file</button>
                  </div>
                  <input ref={inputRef} type="file" accept={acceptedAudioExtensions.join(',')} onChange={handleInputChange} className="hidden" />

                  <label htmlFor="upload-song-title" className="block text-xs font-semibold text-white">Tên bài hát</label>
                  <input
                    id="upload-song-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    required
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.16] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
                    placeholder="Nhập tên bài hát"
                  />
                  <p className="mt-1 text-right text-[11px] text-[#9fa8ad]">{title.length}/160</p>

                  <label htmlFor="upload-song-artist" className="mt-4 block text-xs font-semibold text-white">Tên nghệ sĩ</label>
                  <div className="relative mt-2">
                    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.16] px-3 py-2 focus-within:border-cyan-300">
                      {artistId && <span className="inline-flex items-center gap-2 rounded-md bg-black/30 px-2 py-1 text-sm text-white">{artistName}<button type="button" aria-label="Xóa nghệ sĩ đã chọn" onClick={() => { setArtistId(null); setArtistName(''); setArtistQuery(''); }} className="text-white/65 hover:text-white">×</button></span>}
                      <input
                        id="upload-song-artist"
                        value={artistId ? '' : artistQuery}
                        onChange={(event) => {
                          setArtistId(null);
                          setArtistName(event.target.value);
                          setArtistQuery(event.target.value);
                        }}
                        required={!artistId}
                        className="min-w-[150px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                        placeholder={artistId ? 'Tìm nghệ sĩ khác…' : 'Tìm hoặc nhập tên nghệ sĩ'}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={artistResults.length > 0 && artistResultsTerm === artistQuery.trim()}
                        aria-controls="upload-artist-options"
                      />
                    </div>
                    {artistQuery.trim().length >= 2 && artistResultsTerm === artistQuery.trim() && artistResults.length > 0 && (
                      <ul id="upload-artist-options" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-[#26312e] p-1 shadow-xl">
                        {artistResults.map((artist) => (
                          <li key={artist.id} role="option" aria-selected={false}>
                            <button type="button" onClick={() => { setArtistId(artist.id); setArtistName(artist.name); setArtistQuery(''); }} className="w-full rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/10">{artist.name}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">Chọn nghệ sĩ gợi ý để liên kết hồ sơ, hoặc nhập tên nghệ sĩ.</p>

                  <label htmlFor="upload-song-genre" className="mt-5 block text-xs font-semibold text-white">Thể loại</label>
                  <select
                    id="upload-song-genre"
                    value={genreId}
                    onChange={(event) => setGenreId(event.target.value)}
                    required
                    disabled={!genresLoaded || genres.length === 0}
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#424846] px-3 text-sm text-white outline-none focus:border-cyan-300 disabled:cursor-wait disabled:opacity-70"
                  >
                    <option value="" className="bg-[#26312e]">{genresLoaded ? 'Chọn thể loại' : 'Đang tải thể loại…'}</option>
                    {genres.map((genre) => <option key={genre.id} value={genre.id} className="bg-[#26312e]">{genre.name}</option>)}
                  </select>
                  {genresError && <p role="alert" className="mt-2 text-xs text-red-300">{genresError} <button type="button" onClick={() => { setGenresError(''); setGenresRetry((version) => version + 1); }} className="underline">Thử lại</button></p>}
                  {genresLoaded && genres.length === 0 && !genresError && <p className="mt-2 text-xs text-amber-200">Chưa có thể loại đang hoạt động để chọn.</p>}

                  <div className="mt-6 space-y-4 text-xs leading-5 text-white/80">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#08c6d9]" />
                      <span>Tôi đồng ý với <span className="font-semibold text-cyan-300">Chính sách bảo mật</span> và <span className="font-semibold text-cyan-300">Thỏa thuận sử dụng</span> của Melodify.</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={moderationRequested} onChange={(event) => setModerationRequested(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#08c6d9]" />
                      <span>Đăng ký kiểm duyệt bài hát trước khi phát hành.</span>
                    </label>
                  </div>

                  {uploadError && <p role="alert" className="mt-5 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{uploadError}</p>}
                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={cancelUploadForm} disabled={uploading} className="h-12 flex-1 rounded-full bg-white/10 text-sm font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-50">Hủy</button>
                    <button type="submit" disabled={!canSubmit} className="h-12 flex-1 rounded-full bg-[#08c6d9] text-sm font-bold text-[#07363a] transition-colors hover:bg-[#22d7e7] focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50">{uploading ? 'Đang lưu…' : 'Lưu'}</button>
                  </div>
                  {!termsAccepted && <p className="mt-3 text-center text-xs text-amber-200">Đồng ý điều khoản để tiếp tục.</p>}
                  {!moderationRequested && <p className="mt-2 text-center text-xs text-amber-200">Bài hát cần được đăng ký kiểm duyệt trước khi gửi.</p>}
                </div>
              </div>
            </form>
          </section>
        )}

      </div>
    </main>
  );
}
