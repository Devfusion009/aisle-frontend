import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  KeyboardEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  SendHorizontal,
  Paperclip,
  Loader2,
  X,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Inline image payload sent with a chat message. `dataBase64` is the raw
 * base64 — no `data:` URI prefix — matching the backend DTO.
 */
export interface ChatImage {
  name: string;
  mimeType: string;
  dataBase64: string;
}

/** UI-only representation of an image being staged for send. */
interface PendingImage {
  id: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  sizeBytes: number;
  dataBase64?: string;
  status: 'reading' | 'ready' | 'error';
  error?: string;
}

export interface ChatInputProps {
  onSend: (message: string, images?: ChatImage[]) => Promise<void>;
  isLoading: boolean;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB binary — real phones often ship 10+ MB HEIC/JPEG
const ACCEPTED_MIME = /^image\/(png|jpe?g|webp|gif|bmp|tiff|heic|heif)$/i;

/**
 * Target downscale dimensions. Anything larger than 1600px on its longest
 * edge is resized — this keeps OCR quality high while shrinking 10 MB phone
 * photos down to ~300 KB JPEGs, which in turn keeps the JSONB attachment
 * column small and the POST payload fast.
 */
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
// Animated GIFs and tiny icons should pass through unchanged.
const SKIP_DOWNSCALE_MIME = /^image\/(gif|svg\+xml)$/i;

let tempIdCounter = 0;
const nextTempId = () => `img-${Date.now()}-${++tempIdCounter}`;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Read a File as a base64-encoded string with no data-URI prefix. Rejects on
 * read errors so callers can surface a per-file error to the user.
 */
const readFileAsBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(blob);
  });

/**
 * Downscale and recompress a File if it exceeds MAX_IMAGE_DIMENSION on its
 * longest edge. Returns an object with the payload ready to send to the
 * backend (base64, mime type, suggested filename) and the raw Blob (for
 * preview URLs). Returns null if the file should be sent unchanged.
 *
 * Runs entirely in the browser via an OffscreenCanvas / HTMLCanvasElement —
 * no network round-trip. This is what chatgpt.com does on the client so
 * 12 MB phone photos become ~400 KB JPEGs without visible quality loss.
 */
