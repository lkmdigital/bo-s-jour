#!/usr/bin/env python3
"""Génère la voix off du film de présentation (macOS uniquement : `say` + `afconvert`).

Lit components/film/narration.json et produit UNE piste continue,
public/film/voix-off.m4a, de la durée exacte du film : chaque réplique y est
posée à son instant `voiceAt`, le reste est du silence. Le lecteur n'a ainsi
qu'à caler cette piste sur la musique (un seul élément audio à synchroniser,
ce qui évite les blocages de lecture automatique sur iPhone).

Écrit aussi la durée de chaque réplique dans components/film/voiceDurations.json
(sous-titres + baisse du volume de la musique pendant la voix).

Pour passer à une vraie voix enregistrée : déposer un fichier par scène dans
public/film/voix-src/<id>.(m4a|wav|aiff) puis lancer le script avec --from-files.
"""
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NARRATION = ROOT / 'components/film/narration.json'
OUTPUT = ROOT / 'public/film/voix-off.m4a'
SOURCES = ROOT / 'public/film/voix-src'
DURATIONS = ROOT / 'components/film/voiceDurations.json'
RATE = 22050


def to_wav(src: Path, dst: Path) -> None:
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{RATE}', '-c', '1', str(src), str(dst)], check=True)


def main() -> None:
    from_files = '--from-files' in sys.argv
    data = json.loads(NARRATION.read_text())
    scenes = data['scenes']
    total = int(data['duration'] * RATE)
    track = bytearray(total * 2)
    durations = {}
    ok = True

    with tempfile.TemporaryDirectory() as tmp:
        for i, scene in enumerate(scenes):
            clip_wav = Path(tmp) / f"{scene['id']}.wav"
            if from_files:
                src = next(SOURCES.glob(f"{scene['id']}.*"))
            else:
                src = Path(tmp) / f"{scene['id']}.aiff"
                subprocess.run(['say', '-v', data['voice'], '-r', str(data['rate']), '-o', str(src), scene['text']], check=True)
            to_wav(src, clip_wav)

            with wave.open(str(clip_wav)) as w:
                frames = w.readframes(w.getnframes())
            d = round(len(frames) / 2 / RATE, 2)
            durations[scene['id']] = d
            offset = int(scene['voiceAt'] * RATE) * 2
            track[offset:offset + len(frames)] = frames[: max(0, len(track) - offset)]

            end = scene['voiceAt'] + d
            limit = scenes[i + 1]['start'] if i + 1 < len(scenes) else data['duration']
            fits = end <= limit - 0.3
            ok &= fits
            print(f"{'OK ' if fits else 'TROP LONG'} {scene['id']:<13} {d:5.2f}s  fin {end:6.2f}s / limite {limit}s")

        full = Path(tmp) / 'voix-off.wav'
        with wave.open(str(full), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(bytes(track))
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '48000', str(full), str(OUTPUT)], check=True)

    DURATIONS.write_text(json.dumps(durations, indent=2) + '\n')
    print(f'→ {OUTPUT.relative_to(ROOT)}')
    if not ok:
        sys.exit('Au moins une réplique déborde sur la scène suivante : raccourcir le texte ou augmenter « rate ».')


if __name__ == '__main__':
    main()
