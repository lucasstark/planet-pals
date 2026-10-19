# Reaction voice provenance

Generated 2026-10-16 for Planet Pals. No source recording, cloned voice, external
speech API or credentials were used. Existing macOS-generated narration and
personal greeting files were left untouched.

| File | Text | Voice | Generation speed | AAC duration | Size |
| --- | --- | --- | --- | --- | --- |
| `voice/reaction-whoa.m4a` | Whoa! | Kokoro `af_heart` | 1.05 | 0.508 s | 5,237 B |
| `voice/reaction-whee.m4a` | Whee! | Kokoro `af_heart` | 1.00 | 0.526 s | 5,526 B |
| `voice/reaction-giggle.m4a` | Hee hee hee! | Kokoro `af_heart` | 1.12 | 0.710 s | 6,857 B |

The giggle is synthesized spoken syllables, not a recording of human laughter.
All files are mono 24 kHz AAC in M4A at a requested 64 kbps. Generation trims outer
silence while retaining a 15 ms onset pad, applies 5 ms fades, and scales source
peaks to 0.62. FFmpeg decode verification measured resulting peaks of 0.599–0.640,
RMS 0.122–0.144 and detectable onset within 2–13 ms. No subjective listening or
physical iPad testing is claimed. Runtime gain can be lower for comfortable play.

## Origin and licenses

- Model: Kokoro v1.0, converted to ONNX by
  [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx).
- [Kokoro author README](https://github.com/hexgrad/kokoro) explicitly describes
  Apache-licensed weights and permits production use. The
  [author license](https://github.com/hexgrad/kokoro/blob/main/LICENSE) is Apache 2.0;
  a copy is retained in [kokoro-LICENSE.txt](kokoro-LICENSE.txt).
- Wrapper is [MIT licensed](https://github.com/thewh1teagle/kokoro-onnx/blob/main/LICENSE);
  a copy is retained in [kokoro-onnx-LICENSE.txt](kokoro-onnx-LICENSE.txt).
- Author's Hugging Face model card was inaccessible under this environment's
  network policy. License statement was verified from the author's official
  GitHub repository, not inferred from the wrapper's license.
- Models, voice bank and Python libraries are build-only and not distributed with
  the game. These license copies preserve attribution without claiming that model
  licenses automatically attach to every synthesized output.

## Reproduce

Use Python 3.12, FFmpeg with AAC, and an isolated virtual environment outside the
checkout. The tested direct packages were `kokoro-onnx==0.6.1`,
`onnxruntime==1.31.0`, `numpy==2.5.4`, `soundfile==0.13.1`,
`espeakng-loader==0.2.4`, `phonemizer==3.4.0`. eSpeak supplies text phonemes;
Kokoro produces the waveform. It is not eSpeak synthesized audio.

```sh
python -m venv /tmp/planet-pals-voice-env
/tmp/planet-pals-voice-env/bin/pip install kokoro-onnx==0.6.1 onnxruntime==1.31.0 numpy==2.5.4 soundfile==0.13.1 espeakng-loader==0.2.4 phonemizer==3.4.0
mkdir -p /tmp/planet-pals-voice
curl --fail --location 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx' --output /tmp/planet-pals-voice/kokoro-v1.0.onnx
curl --fail --location 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin' --output /tmp/planet-pals-voice/voices-v1.0.bin
/tmp/planet-pals-voice-env/bin/python tools/make-reactions.py /tmp/planet-pals-voice
```

The generator verifies these upstream SHA256 digests before loading either file:

```text
beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a  kokoro-v1.0.onnx
bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d  voices-v1.0.bin
```

Digests were read from GitHub's
[release asset metadata](https://github.com/thewh1teagle/kokoro-onnx/releases/expanded_assets/model-files-v1.1)
and verified against the downloaded bytes. Standard HTTPS certificate checking
and pip verification remained enabled. Model/bank are about 354 MB combined;
CPU inference uses two intra-op threads and one inter-op thread. No GPU needed.
The older wrapper 0.5.0 failed input-type validation with this model; 0.6.1 fixed
that compatibility issue without modifying the model or validation checks.

Regeneration overwrites only these three reaction assets. Use `--output /tmp/demo`
for comparison clips. Outputs can vary slightly with runtime/library versions;
never regenerate the existing 48 voices as part of this helper.
