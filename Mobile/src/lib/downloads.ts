import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getAudioSource, type Song } from '@/lib/api';

const DOWNLOADS_STORAGE_KEY = 'melodify_mobile_downloads_v1';
const DOWNLOADS_DIRECTORY_NAME = 'melodify-downloads';

export type DownloadedSong = {
  downloadId: string;
  song: Song;
  fileUri: string;
  qualityId: string | null;
  qualityLabel: string;
  downloadedAt: number;
  bytes: number;
};

const inFlightDownloads = new Map<string, Promise<DownloadedSong>>();
let storageMutationQueue: Promise<void> = Promise.resolve();

function getDownloadsDirectory() {
  return new Directory(Paths.document, DOWNLOADS_DIRECTORY_NAME);
}

function getDownloadId(song: Song, qualityId?: string | null) {
  return `${song.id}:${qualityId || 'standard'}`;
}

function safeFilenamePart(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'song';
}

function getFileExtension(uri: string) {
  try {
    const pathname = new URL(uri).pathname.toLowerCase();
    const extension = pathname.match(/\.([a-z0-9]{2,5})$/)?.[1];
    return extension && ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus'].includes(extension)
      ? extension
      : 'mp3';
  } catch {
    return 'mp3';
  }
}

async function readStoredDownloads(): Promise<DownloadedSong[]> {
  const raw = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value as DownloadedSong[] : [];
  } catch {
    return [];
  }
}

async function saveStoredDownloads(downloads: DownloadedSong[]) {
  await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloads));
}

function updateStoredDownloads<T>(update: (downloads: DownloadedSong[]) => { downloads: DownloadedSong[]; result: T }) {
  const mutation = storageMutationQueue.then(async () => {
    const current = await readStoredDownloads();
    const { downloads, result } = update(current);
    await saveStoredDownloads(downloads);
    return result;
  });
  storageMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

/**
 * The saved record keeps an absolute path, and the app's data folder can move (an app update or a restore changes
 * the container path on iOS). The file name is what stays; look for it in the current downloads folder.
 */
function currentLocation(item: DownloadedSong): DownloadedSong {
  try {
    const name = decodeURIComponent(item.fileUri.split('?')[0].split('/').pop() ?? '');
    if (!name) return item;
    const file = new File(getDownloadsDirectory(), name);
    return file.exists && file.size > 0 ? { ...item, fileUri: file.uri } : item;
  } catch {
    return item;
  }
}

function isDownloadFileAvailable(item: DownloadedSong) {
  try {
    const file = new File(item.fileUri);
    return file.exists && file.size > 0;
  } catch {
    return false;
  }
}

export async function listDownloadedSongs(): Promise<DownloadedSong[]> {
  if (Platform.OS === 'web') return [];
  const stored = await readStoredDownloads();
  const resolved = stored.map(currentLocation);
  const available = resolved.filter(isDownloadFileAvailable);
  const moved = resolved.some((item, index) => item.fileUri !== stored[index].fileUri);

  if (available.length !== stored.length || moved) {
    const healed = new Map(available.map((item) => [item.downloadId, item]));
    await updateStoredDownloads((current) => ({
      downloads: current.flatMap((item) => {
        const found = healed.get(item.downloadId);
        if (found) return [found];
        return isDownloadFileAvailable(currentLocation(item)) ? [item] : [];
      }),
      result: undefined,
    }));
  }
  return available.sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function downloadSong(
  song: Song,
  qualityId?: string | null,
): Promise<DownloadedSong> {
  if (Platform.OS === 'web') {
    throw new Error('Tải nhạc để nghe ngoại tuyến chỉ dùng được trong ứng dụng mobile.');
  }

  const downloadId = getDownloadId(song, qualityId);
  const pending = inFlightDownloads.get(downloadId);
  if (pending) return pending;

  const task = (async () => {
    const stored = await readStoredDownloads();
    const storedRecord = stored.find((item) => item.downloadId === downloadId);
    const existing = storedRecord ? currentLocation(storedRecord) : undefined;
    if (existing) {
      const existingFile = new File(existing.fileUri);
      if (existingFile.exists && existingFile.size > 0) return existing;
    }

    const source = await getAudioSource(song, qualityId, 'download');
    const directory = getDownloadsDirectory();
    directory.create({ idempotent: true, intermediates: true });

    const extension = getFileExtension(source.uri);
    const filename = `melodify-${safeFilenamePart(song.id)}-${safeFilenamePart(qualityId || 'standard')}.${extension}`;
    const target = new File(directory, filename);
    try {
      const file = await File.downloadFileAsync(source.uri, target, {
        headers: source.headers,
        idempotent: true,
      });
      if (!file.exists || file.size <= 0) {
        throw new Error('Tệp tải xuống bị rỗng. Hãy thử lại.');
      }

      const record: DownloadedSong = {
        downloadId,
        song,
        fileUri: file.uri,
        qualityId: qualityId || null,
        qualityLabel: song.audio_qualities?.find((quality) => quality.quality_id === qualityId)?.label
          || song.audio_quality
          || 'Chất lượng tiêu chuẩn',
        downloadedAt: Date.now(),
        bytes: file.size,
      };
      await updateStoredDownloads((current) => ({
        downloads: [record, ...current.filter((item) => item.downloadId !== downloadId)],
        result: undefined,
      }));
      return record;
    } catch (error) {
      try {
        if (target.exists) target.delete();
      } catch {
        // Ignore cleanup errors and report the original download failure.
      }
      throw error;
    }
  })();

  inFlightDownloads.set(downloadId, task);
  try {
    return await task;
  } finally {
    inFlightDownloads.delete(downloadId);
  }
}

export async function removeDownloadedSong(downloadId: string): Promise<void> {
  const pending = inFlightDownloads.get(downloadId);
  if (pending) await pending.catch(() => undefined);

  await updateStoredDownloads((current) => {
    const item = current.find((download) => download.downloadId === downloadId);
    if (item && Platform.OS !== 'web') {
      try {
        const file = new File(item.fileUri);
        if (file.exists) file.delete();
      } catch {
        // Remove the library entry even if the OS has already removed the file.
      }
    }
    return {
      downloads: current.filter((download) => download.downloadId !== downloadId),
      result: undefined,
    };
  });
}

export function toOfflineSong(download: DownloadedSong): Song {
  return {
    ...download.song,
    audio_url: download.fileUri,
    download_url: download.fileUri,
    stream_url: download.fileUri,
    source_url: download.fileUri,
    preview_url: download.fileUri,
    premium_only: false,
    audio_qualities: [],
  };
}
