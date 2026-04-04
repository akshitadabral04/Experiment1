// ============================================================
// experiment.js  —  Combined Flanker + Go/No-Go Experiment
// Follows architecture from Lukács & Haasnoot (2024)
// ============================================================
// DEPLOYMENT:
//   1. Upload all files to your PHP-capable web server
//   2. Make sure save_data.php is in the same directory
//   3. Participants open index.html via the server URL
// ============================================================

'use strict';

// ============================================================
// 1. GLOBAL STATE
// ============================================================

const EXP = {
  participantId   : '',
  participantName : '',
  cyclePhase      : '',
  flankerData     : [],   // one row per trial
  gngData         : [],   // one row per trial
  currentPage     : 'page-info',
  keyListenerActive: false,
};

// ============================================================
// 2. PAGE NAVIGATION
// ============================================================

function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  EXP.currentPage = id;
}

// Attach keypress listener for message screens
// (removes itself after one press, ignoring Shift / Ctrl / Alt / Meta)
function waitKey(callback) {
  if (EXP.keyListenerActive) return;
  EXP.keyListenerActive = true;
  function handler(e) {
    if (['Shift','Control','Alt','Meta','Tab','CapsLock'].indexOf(e.key) !== -1) return;
    EXP.keyListenerActive = false;
    document.removeEventListener('keydown', handler);
    callback();
  }
  document.addEventListener('keydown', handler);
}

// ============================================================
// 3. PARTICIPANT INFO FORM
// ============================================================

document.getElementById('btn-start-info').addEventListener('click', function() {
  var pid   = document.getElementById('input-id').value.trim();
  var pname = document.getElementById('input-name').value.trim();
  var phase = document.getElementById('input-phase').value.trim();
  if (!pid || !pname || !phase) {
    alert('Please fill in all fields before continuing.');
    return;
  }
  EXP.participantId   = pid;
  EXP.participantName = pname;
  EXP.cyclePhase      = phase;
  showPage('page-flanker-welcome');
  waitKey(function() { showPage('page-flanker-inst'); waitKey(function() { showPage('page-flanker-practice-intro'); waitKey(startFlankerPractice); }); });
});

// ============================================================
// 4. UTILITY FUNCTIONS
// ============================================================

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function repeat(item, n) {
  var out = [];
  for (var i = 0; i < n; i++) out.push(item);
  return out;
}

function setTrialDisplay(html) {
  document.getElementById('trial-display').innerHTML = html;
}

// ============================================================
// 5. FLANKER TASK
// ============================================================

// --- Trial definitions ---
var FLANKER_STIMULI = [
  { stimulus: '++>++', condition: 'neutral',     direction: 'right', correctKey: '1' },
  { stimulus: '++<++', condition: 'neutral',     direction: 'left',  correctKey: '2' },
  { stimulus: '>>>>>', condition: 'congruent',   direction: 'right', correctKey: '1' },
  { stimulus: '<<<<<', condition: 'congruent',   direction: 'left',  correctKey: '2' },
  { stimulus: '>><>>', condition: 'incongruent', direction: 'right', correctKey: '1' },
  { stimulus: '<<><<', condition: 'incongruent', direction: 'left',  correctKey: '2' },
];

function buildFlankerPractice() {
  var trials = FLANKER_STIMULI.slice();
  var extras = [
    FLANKER_STIMULI[Math.floor(Math.random() * 6)],
    FLANKER_STIMULI[Math.floor(Math.random() * 6)],
  ];
  return shuffle(trials.concat(extras));
}

function buildFlankerMain() {
  var counts = { '++>++':32,'++<++':32,'>>>>>':32,'<<<<<':32,'>><>>':56,'<<><<':56 };
  var trials = [];
  FLANKER_STIMULI.forEach(function(s) {
    trials = trials.concat(repeat(s, counts[s.stimulus]));
  });
  return shuffle(trials);
}

