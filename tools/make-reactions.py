#!/usr/bin/env python3
"""Build-only Kokoro speech; see docs/reaction-audio-provenance.md for setup.

Usage: python tools/make-reactions.py /path/to/model-directory
Models are checksum-verified; no downloads or runtime TTS in the game.
"""
import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile

import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

FILES = {
    'kokoro-v1.0.onnx': 'beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a',
    'voices-v1.0.bin': 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d',
}
REACTIONS = {
    'reaction-whoa': ('Whoa!', 1.05),
    'reaction-whee': ('Whee!', 1.0),
    'reaction-giggle': ('Hee hee hee!', 1.12),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('models', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'voice')
    args = parser.parse_args()
    for filename, expected in FILES.items():
        actual = hashlib.sha256((args.models / filename).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit(f'Checksum mismatch: {filename}')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(args.models / 'kokoro-v1.0.onnx'), sess_options=options,
                                   providers=['CPUExecutionProvider'])
    model = Kokoro.from_session(session, str(args.models / 'voices-v1.0.bin'))
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='planet-pals-reactions-') as temp:
        for key, (text, speed) in REACTIONS.items():
            samples, rate = model.create(text, voice='af_heart', speed=speed, lang='en-us')
            samples = np.asarray(samples, dtype=np.float32).flatten()
            # Keep soft consonants and 15ms lead-in; don't clip natural internal pauses.
            active = np.flatnonzero(np.abs(samples) > .003)
            if not len(active):
                raise SystemExit(f'Empty speech: {key}')
            pad = round(rate * .015)
            samples = samples[max(0, active[0]-pad):min(len(samples), active[-1]+round(rate*.06))]
            # Bound true waveform peak conservatively; no loudness maximization.
            samples *= .62 / max(float(np.max(np.abs(samples))), .001)
            fade = min(round(rate*.005), len(samples)//2)
            samples[:fade] *= np.linspace(0, 1, fade)
            samples[-fade:] *= np.linspace(1, 0, fade)
            wav = Path(temp) / f'{key}.wav'
            sf.write(wav, samples, rate, subtype='PCM_16')
            output = args.output / f'{key}.m4a'
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                            '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart',
                            str(output)], check=True)
            print(f'{key}: {len(samples)/rate:.3f}s, {output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
