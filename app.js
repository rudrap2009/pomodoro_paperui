let timerState = {
    mode: 'focus',
    timeRemaining: 25 * 60,
    totalDuration: 25 * 60,
    isActive: false,
    intervalId: null,
    focusSessionsInCycle: 0
};

let settings = {
    focus: 25,
    short: 5,
    long: 15,
    autoBreaks: false,
    autoFocus: false,
    alarmSound: 'chime',
    volume: 60
};

let tasks = [];
let activeTaskId = null;

const timerTimeDisplay = document.getElementById('timer-time-display');
const progressRingFill = document.getElementById('progress-ring-fill');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const resetBtn = document.getElementById('reset-btn');
const skipBtn = document.getElementById('skip-btn');

const modeFocusBtn = document.getElementById('mode-focus');
const modeShortBtn = document.getElementById('mode-short');
const modeLongBtn = document.getElementById('mode-long');

const activeTaskBanner = document.getElementById('active-task-banner');
const activeTaskName = document.getElementById('active-task-name');
const activeTaskPoms = document.getElementById('active-task-poms');

const addTaskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title-input');
const taskEstPomsInput = document.getElementById('task-est-poms');
const tasksList = document.getElementById('tasks-list');
const taskSummaryCount = document.getElementById('task-summary-count');

const settingsToggleBtn = document.getElementById('settings-toggle-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const settingsForm = document.getElementById('settings-form');

const settingFocusInput = document.getElementById('setting-focus');
const settingShortInput = document.getElementById('setting-short');
const settingLongInput = document.getElementById('setting-long');
const settingAutoBreaksCheckbox = document.getElementById('setting-auto-breaks');
const settingAutoFocusCheckbox = document.getElementById('setting-auto-focus');
const settingAlarmSoundSelect = document.getElementById('setting-alarm-sound');
const customSoundSelect = document.getElementById('custom-sound-select');
const soundSelectTrigger = document.getElementById('sound-select-trigger');
const soundSelectValue = document.getElementById('sound-select-value');
const soundSelectOptions = document.getElementById('sound-select-options');
const customOptions = soundSelectOptions.querySelectorAll('.custom-option');
const settingVolumeSlider = document.getElementById('setting-volume');
const volumeValLabel = document.getElementById('volume-val');
const testSoundBtn = document.getElementById('test-sound-btn');

const ringRadius = 90;
const ringCircumference = 2 * Math.PI * ringRadius;

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playAlarm(soundType, volumePercent) {
    if (soundType === 'none' || volumePercent <= 0) return;
    
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const volumeNode = ctx.createGain();
        
        const volume = (volumePercent / 100) * 0.5;
        volumeNode.gain.setValueAtTime(volume, now);
        volumeNode.connect(ctx.destination);

        switch (soundType) {
            case 'digital':
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(880, now + i * 0.25);
                    
                    gain.gain.setValueAtTime(0, now + i * 0.25);
                    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.25 + 0.02);
                    gain.gain.setValueAtTime(0.2, now + i * 0.25 + 0.12);
                    gain.gain.linearRampToValueAtTime(0.0001, now + i * 0.25 + 0.15);
                    
                    osc.connect(gain);
                    gain.connect(volumeNode);
                    osc.start(now + i * 0.25);
                    osc.stop(now + i * 0.25 + 0.16);
                }
                break;

            case 'chime':
                const chord = [523.25, 659.25, 783.99, 1046.50];
                chord.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + index * 0.08);
                    
                    gain.gain.setValueAtTime(0, now + index * 0.08);
                    gain.gain.linearRampToValueAtTime(0.3, now + index * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 1.6);
                    
                    osc.connect(gain);
                    gain.connect(volumeNode);
                    osc.start(now + index * 0.08);
                    osc.stop(now + index * 0.08 + 1.8);
                });
                break;

            case 'bell':
                const baseFreq = 220.00;
                const overtones = [1.0, 2.0, 2.7, 3.5, 4.2];
                
                overtones.forEach((multiplier, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = index === 0 ? 'sine' : 'triangle';
                    osc.frequency.setValueAtTime(baseFreq * multiplier, now);
                    
                    gain.gain.setValueAtTime(0, now);
                    const peakGain = index === 0 ? 0.5 : 0.2 / index;
                    gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5 - (index * 0.35));
                    
                    osc.connect(gain);
                    gain.connect(volumeNode);
                    osc.start(now);
                    osc.stop(now + 2.6);
                });
                break;
        }
    } catch (error) {
        console.error("Audio Context playback failed: ", error);
    }
}

