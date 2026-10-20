'use client';

import { useState } from 'react';
import { Check, ListMusic } from 'lucide-react';
import { useExtras } from './Extras';
import TrackThumb from './TrackThumb';
import { useI18n } from '@/components/I18nProvider';

export default function PlaylistSheet() {
  const { t: tr } = useI18n();
  const { pickerTrack, closePicker, playlists, addToPlaylist, createPlaylist } = useExtras();
  const [name, setName] = useState('');
  const open = !!pickerTrack;

  const create = () => {
    if (!pickerTrack || !name.trim()) return;
    createPlaylist(name, [pickerTrack]);
    setName('');
    closePicker();
  };

  return (
    <>
      <div className={`sheet-backdrop${open ? ' open' : ''}`} onClick={closePicker} />
      <section className={`sheet glass${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="sheet-grip" />
        <h3>{tr("Simpan ke playlist")}</h3>
        <p>{pickerTrack ? pickerTrack.title : ''}</p>

        <div className="pl-list">
          {playlists.length === 0 && <p style={{ margin: '0 0 10px', fontSize: 15 }}>{tr("Belum ada playlist. Buat yang pertama di bawah.")}</p>}
          {playlists.map((p) => {
            const has = !!pickerTrack && p.tracks.some((x) => x.id === pickerTrack.id);
            return (
              <button
                key={p.id}
                type="button"
                className="pl-item"
                onClick={() => {
                  if (pickerTrack && !has) addToPlaylist(p.id, pickerTrack);
                  closePicker();
                }}
              >
                {p.tracks[0] ? (
                  <TrackThumb track={p.tracks[0]} className="thumb" />
                ) : (
                  <span className="thumb" style={{ background: 'var(--surface2)' }}>
                    <ListMusic size={22} />
                  </span>
                )}
                <span className="row-body">
                  <span className="row-title" style={{ display: 'block', fontSize: 16 }}>
                    {p.name}
                  </span>
                  <span className="row-sub" style={{ display: 'block', fontSize: 13 }}>
                    {tr('{n} lagu', { n: p.tracks.length })}
                  </span>
                </span>
                {has ? <Check size={20} color="var(--accent)" /> : null}
              </button>
            );
          })}
        </div>

        <div className="pl-form">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Nama playlist baru")} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button type="button" onClick={create}>
            {tr("Buat")}
          </button>
        </div>
      </section>
    </>
  );
}
