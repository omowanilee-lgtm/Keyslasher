import {NOTE_NAMES,CHORD_DATABASE} from "./ChordDatabase.js"

    class KeySlasherGame {
      constructor() {
        this.activeDifficulty = 'Beginner';
        this.lives = 3;
        this.totalObstacles = 5;
        this.currentObstacleIndex = 0;
        this.levelTimeRemaining = 180;
        this.chordTimeRemaining = 30;
        this.isPaused = false;
        this.gameStarted = false;
        
        this.levelTimerInterval = null;
        this.chordTimerInterval = null;
        
        this.currentChordSequence = [];
        this.activeTargetChord = null;
        this.activeNotes = new Set();

        this.midiAccess = null;
        this.selectedMidiInput = null;

        // DOM Elements
        this.elLives = document.getElementById('lives-display');
        this.elLevelTimer = document.getElementById('level-timer');
        this.elChordTimer = document.getElementById('chord-timer');
        this.elTargetChord = document.getElementById('target-chord-display');
        this.elPlayedNotes = document.getElementById('played-notes-display');
        this.elAvatar = document.getElementById('avatar');
        this.elObstacle = document.getElementById('obstacle');
        this.elDifficultySelect = document.getElementById('difficulty-select');
        this.elMidiSelect = document.getElementById('midi-input-select');
        
        this.elStartScreen = document.getElementById('start-screen');
        this.elPauseScreen = document.getElementById('pause-screen');
        this.elGameOverScreen = document.getElementById('game-over-screen');
        this.elLevelCompleteScreen = document.getElementById('level-complete-screen');
        this.elGameOverReason = document.getElementById('game-over-reason');

        this.initUIEventListeners();
        this.initVirtualPiano();
        this.initMIDI();
      }

      initMIDI() {
        const dot = document.getElementById('midi-status-dot');
        const text = document.getElementById('midi-status-text');

        if (!navigator.requestMIDIAccess) {
          dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
          text.innerText = "Nicht unterstützt";
          this.elMidiSelect.innerHTML = '<option value="">Nicht unterstützt</option>';
          return;
        }

        navigator.requestMIDIAccess({ sysex: false }).then(
          (midiAccess) => {
            this.midiAccess = midiAccess;
            this.updateMidiDeviceList();

            midiAccess.onstatechange = () => {
              this.updateMidiDeviceList();
            };
          },
          (err) => {
            console.warn("MIDI-Zugriffsfehler:", err);
            dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
            text.innerText = "Blockiert";
            this.elMidiSelect.innerHTML = '<option value="">Zugriff blockiert</option>';
          }
        );
      }

      updateMidiDeviceList() {
        const dot = document.getElementById('midi-status-dot');
        const text = document.getElementById('midi-status-text');
        
        if (!this.midiAccess) return;

        const inputs = Array.from(this.midiAccess.inputs.values());
        const previousSelection = this.elMidiSelect.value;
        this.elMidiSelect.innerHTML = '';

        if (inputs.length === 0) {
          dot.className = "w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse";
          text.innerText = "Kein Gerät";
          this.elMidiSelect.innerHTML = '<option value="">Kein MIDI-Gerät/Treiber gefunden</option>';
          this.selectedMidiInput = null;
          return;
        }

        let hasSelected = false;
        inputs.forEach((input) => {
          const option = document.createElement('option');
          option.value = input.id;
          option.innerText = input.name || `MIDI Input (${input.id})`;
          this.elMidiSelect.appendChild(option);

          if (input.id === previousSelection) {
            hasSelected = true;
          }
        });

        if (hasSelected) {
          this.elMidiSelect.value = previousSelection;
        } else if (inputs.length > 0) {
          this.elMidiSelect.value = inputs[0].id;
        }

        this.connectSelectedMidiDevice();
      }

      connectSelectedMidiDevice() {
        const dot = document.getElementById('midi-status-dot');
        const text = document.getElementById('midi-status-text');
        const selectedId = this.elMidiSelect.value;

        if (this.selectedMidiInput) {
          this.selectedMidiInput.onmidimessage = null;
        }

        if (!selectedId || !this.midiAccess) {
          this.selectedMidiInput = null;
          return;
        }

        const input = this.midiAccess.inputs.get(selectedId);
        if (input) {
          this.selectedMidiInput = input;
          this.selectedMidiInput.onmidimessage = this.handleMIDIMessage.bind(this);
          
          dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
          text.innerText = "Aktiv";
        } else {
          dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
          text.innerText = "Fehler";
        }
      }

      handleMIDIMessage(event) {
        if (this.isPaused) return;

        const [command, note, velocity] = event.data;
        if (command === 144 && velocity > 0) {
          this.notePressed(note);
        } else if (command === 128 || (command === 144 && velocity === 0)) {
          this.noteReleased(note);
        }
      }

      notePressed(midiNote) {
        if (this.isPaused) return;
        this.activeNotes.add(midiNote);
        this.updatePianoKeysUI(midiNote, true);
        this.evaluateInput();
      }

      noteReleased(midiNote) {
        if (this.isPaused) return;
        this.activeNotes.delete(midiNote);
        this.updatePianoKeysUI(midiNote, false);
        this.evaluateInput();
      }

      getActivePitchClasses() {
        const pitchClasses = new Set();
        this.activeNotes.forEach((note) => {
          pitchClasses.add(note % 12);
        });
        return Array.from(pitchClasses).sort((a, b) => a - b);
      }

      evaluateInput() {
        const activePitchClasses = this.getActivePitchClasses();
        const noteNames = activePitchClasses.map(pc => NOTE_NAMES[pc]);
        this.elPlayedNotes.innerText = noteNames.length > 0 ? noteNames.join(' - ') : '-';

        if (!this.activeTargetChord || activePitchClasses.length === 0) return;

        const target = [...this.activeTargetChord.pitchClasses].sort((a, b) => a - b);
        
        const isMatch = target.length === activePitchClasses.length &&
          target.every((val, idx) => val === activePitchClasses[idx]);

        if (isMatch) {
          this.handleCorrectChord();
        }
      }

      handleCorrectChord() {
        this.activeNotes.clear();
        this.clearPianoHighlights();

        this.elAvatar.classList.remove('fighter-idle');
        this.elAvatar.classList.add('fighter-slash');

        setTimeout(() => {
          this.elObstacle.classList.add('scale-0', 'opacity-0');
        }, 150);

        setTimeout(() => {
          this.elAvatar.classList.remove('fighter-slash');
          this.elAvatar.classList.add('fighter-idle');
          
          this.currentObstacleIndex++;
          
          if (this.currentObstacleIndex >= this.totalObstacles) {
            this.completeLevel();
          } else {
            this.loadNextChord();
            this.elObstacle.classList.remove('scale-0', 'opacity-0');
          }
        }, 400);
      }

      handleWrongAttempt(reason) {
        this.lives--;
        this.updateLivesUI();

        this.elAvatar.classList.remove('fighter-idle');
        this.elAvatar.classList.add('fighter-hit');

        setTimeout(() => {
          this.elAvatar.classList.remove('fighter-hit');
          this.elAvatar.classList.add('fighter-idle');
        }, 400);

        if (this.lives <= 0) {
          this.triggerGameOver('K.O. - OUT OF LIVES!');
        } else if (reason === 'timeout') {
          this.resetChordTimer();
        }
      }

      // Dynamically switch levels/difficulty during or before play
      setDifficulty(newDifficulty) {
        this.activeDifficulty = newDifficulty;
        this.elDifficultySelect.value = newDifficulty;
        const diffConfig = CHORD_DATABASE[this.activeDifficulty];
        
        this.currentChordSequence = [...diffConfig.chords].sort(() => Math.random() - 0.5);
        this.totalObstacles = this.currentChordSequence.length;

        if (this.gameStarted) {
          this.currentObstacleIndex = 0;
          this.loadNextChord();
        }
      }

      togglePause() {
        if (!this.gameStarted) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
          this.stopAllTimers();
          this.elPauseScreen.classList.remove('hidden');
        } else {
          this.elPauseScreen.classList.add('hidden');
          this.resumeTimers();
        }
      }

      startLevel() {
        this.setDifficulty(this.elDifficultySelect.value);
        this.lives = 3;
        this.currentObstacleIndex = 0;
        this.levelTimeRemaining = 180;
        this.isPaused = false;
        this.gameStarted = true;

        this.updateLivesUI();
        this.elObstacle.classList.remove('scale-0', 'opacity-0');
        this.elStartScreen.classList.add('hidden');
        this.elPauseScreen.classList.add('hidden');
        this.elGameOverScreen.classList.add('hidden');
        this.elLevelCompleteScreen.classList.add('hidden');

        this.startLevelTimer();
        this.loadNextChord();
      }

      loadNextChord() {
        this.activeTargetChord = this.currentChordSequence[this.currentObstacleIndex];
        this.elTargetChord.innerText = this.activeTargetChord.name;
        this.resetChordTimer();
      }

      startLevelTimer() {
        if (this.levelTimerInterval) clearInterval(this.levelTimerInterval);
        
        this.levelTimerInterval = setInterval(() => {
          if (this.isPaused) return;

          this.levelTimeRemaining--;
          const mins = Math.floor(this.levelTimeRemaining / 60).toString().padStart(2, '0');
          const secs = (this.levelTimeRemaining % 60).toString().padStart(2, '0');
          this.elLevelTimer.innerText = `${mins}:${secs}`;

          if (this.levelTimeRemaining <= 0) {
            this.triggerGameOver('TIME OVER!');
          }
        }, 1000);
      }

      resetChordTimer() {
        if (this.chordTimerInterval) clearInterval(this.chordTimerInterval);
        
        const maxTime = CHORD_DATABASE[this.activeDifficulty].timePerChord;
        this.chordTimeRemaining = maxTime;
        this.elChordTimer.innerText = `${this.chordTimeRemaining}s`;

        this.chordTimerInterval = setInterval(() => {
          if (this.isPaused) return;

          this.chordTimeRemaining--;
          this.elChordTimer.innerText = `${this.chordTimeRemaining}s`;

          if (this.chordTimeRemaining <= 0) {
            this.handleWrongAttempt('timeout');
          }
        }, 1000);
      }

      resumeTimers() {
        this.startLevelTimer();
        
        if (this.chordTimerInterval) clearInterval(this.chordTimerInterval);
        this.chordTimerInterval = setInterval(() => {
          if (this.isPaused) return;

          this.chordTimeRemaining--;
          this.elChordTimer.innerText = `${this.chordTimeRemaining}s`;

          if (this.chordTimeRemaining <= 0) {
            this.handleWrongAttempt('timeout');
          }
        }, 1000);
      }

      stopAllTimers() {
        if (this.levelTimerInterval) clearInterval(this.levelTimerInterval);
        if (this.chordTimerInterval) clearInterval(this.chordTimerInterval);
      }

      triggerGameOver(reason) {
        this.gameStarted = false;
        this.stopAllTimers();
        this.elGameOverReason.innerText = reason;
        this.elGameOverScreen.classList.remove('hidden');
      }

      completeLevel() {
        this.gameStarted = false;
        this.stopAllTimers();
        this.elLevelCompleteScreen.classList.remove('hidden');
      }

      updateLivesUI() {
        const hearts = ['🖤 🖤 🖤', '❤️ 🖤 🖤', '❤️ ❤️ 🖤', '❤️ ❤️ ❤️'];
        this.elLives.innerText = hearts[Math.max(0, this.lives)];
      }

      initVirtualPiano() {
        const pianoContainer = document.getElementById('virtual-piano');
        pianoContainer.innerHTML = '';

        for (let midi = 48; midi <= 71; midi++) {
          const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
          const key = document.createElement('button');
          key.dataset.midi = midi.toString();
          
          if (isBlack) {
            key.className = 'piano-key bg-slate-900 text-slate-400 h-16 w-5 -mx-2.5 z-10 rounded-b border border-slate-700 text-[8px] flex items-end justify-center pb-1';
          } else {
            key.className = 'piano-key bg-slate-200 text-slate-800 h-24 w-7 rounded-b border border-slate-400 text-[9px] flex items-end justify-center pb-1 font-bold';
          }

          key.innerText = NOTE_NAMES[midi % 12];

          key.addEventListener('mousedown', () => this.notePressed(midi));
          key.addEventListener('mouseup', () => this.noteReleased(midi));
          key.addEventListener('mouseleave', () => this.noteReleased(midi));

          pianoContainer.appendChild(key);
        }
      }

      updatePianoKeysUI(midiNote, active) {
        const key = document.querySelector(`[data-midi="${midiNote}"]`);
        if (key) {
          if (active) key.classList.add('active');
          else key.classList.remove('active');
        }
      }

      clearPianoHighlights() {
        document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));
      }

      initUIEventListeners() {
        document.getElementById('btn-start').addEventListener('click', () => this.startLevel());
        document.getElementById('btn-restart').addEventListener('click', () => this.startLevel());
        document.getElementById('btn-replay').addEventListener('click', () => this.startLevel());
        
        document.getElementById('btn-pause-hud').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());

        // MIDI listeners
        this.elMidiSelect.addEventListener('change', () => this.connectSelectedMidiDevice());
        document.getElementById('btn-reconnect-midi').addEventListener('click', () => this.initMIDI());

        // Dynamic Level Change via Dropdown
        this.elDifficultySelect.addEventListener('change', (e) => {
          this.setDifficulty(e.target.value);
        });

        // Pause Shortcut [P]
        window.addEventListener('keydown', (e) => {
          if (e.key === 'p' || e.key === 'P') {
            this.togglePause();
          }
        });

        document.getElementById('btn-next').addEventListener('click', () => {
          const diffs = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];
          const currentIndex = diffs.indexOf(this.activeDifficulty);
          if (currentIndex < diffs.length - 1) {
            this.setDifficulty(diffs[currentIndex + 1]);
          }
          this.startLevel();
        });
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      new KeySlasherGame();
    });