function init() {
    loadSettings();
    loadTasks();
    
    applyThemeClass();
    resetTimer();
    renderTasksList();
}

function loadSettings() {
    const saved = localStorage.getItem('focus_timer_settings');
    if (saved) {
        try {
            settings = { ...settings, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
    
    settingFocusInput.value = settings.focus;
    settingShortInput.value = settings.short;
    settingLongInput.value = settings.long;
    settingAutoBreaksCheckbox.checked = settings.autoBreaks;
    settingAutoFocusCheckbox.checked = settings.autoFocus;
    settingAlarmSoundSelect.value = settings.alarmSound;
    syncCustomSoundDropdown();
    settingVolumeSlider.value = settings.volume;
    volumeValLabel.textContent = `${settings.volume}%`;
}

function saveSettingsState() {
    settings.focus = parseInt(settingFocusInput.value) || 25;
    settings.short = parseInt(settingShortInput.value) || 5;
    settings.long = parseInt(settingLongInput.value) || 15;
    settings.autoBreaks = settingAutoBreaksCheckbox.checked;
    settings.autoFocus = settingAutoFocusCheckbox.checked;
    settings.alarmSound = settingAlarmSoundSelect.value;
    settings.volume = parseInt(settingVolumeSlider.value) || 0;
    
    localStorage.setItem('focus_timer_settings', JSON.stringify(settings));
}

function loadTasks() {
    const savedTasks = localStorage.getItem('focus_timer_tasks');
    const savedActiveId = localStorage.getItem('focus_timer_active_id');
    
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            tasks = [];
        }
    }
    
    if (savedActiveId) {
        activeTaskId = savedActiveId;
        if (!tasks.some(t => t.id === activeTaskId)) {
            activeTaskId = null;
        }
    }
}

function saveTasksState() {
    localStorage.setItem('focus_timer_tasks', JSON.stringify(tasks));
    if (activeTaskId) {
        localStorage.setItem('focus_timer_active_id', activeTaskId);
    } else {
        localStorage.removeItem('focus_timer_active_id');
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const formatted = formatTime(timerState.timeRemaining);
    timerTimeDisplay.textContent = formatted;
    
    const phaseLabel = timerState.mode.charAt(0).toUpperCase() + timerState.mode.slice(1);
    document.title = `(${formatted}) ${phaseLabel} | FocusTimer`;
    
    const progressRatio = timerState.timeRemaining / timerState.totalDuration;
    const offset = ringCircumference * (1 - progressRatio);
    progressRingFill.style.strokeDashoffset = offset;
}

function applyThemeClass() {
    document.body.classList.remove('theme-focus', 'theme-short', 'theme-long');
    if (timerState.mode === 'focus') {
        document.body.classList.add('theme-focus');
    } else if (timerState.mode === 'short') {
        document.body.classList.add('theme-short');
    } else if (timerState.mode === 'long') {
        document.body.classList.add('theme-long');
    }
}

function setMode(mode) {
    if (timerState.mode === mode) return;
    
    pauseTimer();
    
    timerState.mode = mode;
    applyThemeClass();
    
    let minutes = settings.focus;
    if (mode === 'short') minutes = settings.short;
    if (mode === 'long') minutes = settings.long;
    
    timerState.totalDuration = minutes * 60;
    timerState.timeRemaining = minutes * 60;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) btn.classList.add('active');
    });
    
    updateTimerDisplay();
}

function tick() {
    if (timerState.timeRemaining > 0) {
        timerState.timeRemaining--;
        updateTimerDisplay();
    } else {
        handleTimerCompletion();
    }
}

