// ============================================================
// experiment.js  —  Combined Flanker + Go/No-Go Experiment
// Pure JavaScript — no server, no PHP
// Hosted on GitHub Pages, data saved to Google Form
// ============================================================
//
// HOW TO DEPLOY ON GITHUB PAGES:
//   1. Create a GitHub repo
//   2. Upload index.html, style.css, experiment.js
//   3. Go to Settings → Pages → Branch: main → Save
//   4. Your link: https://yourusername.github.io/yourrepo/
//
// HOW TO CONNECT YOUR GOOGLE FORM:
//   1. Fill in GOOGLE_FORM_ID below (from your form URL)
//   2. That's it — all entry numbers are already mapped
//
// ============================================================

'use strict';

// ============================================================
// CONFIGURATION — FILL THIS IN BEFORE DEPLOYING
// ============================================================

// Your Google Form ID — found in your form URL:
// https://docs.google.com/forms/d/e/  →→ THIS PART ←←  /viewform
var GOOGLE_FORM_ID = '1FAIpQLSfZIFLisQ_0sB0J9IAOCzUb_6rLMumDWF8OOlVY8BVT_hGkYg';

// Entry numbers mapped to your form fields (from the screenshot)
// DO NOT change these unless your form fields change
var ENTRY = {
  participant_id       : 'entry.1923761713',
  participant_name     : 'entry.834499527',
  cycle_phase          : 'entry.1560876806',
  task                 : 'entry.976259838',
  block                : 'entry.1233612005',
  trial_number         : 'entry.205965830',
  stimulus             : 'entry.1766111037',
  condition            : 'entry.1647840464',   // flanker only, blank for gng
  stimulus_direction   : 'entry.1484080341',   // flanker only, blank for gng
  trial_type           : 'entry.1557172474',   // gng only, blank for flanker
  correct_response     : 'entry.1832255790',
  participant_response : 'entry.264588357',
  response_type        : 'entry.799037069',    // gng only, blank for flanker
  accuracy             : 'entry.1360367772',
  reaction_time_ms     : 'entry.553684159',
};

// ============================================================
// 1. GLOBAL STATE
// ============================================================

var EXP = {
  participantId    : '',
  participantName  : '',
  cyclePhase       : '',
  flankerData      : [],
  gngData          : [],
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
}

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
// 3. PARTICIPANT INFO
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
  waitKey(function() {
    showPage('page-flanker-inst');
    waitKey(function() {
      showPage('page-flanker-practice-intro');
      waitKey(startFlankerPractice);
    });
  });
});

// ============================================================
// 4. UTILITIES
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
  trials.push(FLANKER_STIMULI[Math.floor(Math.random() * 6)]);
  trials.push(FLANKER_STIMULI[Math.floor(Math.random() * 6)]);
  return shuffle(trials);
}

function buildFlankerMain() {
  var counts = { '++>++':32,'++<++':32,'>>>>>':32,'<<<<<':32,'>><>>':56,'<<><<':56 };
  var trials = [];
  FLANKER_STIMULI.forEach(function(s) {
    trials = trials.concat(repeat(s, counts[s.stimulus]));
  });
  return shuffle(trials);
}

// Timing: fixation 500ms → stimulus 250ms → blank 1200ms
function runFlankerTrial(trialInfo, trialNumber, block, withFeedback, onDone) {
  var stimulus   = trialInfo.stimulus;
  var condition  = trialInfo.condition;
  var direction  = trialInfo.direction;
  var correctKey = trialInfo.correctKey;
  var responseKey = null;
  var responseRT  = null;
  var stimOnset   = null;

  showPage('page-trial');
  setTrialDisplay('<div class="fixation">+</div>');

  setTimeout(function() {
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
      setTrialDisplay('');

      setTimeout(function() {
        document.removeEventListener('keydown', responseHandler);

        var accuracy = responseKey === null ? 'no_response'
                     : (responseKey === correctKey ? 1 : 0);

        EXP.flankerData.push({
          participant_id       : EXP.participantId,
          participant_name     : EXP.participantName,
          cycle_phase          : EXP.cyclePhase,
          task                 : 'flanker',
          block                : block,
          trial_number         : trialNumber,
          stimulus             : stimulus,
          condition            : condition,
          stimulus_direction   : direction,
          trial_type           : '',
          correct_response     : correctKey,
          participant_response : responseKey || 'none',
          response_type        : '',
          accuracy             : accuracy,
          reaction_time_ms     : responseRT !== null ? Math.round(responseRT) : 'no_response',
        });

        if (withFeedback) {
          var fbClass, fbText;
          if (responseKey === null)          { fbClass = 'timeout';   fbText = 'No Response!'; }
          else if (accuracy === 1)           { fbClass = 'correct';   fbText = 'Correct!';     }
          else                               { fbClass = 'incorrect'; fbText = 'Incorrect!';   }
          setTrialDisplay('<div class="feedback ' + fbClass + '">' + fbText + '</div>');
          setTimeout(onDone, 800);
        } else {
          onDone();
        }
      }, 1200);
    }, 250);
  }, 500);
}

function runFlankerBlock(trials, block, withFeedback, onBlockDone) {
  var index = 0;
  function next() {
    if (index >= trials.length) { onBlockDone(); return; }
    var t = trials[index]; index++;
    runFlankerTrial(t, index, block, withFeedback, next);
  }
  next();
}

var flankerMainTrials;

function startFlankerPractice() {
  runFlankerBlock(buildFlankerPractice(), 'practice', true, function() {
    showPage('page-flanker-premain');
    waitKey(startFlankerMain);
  });
}

