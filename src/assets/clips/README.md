# Audio clips

Drop real audio clips here to have them play instead of / in addition to
the TTS pronunciation.

Each Pokemon gets its own subdirectory, named after the Pokemon and
matched case-insensitively (e.g. `Venusaur`, `venusaur`, and `VENUSAUR`
all match the same entry):

```
src/assets/clips/
  venusaur/
    clip1.mp3
    clip2.mp3
  pikachu/
    cry.mp3
```

Supported file types: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.aac`.

A Pokemon with one or more clips gets a "Play clip" button that cycles
through all of its clips (one per press, wrapping back to the first
after the last). A Pokemon with no matching directory, or an empty one,
gets no button at all.
