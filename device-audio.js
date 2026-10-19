/* Small, gesture-only device audio checks. No autoplay or background retry loop. */
(() => {
  let sessionStatus = 'Unavailable';
  function prepare() {
    try {
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
        sessionStatus = navigator.audioSession.type;
      }
    } catch (_) { sessionStatus = 'Unavailable'; }
  }
  window.DeviceAudio = { prepare };

  const panel = document.getElementById('sound-help');
  const status = document.getElementById('sound-status');
  const modes = [...panel.querySelectorAll('[data-sound-mode]')];
  let media = null, note = null, generation = 0;
  function stopChecks() {
    generation++;
    if (media) { media.pause(); media.removeAttribute('src'); media.load(); media = null; }
    if (note) { note.stop(); note = null; }
  }
  function syncModes() {
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.soundMode === soundMode));
  }
  function diagnostics() {
    document.getElementById('sound-details-text').textContent =
      `Browser: ${navigator.userAgent}\nSound: ${soundMode}\nAudio engine: ${audio?.state || 'Not started'}\nPlayback session: ${sessionStatus}\nLoaded voice clips: ${readyClips.size}\nSpeech playing: ${Boolean(current)}`;
  }
  function close() {
    stopChecks();
    if (typeof panel.close === 'function') panel.close();
    else panel.removeAttribute('open');
    document.getElementById('grown-ups').focus();
  }
  document.getElementById('grown-ups').addEventListener('click', () => {
    quietGame();
    syncModes();
    status.textContent = 'Choose a sound level, then try a voice or a musical note.';
    if (typeof panel.showModal === 'function') panel.showModal();
    else { panel.setAttribute('open', ''); document.getElementById('close-sound-help').focus(); }
  });
  document.getElementById('close-sound-help').addEventListener('click', close);
  panel.addEventListener('cancel', stopChecks);
  panel.addEventListener('close', stopChecks);
  for (const button of modes) button.addEventListener('click', () => {
    stopChecks();
    setSoundMode(button.dataset.soundMode);
    syncModes();
    status.textContent = soundMode === 'off' ? 'Sound is off. Choose Normal or Soft to try it.' : 'Sound level saved.';
    diagnostics();
  });
  function beginCheck() {
    stopChecks();
    if (soundMode === 'off') {
      status.textContent = 'Sound is off. Choose Normal or Soft to try it.';
      return false;
    }
    prepare();
    unlockAudio();
    preloadVoice();
    return true;
  }
  document.getElementById('try-voice').addEventListener('click', () => {
    if (!beginCheck()) return;
    const ownGeneration = generation;
    // Invoke play directly in the click gesture, before any asynchronous work.
    media = new Audio('voice/Jettson.m4a');
    media.volume = soundMode === 'soft' ? .3 : 1;
    media.setAttribute('playsinline', '');
    status.textContent = 'Trying the recorded greeting…';
    try {
      Promise.resolve(media.play()).then(() => {
        if (generation === ownGeneration) status.textContent = 'The voice started. Did you hear “Jettson”? If not, check the device volume and audio output.';
      }).catch(() => {
        if (generation === ownGeneration) status.textContent = 'The voice could not start. Check your connection, then tap Try voice again.';
      });
    } catch (_) { status.textContent = 'The voice could not start. Try again after checking your device sound.'; }
    diagnostics();
  });
  document.getElementById('try-note').addEventListener('click', () => {
    if (!beginCheck()) return;
    try {
      note = tone(659.25, 0, .7, .18);
      status.textContent = audio?.state === 'running' ? 'A musical note was sent. If it is silent, check the device volume and audio output.' : 'The sound engine is waking up. Tap Try music again if you did not hear a note.';
    } catch (_) { status.textContent = 'Music could not start. Try reopening the game in Safari.'; }
    diagnostics();
  });
  document.getElementById('sound-details').addEventListener('toggle', diagnostics);
  window.addEventListener('blur', stopChecks);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopChecks(); });
})();