function startFlankerMain() {
  flankerMainTrials = buildFlankerMain();
  runFlankerBlock(flankerMainTrials.slice(0, 80), 'main', false, function() {
    showPage('page-flanker-break1');
    waitKey(function() {
      runFlankerBlock(flankerMainTrials.slice(80, 160), 'main', false, function() {
        showPage('page-flanker-break2');
        waitKey(function() {
          runFlankerBlock(flankerMainTrials.slice(160, 240), 'main', false, function() {
            showSavingScreen('Saving Flanker data to Google Form...');
            submitToGoogleForm(EXP.flankerData, function() {
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
  var counts = { 'O':90,'Q':90,'M':30,'N':30 };
  var trials = [];
  GNG_STIMULI.forEach(function(s) {
    trials = trials.concat(repeat(s, counts[s.letter]));
  });
  return shuffle(trials);
}

// Timing: fixation 300ms → stimulus 200ms → blank 1000ms
function runGNGTrial(trialInfo, trialNumber, block, withFeedback, onDone) {
  var letter          = trialInfo.letter;
  var trialType       = trialInfo.trialType;
  var correctResponse = trialInfo.correctResponse;
  var responseKey = null;
  var responseRT  = null;
  var stimOnset   = null;

  showPage('page-trial');
  setTrialDisplay('<div class="fixation">+</div>');

  setTimeout(function() {
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
      setTrialDisplay('');

      setTimeout(function() {
        document.removeEventListener('keydown', responseHandler);

        var rtype, acc;
        if (trialType === 'go') {
          rtype = responseKey === '1' ? 'hit' : 'miss';
          acc   = responseKey === '1' ? 1     : 0;
        } else {
          rtype = responseKey === null ? 'correct_rejection' : 'false_alarm';
          acc   = responseKey === null ? 1 : 0;
        }

        EXP.gngData.push({
          participant_id       : EXP.participantId,
          participant_name     : EXP.participantName,
          cycle_phase          : EXP.cyclePhase,
          task                 : 'gng',
          block                : block,
          trial_number         : trialNumber,
          stimulus             : letter,
          condition            : '',
          stimulus_direction   : '',
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
          setTimeout(onDone, 800);
        } else {
          onDone();
        }
      }, 1000);
    }, 200);
  }, 300);
}

function runGNGBlock(trials, block, withFeedback, onBlockDone) {
  var index = 0;
  function next() {
    if (index >= trials.length) { onBlockDone(); return; }
    var t = trials[index]; index++;
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
  runGNGBlock(buildGNGPractice(), 'practice', true, function() {
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
            showSavingScreen('Saving Go/No-Go data to Google Form...');
            submitToGoogleForm(EXP.gngData, function() {
              showThankYou();
            });
          });
        });
      });
    });
  });
}

// ============================================================
// 7. GOOGLE FORM SUBMISSION
// ============================================================
// Uses a hidden iframe + dynamically created forms.
// Each trial = one form submission (one row in Google Sheets).
// 300ms delay between rows to avoid rate limiting.
// Flanker-only fields are blank on GNG rows and vice versa.
// ============================================================

// Create hidden iframe once — reused for all submissions
var gformIframe = document.createElement('iframe');
gformIframe.name = 'gform_iframe';
gformIframe.style.display = 'none';
document.body.appendChild(gformIframe);

function submitRowToGoogleForm(row) {
  var formEl    = document.createElement('form');
  formEl.method = 'POST';
  formEl.action = 'https://docs.google.com/forms/d/e/' + GOOGLE_FORM_ID + '/formResponse';
  formEl.target = 'gform_iframe';
  formEl.style.display = 'none';

  // Add every field as a hidden input using its entry number
  Object.keys(ENTRY).forEach(function(field) {
    var val   = (row[field] !== undefined && row[field] !== null) ? String(row[field]) : '';
    var input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = ENTRY[field];
    input.value = val;
    formEl.appendChild(input);
  });

  document.body.appendChild(formEl);
  formEl.submit();
  document.body.removeChild(formEl);
}

// Submit all rows sequentially with 300ms gap
function submitToGoogleForm(rows, onDone) {
  if (!rows || rows.length === 0) { onDone(); return; }
  var index = 0;

  // Update progress counter on saving screen
  function updateProgress() {
    var el = document.getElementById('saving-count');
    if (el) el.textContent = index + ' / ' + rows.length + ' rows submitted';
  }

  function next() {
    if (index >= rows.length) { onDone(); return; }
    submitRowToGoogleForm(rows[index]);
    index++;
    updateProgress();
    setTimeout(next, 300);
  }
  next();
}

// ============================================================
// 8. SAVING SCREEN + THANK YOU
// ============================================================

function showSavingScreen(msg) {
  // Temporarily show trial page with a saving message
  showPage('page-trial');
  setTrialDisplay(
    '<div style="text-align:center; color:#888; font-family: Courier New, monospace;">' +
    '<div style="font-size:18px; margin-bottom:16px;">' + msg + '</div>' +
    '<div id="saving-count" style="font-size:14px; color:#555;">Preparing...</div>' +
    '<div style="font-size:12px; color:#333; margin-top:20px;">Please wait — do not close this window</div>' +
    '</div>'
  );
}

function showThankYou() {
  showPage('page-thankyou');
  var status = document.getElementById('save-status');
  status.textContent = 'All data submitted to Google Form successfully.';
  status.className = 'save-status ok';
}