async function maybeDownscale(
  file: File,
): Promise<{ blob: Blob; mimeType: string; name: string } | null> {
  if (SKIP_DOWNSCALE_MIME.test(file.type)) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC / exotic formats may fail here — send the original file and let
    // the server deal with format-specific behaviour.
    return null;
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  if (longest <= MAX_IMAGE_DIMENSION) {
    bitmap.close();
    return null;
  }

  const scale = MAX_IMAGE_DIMENSION / longest;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }
  // White background so JPEG-encoded transparent PNGs don't go black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return null;

  // Rename xxx.png → xxx.jpg so the filename matches the new mime type.
  const dot = file.name.lastIndexOf('.');
  const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;
  return { blob, mimeType: 'image/jpeg', name: `${baseName}.jpg` };
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<PendingImage[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref mirror of `images` so async FileReader callbacks always see the latest
  // list without the effect-dependency churn of useState.
  const imagesRef = useRef<PendingImage[]>([]);
  const dragCounterRef = useRef(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    // Revoke blob URLs when the component unmounts so we don't leak memory.
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  const showWarning = useCallback((message: string) => {
    setWarning(message);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarning(null), 4000);
  }, []);

  /**
   * Validate, preview, and base64-encode incoming files. Enforces the
   * MAX_IMAGES cap across whatever is already staged, silently drops
   * non-image mime types, and surfaces a single toast-style warning when
   * anything is rejected.
   */
  const handleFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList) return;
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const current = imagesRef.current;
      const remainingSlots = MAX_IMAGES - current.length;

      if (remainingSlots <= 0) {
        showWarning(`You can attach up to ${MAX_IMAGES} images per message.`);
        return;
      }

      const accepted: PendingImage[] = [];
      const rejections: string[] = [];

      for (const file of files) {
        if (accepted.length >= remainingSlots) {
          rejections.push(`Only ${MAX_IMAGES} images allowed (ignored "${file.name}")`);
          continue;
        }
        if (!ACCEPTED_MIME.test(file.type)) {
          rejections.push(`"${file.name}" is not an image`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          rejections.push(`"${file.name}" exceeds ${formatBytes(MAX_IMAGE_BYTES)}`);
          continue;
        }
        const id = nextTempId();
        accepted.push({
          id,
          name: file.name || 'pasted-image',
          mimeType: file.type,
          previewUrl: URL.createObjectURL(file),
          sizeBytes: file.size,
          status: 'reading',
        });

        void (async (pendingId: string, pendingFile: File) => {
          try {
            // Downscale + recompress big phone photos before base64-encoding.
            // Falls through to the original file when downscaling isn't
            // needed or the format is unsupported by the browser canvas.
            const scaled = await maybeDownscale(pendingFile);
            const blob: Blob = scaled?.blob ?? pendingFile;
            const mimeType = scaled?.mimeType ?? pendingFile.type;
            const name = scaled?.name ?? pendingFile.name ?? 'pasted-image';
            const dataBase64 = await readFileAsBase64(blob);
            setImages((prev) =>
              prev.map((p) =>
                p.id === pendingId
                  ? { ...p, status: 'ready', dataBase64, mimeType, name, sizeBytes: blob.size }
                  : p,
              ),
            );
          } catch (err) {
            setImages((prev) =>
              prev.map((p) =>
                p.id === pendingId
                  ? {
                      ...p,
                      status: 'error',
                      error: err instanceof Error ? err.message : 'Read failed',
                    }
                  : p,
              ),
            );
          }
        })(id, file);
      }

      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
      }
      if (rejections.length > 0) {
        showWarning(rejections[0]);
      }
    },
    [showWarning],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    const trimmed = input.trim();
    const readyImages = images.filter((i) => i.status === 'ready' && i.dataBase64);

    // Require either non-empty text or at least one ready image.
    if (!trimmed && readyImages.length === 0) return;

    // Block while any image is still being base64-encoded.
    if (images.some((i) => i.status === 'reading')) {
      showWarning('Still processing images — try again in a moment.');
      return;
    }

    const payload: ChatImage[] = readyImages.map((i) => ({
      name: i.name,
      mimeType: i.mimeType,
      dataBase64: i.dataBase64!,
    }));

    // Reset UI state before the async call so the chat list feels snappy.
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setInput('');
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await onSend(trimmed, payload.length > 0 ? payload : undefined);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && ACCEPTED_MIME.test(item.type)) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset so the same file can be re-selected after removal.
    e.target.value = '';
  };

  // Drag counter pattern: `dragenter` / `dragleave` fire for every child node
  // as the pointer moves, so a naive setIsDragging flicks on/off rapidly.
  // Incrementing on enter and decrementing on leave gives us a single stable
  // "is the drag anywhere over the form" flag.
  const handleDragEnter = (e: DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLFormElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const readyCount = images.filter((i) => i.status === 'ready').length;
  const readingCount = images.filter((i) => i.status === 'reading').length;
  const canSubmit =
    !isLoading && readingCount === 0 && (input.trim().length > 0 || readyCount > 0);

  return (
    <div className="p-4 md:p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 sticky bottom-0 z-10 w-full shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
      <form
        onSubmit={handleSubmit}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900 rounded-3xl border shadow-sm transition-all focus-within:shadow-md focus-within:border-purple-300 dark:focus-within:border-purple-700/50 focus-within:ring-4 focus-within:ring-purple-500/10 dark:focus-within:ring-purple-500/10 ${
          isDragging
            ? 'border-purple-400 dark:border-purple-500 ring-4 ring-purple-500/10'
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-purple-50/90 dark:bg-purple-950/80 border-2 border-dashed border-purple-400 dark:border-purple-500 pointer-events-none">
            <ImageIcon className="h-7 w-7 text-purple-600 dark:text-purple-300 mb-1" />
            <p className="text-sm font-medium text-purple-700 dark:text-purple-200">
              Drop up to {MAX_IMAGES} images to attach
            </p>
          </div>
        )}

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  className="h-16 w-16 object-cover"
                />
                {img.status === 'reading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                )}
                {img.status === 'error' && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-red-600/60"
                    title={img.error}
                  >
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  aria-label={`Remove ${img.name}`}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-[10px] text-white px-1 py-0.5 truncate">
                  {img.name}
                </div>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-purple-500 hover:border-purple-400 dark:hover:border-purple-600 transition-colors flex items-center justify-center"
                aria-label="Add more images"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {warning && (
          <div className="mx-4 mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div className="flex items-end gap-3 p-2 pl-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            title={
              images.length >= MAX_IMAGES
                ? `Maximum ${MAX_IMAGES} images reached`
                : 'Attach image (or drag & drop / paste)'
            }
            className="shrink-0 mb-0.5 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-full dark:hover:text-purple-400 dark:hover:bg-purple-500/20 transition-colors disabled:opacity-40"
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach image</span>
          </Button>

          <div className="relative flex-1 min-w-0 flex items-center mb-0.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                images.length > 0
                  ? 'Add a question about the image(s)…'
                  : t('chat.placeholder')
              }
              className="w-full resize-none border-0 bg-transparent px-2 py-3 text-[15px] focus:ring-0 placeholder:text-slate-400 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-[200px] outline-none"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={!canSubmit}
            className="shrink-0 mb-0.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-sm transition-all shadow-purple-500/20 disabled:opacity-50 h-11 w-11 border-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5 ml-0.5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>

      <div className="text-center mt-3 max-w-4xl mx-auto">
        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          {t('chat.disclaimer')}
        </p>
      </div>
    </div>
  );
}
