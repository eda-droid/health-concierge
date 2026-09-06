// App updates affect downloaded code only; user data stays in localStorage.
(() => {
  const status = document.getElementById('app-update-status');
  const check = document.getElementById('app-update-check');
  const banner = document.getElementById('app-update-banner');
  const apply = document.getElementById('app-update-apply');
  const later = document.getElementById('app-update-later');
  let registration, waitingWorker, reloadRequested = false, changedElsewhere = false;
  let lastCheck = 0, checking = false, activationTimer, trainingEdited = false;
  document.addEventListener('input', event => {
    if(event.target.matches?.('.set-input')) trainingEdited = true;
  });
  const say = text => { status.textContent = text; };
  const showUpdate = () => {
    waitingWorker = registration?.waiting;
    if(!waitingWorker && !changedElsewhere) return;
    banner.hidden = false;
    say('Eine neue Version ist bereit.');
  };
  const watchWorker = worker => {
    if(!worker) return;
    worker.addEventListener('statechange', () => {
      if(worker.state === 'installed') {
        if(navigator.serviceWorker.controller) showUpdate();
        else say('App ist für die Offline-Nutzung bereit.');
      }
      if(worker.state === 'redundant') say('Update konnte nicht geladen werden. Bitte später erneut prüfen.');
    });
  };
  async function checkUpdates(manual = false) {
    if(!registration || checking || (!manual && Date.now() - lastCheck < 60000)) return;
    if(!navigator.onLine) { say('Du bist offline. Updates sind wieder mit Internet möglich.'); return; }
    checking = true; lastCheck = Date.now(); check.disabled = true;
    say('Suche nach Updates …');
    try {
      await registration.update();
      if(registration.waiting || changedElsewhere) showUpdate();
      else say(registration.installing ? 'Neue Version wird geladen …' : 'Keine neue Version gefunden.');
    } catch(error) {
      say('Update-Prüfung nicht möglich. Bitte später erneut versuchen.');
    } finally { checking = false; check.disabled = false; }
  }
  check.addEventListener('click', () => checkUpdates(true));
  later.addEventListener('click', () => { banner.hidden = true; });
  apply.addEventListener('click', () => {
    try {
      // Capture the currently focused training input before leaving the page.
      document.activeElement?.blur();
      // Training fields save on change/blur. Verify that save succeeded instead
      // of writing a stale in-memory log over changes from another open tab.
      if(trainingEdited && typeof logData !== 'undefined' &&
         localStorage.getItem('hc_log') !== JSON.stringify(logData)) {
        throw new Error('Training changes have not been persisted');
      }
    } catch(error) {
      say('Eingaben konnten nicht gespeichert werden. Bitte zuerst deine Daten sichern.');
      document.getElementById('app-update-message').textContent = 'Speichern fehlgeschlagen. Bitte zuerst deine Daten sichern; die App bleibt geöffnet.';
      return;
    }
    if(changedElsewhere || !navigator.serviceWorker.controller) { location.reload(); return; }
    waitingWorker = registration?.waiting;
    if(!waitingWorker) { checkUpdates(true); return; }
    reloadRequested = true; apply.disabled = true; later.disabled = true;
    apply.textContent = 'Wird aktualisiert …';
    activationTimer = setTimeout(() => {
      reloadRequested = false; apply.disabled = false; later.disabled = false;
      apply.textContent = 'Jetzt aktualisieren';
      say('Update dauert länger. Bitte erneut versuchen.');
    }, 15000);
    waitingWorker.postMessage({type: 'ACTIVATE_UPDATE'});
  });

  if(!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol === 'file:') {
    say('App-Updates sind über deine HTTPS-App-Adresse verfügbar.');
    check.disabled = true;
    return;
  }
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    clearTimeout(activationTimer);
    if(reloadRequested) { location.reload(); return; }
    // A second open tab must not reload unexpectedly and lose a form draft.
    if(hadController) {
      changedElsewhere = true;
      apply.disabled = false; later.disabled = false;
      apply.textContent = 'Jetzt aktualisieren';
      showUpdate();
    }
    hadController = true;
  });
  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'});
      registration.addEventListener('updatefound', () => watchWorker(registration.installing));
      watchWorker(registration.installing);
      if(registration.waiting) showUpdate();
      else say('Updates werden beim Öffnen automatisch geprüft.');
      check.disabled = false;
      checkUpdates();
    } catch(error) {
      say('App-Updates konnten nicht eingerichtet werden. Bitte die App mit Internet erneut öffnen.');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') checkUpdates();
  });
  window.addEventListener('online', () => checkUpdates(true));
  setInterval(() => { if(document.visibilityState === 'visible') checkUpdates(); }, 15 * 60 * 1000);
})();
