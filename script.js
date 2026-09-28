(function () {
  // Draw the 60 tick marks around the dial
  var ticks = document.getElementById('ticks');
  var ns = 'http://www.w3.org/2000/svg';
  for (var i = 0; i < 60; i++) {
    var a = i * 6 * Math.PI / 180;
    var major = i % 5 === 0;
    var r1 = major ? 80 : 86;
    var r2 = 92;
    var l = document.createElementNS(ns, 'line');
    l.setAttribute('class', 'tick' + (major ? ' major' : ''));
    l.setAttribute('x1', 100 + r1 * Math.sin(a));
    l.setAttribute('y1', 100 - r1 * Math.cos(a));
    l.setAttribute('x2', 100 + r2 * Math.sin(a));
    l.setAttribute('y2', 100 - r2 * Math.cos(a));
    ticks.appendChild(l);
  }

  // Elements
  var timeEl   = document.getElementById('time');
  var lapNow   = document.getElementById('lapnow');
  var hand     = document.getElementById('hand');
  var go       = document.getElementById('go');
  var lapBtn   = document.getElementById('lap');
  var resetBtn = document.getElementById('reset');
  var box      = document.getElementById('lapbox');
  var themeBtn = document.getElementById('theme');

  // State
  var running = false; // is the clock currently running?
  var base = 0;        // milliseconds accumulated before the last start
  var startAt = 0;     // performance.now() at the last start
  var lastLap = 0;     // total time at the previous lap
  var laps = [];       // recorded laps: { split, total }
  var raf = 0;         // requestAnimationFrame id

  // Format milliseconds as mm:ss.cs (with hours when needed)
  function fmt(ms) {
    var cs = Math.floor(ms / 10) % 100;
    var s  = Math.floor(ms / 1000) % 60;
    var m  = Math.floor(ms / 60000) % 60;
    var h  = Math.floor(ms / 3600000);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return (h ? h + ':' : '') + p(m) + ':' + p(s) + '.' + p(cs);
  }

  function elapsed() {
    return running ? base + performance.now() - startAt : base;
  }

  // Update the readout and the second hand
  function draw() {
    var t = elapsed();
    timeEl.textContent = fmt(t);
    lapNow.textContent = (laps.length || running)
      ? 'Lap ' + (laps.length + 1) + '  ' + fmt(t - lastLap)
      : '\u00a0';
    hand.setAttribute('transform', 'rotate(' + ((t / 1000 % 60) * 6) + ' 100 100)');
  }

  function loop() {
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  // Start / pause / resume
  function toggle() {
    if (running) {
      base += performance.now() - startAt;
      running = false;
      cancelAnimationFrame(raf);
      go.textContent = 'Resume';
      draw();
    } else {
      startAt = performance.now();
      running = true;
      go.textContent = 'Pause';
      lapBtn.disabled = false;
      resetBtn.disabled = false;
      loop();
    }
  }

  // Record a lap
  function lap() {
    if (!running) return;
    var t = elapsed();
    laps.push({ split: t - lastLap, total: t });
    lastLap = t;
    renderLaps();
    draw();
  }

  // Reset everything
  function reset() {
    running = false;
    cancelAnimationFrame(raf);
    base = 0;
    lastLap = 0;
    laps = [];
    go.textContent = 'Start';
    lapBtn.disabled = true;
    resetBtn.disabled = true;
    renderLaps();
    draw();
  }

  // Build the lap table, marking fastest (green) and slowest (red) splits
  function renderLaps() {
    if (!laps.length) {
      box.innerHTML = '<div class="empty">Press Start, then Lap to record a split.</div>';
      return;
    }
    var min = Infinity, max = -Infinity;
    laps.forEach(function (l) {
      min = Math.min(min, l.split);
      max = Math.max(max, l.split);
    });
    var rows = '';
    for (var i = laps.length - 1; i >= 0; i--) {
      var l = laps[i], c = '';
      if (laps.length > 2) {
        c = l.split === min ? 'fast' : l.split === max ? 'slow' : '';
      }
      rows += '<tr><td>Lap ' + (i + 1) + '</td><td class="' + c + '">' +
              fmt(l.split) + '</td><td>' + fmt(l.total) + '</td></tr>';
    }
    box.innerHTML =
      '<table><thead><tr><th>Lap</th><th>Split</th><th>Total</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
  }

  // Dark mode toggle
  var root = document.documentElement;

  function setTheme(dark) {
    root.classList.toggle('dark', dark);
    themeBtn.textContent = dark ? 'Light mode' : 'Dark mode';
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  }

  // Use the saved choice, or the device setting the first time
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  var startDark = saved
    ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(startDark);

  themeBtn.addEventListener('click', function () {
    setTheme(!root.classList.contains('dark'));
  });

  // Buttons and keyboard shortcuts
  go.addEventListener('click', toggle);
  lapBtn.addEventListener('click', lap);
  resetBtn.addEventListener('click', reset);
  document.addEventListener('keydown', function (e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === ' ' && document.activeElement.tagName !== 'BUTTON') {
      e.preventDefault();
      toggle();
    } else if (k === 'l') {
      lap();
    } else if (k === 'r' && !resetBtn.disabled) {
      reset();
    }
  });

  draw();
})();