function startTimer() {
    if (timerState.isActive) return;
    
    getAudioContext();
    
    timerState.isActive = true;
    timerState.intervalId = setInterval(tick, 1000);
    
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    playPauseBtn.setAttribute('title', 'Pause Timer');
    playPauseBtn.setAttribute('aria-label', 'Pause Timer');
}

function pauseTimer() {
    if (!timerState.isActive) return;
    
    timerState.isActive = false;
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    playPauseBtn.setAttribute('title', 'Start Timer');
    playPauseBtn.setAttribute('aria-label', 'Start Timer');
}

function resetTimer() {
    pauseTimer();
    
    let minutes = settings.focus;
    if (timerState.mode === 'short') minutes = settings.short;
    if (timerState.mode === 'long') minutes = settings.long;
    
    timerState.totalDuration = minutes * 60;
    timerState.timeRemaining = minutes * 60;
    
    updateTimerDisplay();
}

function skipTimer() {
    let nextMode = 'focus';
    
    if (timerState.mode === 'focus') {
        timerState.focusSessionsInCycle++;
        if (timerState.focusSessionsInCycle >= 4) {
            nextMode = 'long';
            timerState.focusSessionsInCycle = 0;
        } else {
            nextMode = 'short';
        }
    } else {
        nextMode = 'focus';
    }
    
    setMode(nextMode);
    
    const shouldAutoStart = (nextMode === 'focus' && settings.autoFocus) || 
                             (nextMode !== 'focus' && settings.autoBreaks);
    
    if (shouldAutoStart) {
        startTimer();
    }
}

function handleTimerCompletion() {
    pauseTimer();
    playAlarm(settings.alarmSound, settings.volume);
    
    let nextMode = 'focus';
    
    if (timerState.mode === 'focus') {
        incrementActiveTaskPom();
        
        timerState.focusSessionsInCycle++;
        if (timerState.focusSessionsInCycle >= 4) {
            nextMode = 'long';
            timerState.focusSessionsInCycle = 0;
        } else {
            nextMode = 'short';
        }
    } else {
        nextMode = 'focus';
    }
    
    setMode(nextMode);
    
    const shouldAutoStart = (nextMode === 'focus' && settings.autoFocus) || 
                             (nextMode !== 'focus' && settings.autoBreaks);
    
    if (shouldAutoStart) {
        setTimeout(startTimer, 1000);
    }
}