// --- Run a single flanker trial ---
// Timing: fixation 500ms → stimulus 250ms → blank 1200ms
// Response collected during stimulus + blank windows combined
function runFlankerTrial(trialInfo, trialNumber, block, withFeedback, onDone) {
  var stimulus   = trialInfo.stimulus;
  var condition  = trialInfo.condition;
  var direction  = trialInfo.direction;
  var correctKey = trialInfo.correctKey;

  var responseKey = null;
  var responseRT  = null;
  var stimOnset   = null;

  // Show trial page
  showPage('page-trial');

  // FIXATION 500ms
  setTrialDisplay('<div class="fixation">+</div>');

  setTimeout(function() {

    // STIMULUS 250ms
    setTrialDisplay('<div class="stimulus">' + stimulus + '</div>');
    stimOnset = performance.now();

    function responseHandler(e) {
      if (e.key !== '1' && e.key !== '2') return;
      if (responseKey !== null) return;
      responseKey = e.key;
      responseRT  = performance.now() - stimOnset;
      document.removeEventListener('keydown', responseHandler);
    }
    document.addEventListener('keydown', responseHandler);

    setTimeout(function() {

      // BLANK 1200ms (keep collecting response)
      setTrialDisplay('');

      setTimeout(function() {
        document.removeEventListener('keydown', responseHandler);

        // Determine accuracy
        var accuracy;
        if (responseKey === null) {
          accuracy = 'no_response';
        } else {
          accuracy = (responseKey === correctKey) ? 1 : 0;
        }

        // Store trial data
        EXP.flankerData.push({
          participant_id       : EXP.participantId,
          participant_name     : EXP.participantName,
          cycle_phase          : EXP.cyclePhase,
          block                : block,
          trial_number         : trialNumber,
          stimulus             : stimulus,
          condition            : condition,
          stimulus_direction   : direction,
          correct_response     : correctKey,
          participant_response : responseKey || 'none',
          accuracy             : accuracy,
          reaction_time_ms     : responseRT !== null ? Math.round(responseRT) : 'no_response',
        });

        // Feedback (practice only)
        if (withFeedback) {
          var fbClass, fbText;
          if (responseKey === null) {
            fbClass = 'timeout'; fbText = 'No Response!';
          } else if (accuracy === 1) {
            fbClass = 'correct'; fbText = 'Correct!';
          } else {
            fbClass = 'incorrect'; fbText = 'Incorrect!';
          }
          setTrialDisplay('<div class="feedback ' + fbClass + '">' + fbText + '</div>');
          setTimeout(function() { onDone(); }, 800);
        } else {
          onDone();
        }

      }, 1200); // blank duration
    }, 250);   // stimulus duration
  }, 500);     // fixation duration
}

// --- Run a block of flanker trials sequentially ---
function runFlankerBlock(trials, block, withFeedback, onBlockDone) {
  var index = 0;
  function next() {
    if (index >= trials.length) { onBlockDone(); return; }
    var t = trials[index];
    index++;
    runFlankerTrial(t, index, block, withFeedback, next);
  }
  next();
}

// --- Flanker flow ---
var flankerMainTrials;

function startFlankerPractice() {
  var practiceTrials = buildFlankerPractice();
  runFlankerBlock(practiceTrials, 'practice', true, function() {
    showPage('page-flanker-premain');
    waitKey(startFlankerMain);
  });
}

function startFlankerMain() {
  flankerMainTrials = buildFlankerMain(); // build once, split into 3
  runFlankerBlock(flankerMainTrials.slice(0, 80), 'main', false, function() {
    showPage('page-flanker-break1');
    waitKey(function() {
      runFlankerBlock(flankerMainTrials.slice(80, 160), 'main', false, function() {
        showPage('page-flanker-break2');
        waitKey(function() {
          runFlankerBlock(flankerMainTrials.slice(160, 240), 'main', false, function() {
            // Save flanker data, then move on
            saveData('flanker', function() {
              showPage('page-interval');
              waitKey(startGNG);
            });
          });
        });
      });
    });
  });
}

