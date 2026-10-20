import { getSongDownloadUrl, setSongFavorite, type Song } from './api';

export function downloadSongFiles(songs: Song[]) {
  songs.forEach((song) => {
    const anchor = document.createElement('a');
    anchor.href = getSongDownloadUrl(song);
    anchor.download = `${song.title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  });
}

export function setSongFavorites(songs: Song[], favorited: boolean, visitorId: string) {
  return Promise.allSettled(songs.map((song) => setSongFavorite(song.id, favorited, visitorId)));
}