function renderTasksList() {
    tasksList.innerHTML = '';
    
    const activeTasks = tasks.filter(t => !t.completed);
    taskSummaryCount.textContent = `${activeTasks.length} remaining`;
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <li class="tasks-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>No tasks yet. Create one to get started!</p>
            </li>`;
        activeTaskBanner.classList.add('hidden');
        return;
    }
    
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.id === activeTaskId) return -1;
        if (b.id === activeTaskId) return 1;
        return 0;
    });

    sortedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.id === activeTaskId ? 'active' : ''} ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        
        li.innerHTML = `
            <label class="checkbox-container" aria-label="Mark task complete">
                <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox">
                <span class="checkmark"></span>
            </label>
            <div class="task-item-content">
                <span class="task-item-title">${escapeHTML(task.title)}</span>
                <div class="task-item-meta">
                    <span class="task-item-poms" title="Completed / Estimated Pomodoros">
                        🍅 ${task.completedPoms}/${task.estPoms}
                    </span>
                    <button class="delete-task-btn" title="Delete Task" aria-label="Delete Task">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>`;
        
        li.addEventListener('click', (e) => {
            if (e.target.closest('.checkbox-container') || e.target.closest('.delete-task-btn')) {
                return;
            }
            selectActiveTask(task.id);
        });
        
        const checkbox = li.querySelector('.task-checkbox');
        checkbox.addEventListener('change', (e) => {
            toggleTaskCompletion(task.id, e.target.checked);
        });
        
        const deleteBtn = li.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', () => {
            deleteTask(task.id);
        });
        
        tasksList.appendChild(li);
    });
    
    updateActiveTaskBanner();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

function selectActiveTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;
    
    activeTaskId = activeTaskId === id ? null : id;
    saveTasksState();
    renderTasksList();
}

function toggleTaskCompletion(id, completed) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    task.completed = completed;
    
    if (completed && activeTaskId === id) {
        activeTaskId = null;
    }
    
    saveTasksState();
    renderTasksList();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    if (activeTaskId === id) {
        activeTaskId = null;
    }
    saveTasksState();
    renderTasksList();
}

function incrementActiveTaskPom() {
    if (!activeTaskId) return;
    
    const task = tasks.find(t => t.id === activeTaskId);
    if (task) {
        task.completedPoms++;
        saveTasksState();
        renderTasksList();
    }
}

function updateActiveTaskBanner() {
    if (!activeTaskId) {
        activeTaskBanner.classList.add('hidden');
        return;
    }
    
    const task = tasks.find(t => t.id === activeTaskId);
    if (task && !task.completed) {
        activeTaskName.textContent = task.title;
        activeTaskPoms.textContent = `🍅 ${task.completedPoms} / ${task.estPoms}`;
        activeTaskBanner.classList.remove('hidden');
    } else {
        activeTaskBanner.classList.add('hidden');
    }
}

addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = taskTitleInput.value.trim();
    const estPoms = parseInt(taskEstPomsInput.value) || 1;
    
    if (!title) return;
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        estPoms: estPoms,
        completedPoms: 0,
        completed: false
    };
    
    tasks.push(newTask);
    
    if (!activeTaskId) {
        activeTaskId = newTask.id;
    }
    
    taskTitleInput.value = '';
    taskEstPomsInput.value = '1';
    
    saveTasksState();
    renderTasksList();
});

function openSettingsModal() {
    loadSettings();
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

settingsToggleBtn.addEventListener('click', openSettingsModal);
settingsCloseBtn.addEventListener('click', closeSettingsModal);

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});

settingsSaveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveSettingsState();
    
    if (!timerState.isActive) {
        let mins = settings.focus;
        if (timerState.mode === 'short') mins = settings.short;
        if (timerState.mode === 'long') mins = settings.long;
        
        timerState.totalDuration = mins * 60;
        timerState.timeRemaining = mins * 60;
        updateTimerDisplay();
    }
    
    closeSettingsModal();
});

testSoundBtn.addEventListener('click', () => {
    const tempSound = settingAlarmSoundSelect.value;
    const tempVol = parseInt(settingVolumeSlider.value) || 0;
    playAlarm(tempSound, tempVol);
});

settingVolumeSlider.addEventListener('input', (e) => {
    volumeValLabel.textContent = `${e.target.value}%`;
});

playPauseBtn.addEventListener('click', () => {
    if (timerState.isActive) {
        pauseTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', skipTimer);

modeFocusBtn.addEventListener('click', () => setMode('focus'));
modeShortBtn.addEventListener('click', () => setMode('short'));
modeLongBtn.addEventListener('click', () => setMode('long'));

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (timerState.isActive) {
            pauseTimer();
        } else {
            startTimer();
        }
    } else if (e.code === 'KeyR') {
        resetTimer();
    } else if (e.code === 'KeyS') {
        skipTimer();
    }
});

function selectCustomOption(value, text) {
    settingAlarmSoundSelect.value = value;
    soundSelectValue.textContent = text;
    
    customOptions.forEach(opt => {
        if (opt.dataset.value === value) {
            opt.classList.add('active');
            opt.setAttribute('aria-selected', 'true');
        } else {
            opt.classList.remove('active');
            opt.setAttribute('aria-selected', 'false');
        }
    });
}

function syncCustomSoundDropdown() {
    const val = settingAlarmSoundSelect.value;
    const matchingOpt = Array.from(customOptions).find(opt => opt.dataset.value === val);
    if (matchingOpt) {
        selectCustomOption(val, matchingOpt.textContent);
    }
}

soundSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    soundSelectOptions.classList.toggle('hidden');
    soundSelectTrigger.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (customSoundSelect && !customSoundSelect.contains(e.target)) {
        soundSelectOptions.classList.add('hidden');
        soundSelectTrigger.classList.remove('active');
    }
});

customOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = option.dataset.value;
        const text = option.textContent;
        
        selectCustomOption(val, text);
        soundSelectOptions.classList.add('hidden');
        soundSelectTrigger.classList.remove('active');
    });
});

init();