// ============================================================
// 6. GO / NO-GO TASK
// ============================================================

var GNG_STIMULI = [
  { letter: 'O', trialType: 'go',   correctResponse: '1'    },
  { letter: 'Q', trialType: 'go',   correctResponse: '1'    },
  { letter: 'M', trialType: 'nogo', correctResponse: 'none' },
  { letter: 'N', trialType: 'nogo', correctResponse: 'none' },
];

function buildGNGPractice() {
  var trials = [];
  GNG_STIMULI.forEach(function(s) { trials = trials.concat(repeat(s, 2)); });
  return shuffle(trials);
}

function buildGNGMain() {
  var counts = { 'O':90, 'Q':90, 'M':30, 'N':30 };
  var trials = [];
  GNG_STIMULI.forEach(function(s) {
    trials = trials.concat(repeat(s, counts[s.letter]));
  });
  return shuffle(trials);
}

function classifyGNG(responseKey, trialType) {
  if (trialType === 'go')   return responseKey === '1' ? 'hit'               : 'miss';
  return responseKey === null ? 'correct_rejection' : 'false_alarm';
}

function accuracyGNG(responseKey, trialType) {
  if (trialType === 'go')   return responseKey === '1' ? 1 : 0;
  return responseKey === null ? 1 : 0;
}

// --- Run a single GNG trial ---
// Timing: fixation 300ms → stimulus 200ms → blank 1000ms
function runGNGTrial(trialInfo, trialNumber, block, withFeedback, onDone) {
  var letter          = trialInfo.letter;
  var trialType       = trialInfo.trialType;
  var correctResponse = trialInfo.correctResponse;

  var responseKey = null;
  var responseRT  = null;
  var stimOnset   = null;

  showPage('page-trial');

  // FIXATION 300ms
  setTrialDisplay('<div class="fixation">+</div>');

  setTimeout(function() {

    // STIMULUS 200ms
    setTrialDisplay('<div class="stimulus">' + letter + '</div>');
    stimOnset = performance.now();

    function responseHandler(e) {
      if (e.key !== '1') return;
      if (responseKey !== null) return;
      responseKey = e.key;
      responseRT  = performance.now() - stimOnset;
      document.removeEventListener('keydown', responseHandler);
    }
    document.addEventListener('keydown', responseHandler);

    setTimeout(function() {

      // BLANK 1000ms
      setTrialDisplay('');

      setTimeout(function() {
        document.removeEventListener('keydown', responseHandler);

        var acc  = accuracyGNG(responseKey, trialType);
        var rtype = classifyGNG(responseKey, trialType);

        EXP.gngData.push({
          participant_id       : EXP.participantId,
          participant_name     : EXP.participantName,
          cycle_phase          : EXP.cyclePhase,
          block                : block,
          trial_number         : trialNumber,
          stimulus             : letter,
          trial_type           : trialType,
          correct_response     : correctResponse,
          participant_response : responseKey || 'none',
          response_type        : rtype,
          accuracy             : acc,
          reaction_time_ms     : responseRT !== null ? Math.round(responseRT) : 'na',
        });

        if (withFeedback) {
          var fbClass = acc === 1 ? 'correct' : 'incorrect';
          var fbText  = acc === 1 ? 'Correct!' : 'Incorrect!';
          setTrialDisplay('<div class="feedback ' + fbClass + '">' + fbText + '</div>');
          setTimeout(function() { onDone(); }, 800);
        } else {
          onDone();
        }

      }, 1000); // blank
    }, 200);    // stimulus
  }, 300);      // fixation
}

function runGNGBlock(trials, block, withFeedback, onBlockDone) {
  var index = 0;
  function next() {
    if (index >= trials.length) { onBlockDone(); return; }
    var t = trials[index];
    index++;
    runGNGTrial(t, index, block, withFeedback, next);
  }
  next();
}

var gngMainTrials;

function startGNG() {
  showPage('page-gng-welcome');
  waitKey(function() {
    showPage('page-gng-inst');
    waitKey(function() {
      showPage('page-gng-practice-intro');
      waitKey(startGNGPractice);
    });
  });
}

function startGNGPractice() {
  var practiceTrials = buildGNGPractice();
  runGNGBlock(practiceTrials, 'practice', true, function() {
    showPage('page-gng-premain');
    waitKey(startGNGMain);
  });
}

function startGNGMain() {
  gngMainTrials = buildGNGMain();
  runGNGBlock(gngMainTrials.slice(0, 80), 'main', false, function() {
    showPage('page-gng-break1');
    waitKey(function() {
      runGNGBlock(gngMainTrials.slice(80, 160), 'main', false, function() {
        showPage('page-gng-break2');
        waitKey(function() {
          runGNGBlock(gngMainTrials.slice(160, 240), 'main', false, function() {
            saveData('gng', function() {
              showThankYou();
            });
          });
        });
      });
    });
  });
}

// ============================================================
// 7. DATA SAVING
// ============================================================

// Convert array of row objects to CSV string
function toCSV(rows, headers) {
  var lines = [headers.join(',')];
  rows.forEach(function(r) {
    var line = headers.map(function(h) {
      var val = (r[h] !== undefined && r[h] !== null) ? String(r[h]) : '';
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    lines.push(line.join(','));
  });
  return lines.join('\n');
}

var FLANKER_HEADERS = [
  'participant_id','participant_name','cycle_phase','block',
  'trial_number','stimulus','condition','stimulus_direction',
  'correct_response','participant_response','accuracy','reaction_time_ms'
];

var GNG_HEADERS = [
  'participant_id','participant_name','cycle_phase','block',
  'trial_number','stimulus','trial_type','correct_response',
  'participant_response','response_type','accuracy','reaction_time_ms'
];

// Try to POST to save_data.php; fallback to local download on failure
function saveData(taskName, onDone) {
  var isGNG    = taskName === 'gng';
  var rows     = isGNG ? EXP.gngData     : EXP.flankerData;
  var headers  = isGNG ? GNG_HEADERS     : FLANKER_HEADERS;
  var filename = isGNG
    ? 'gonogo_'  + EXP.participantId + '_' + getTimestamp() + '.csv'
    : 'flanker_' + EXP.participantId + '_' + getTimestamp() + '.csv';

  var csvContent = toCSV(rows, headers);

  // Attempt server save via PHP
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'save_data.php', true);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.timeout = 8000;

  xhr.onload = function() {
    if (xhr.status === 200 && xhr.responseText.indexOf('ok') !== -1) {
      onDone();
    } else {
      // Server responded but not OK — trigger download fallback
      downloadFallback(filename, csvContent, taskName);
      onDone();
    }
  };

  xhr.onerror = xhr.ontimeout = function() {
    // No server / connection issue — trigger download fallback
    downloadFallback(filename, csvContent, taskName);
    onDone();
  };

  xhr.send(
    'filename=' + encodeURIComponent(filename) +
    '&data='    + encodeURIComponent(csvContent)
  );
}

function downloadFallback(filename, csvContent, taskName) {
  // Show download buttons on thank-you page so participant can save file
  var btnId = taskName === 'gng' ? 'btn-download-gng' : 'btn-download-flanker';
  var btn = document.getElementById(btnId);
  btn.style.display = 'inline-block';
  btn.addEventListener('click', function() {
    triggerDownload(filename, csvContent);
  });
}

function triggerDownload(filename, csvContent) {
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ============================================================
// 8. THANK YOU
// ============================================================

function showThankYou() {
  showPage('page-thankyou');
  var status = document.getElementById('save-status');
  status.textContent = 'All data saved successfully.';
  status.className = 'save-status ok';
}
