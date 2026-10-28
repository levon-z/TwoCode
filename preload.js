(function preloadBridge() {
  'use strict';

  const { contextBridge, ipcRenderer, webUtils } = require('electron');

  function subscribe(channel, callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, data) => callback(data);

    ipcRenderer.on(channel, listener);

    return () => ipcRenderer.removeListener(channel, listener);
  }

  contextBridge.exposeInMainWorld('twocode', {
    connect: () => ipcRenderer.invoke('twocode:connect'),
    getConnection: () => ipcRenderer.invoke('twocode:get-connection'),
    getState: () => ipcRenderer.invoke('twocode:get-state'),

    spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
    spotifyGetState: () => ipcRenderer.invoke('spotify:get-state'),
    spotifyControl: action =>
      ipcRenderer.invoke('spotify:control', action),
    spotifyDevices: () => ipcRenderer.invoke('spotify:devices'),
    spotifyTransfer: id => ipcRenderer.invoke('spotify:transfer', id),
    spotifySeek: positionMs =>
      ipcRenderer.invoke('spotify:seek', positionMs),
    spotifyDisconnect: () =>
      ipcRenderer.invoke('spotify:disconnect'),

    projectGet: () => ipcRenderer.invoke('project:get'),
    projectChoose: () => ipcRenderer.invoke('project:choose'),
    projectRescan: () => ipcRenderer.invoke('project:rescan'),
    projectSearch: query =>
      ipcRenderer.invoke('project:search', { query }),
    projectRead: (file, line = 1) =>
      ipcRenderer.invoke('project:read', { file, line }),

    projectAgentGet: () => ipcRenderer.invoke('project-agent:get'),
  projectAgentOpen: () => ipcRenderer.invoke('project-agent:open'),
  projectAgentSend: message => ipcRenderer.invoke('project-agent:send', { message }),
  projectAgentUndo: () => ipcRenderer.invoke('project-agent:undo'),
  onProjectAgentProgress: callback => subscribe('project-agent:progress', callback),
  projectEditorOpen: file => ipcRenderer.invoke('project-editor:open', { file }),
  projectEditorSend: (file, message) => ipcRenderer.invoke('project-editor:edit', { file, message }),
  projectEditorUndo: file => ipcRenderer.invoke('project-editor:undo', { file }),
  onProjectEditorProgress: callback => subscribe('project-editor:progress', callback),
  projectV2Get: () => ipcRenderer.invoke('projectv2:get'),
    projectV2Choose: () => ipcRenderer.invoke('projectv2:choose'),
    projectV2ListFiles: () =>
      ipcRenderer.invoke('projectv2:list-files'),
    projectV2AiStatus: () =>
      ipcRenderer.invoke('projectv2:ai-status'),
    projectV2ChatGet: file =>
      ipcRenderer.invoke('projectv2:chat-get', { file }),
    projectV2ChatSend: (file, message) =>
      ipcRenderer.invoke('projectv2:chat-send', { file, message }),
    projectV2ChatReset: file =>
      ipcRenderer.invoke('projectv2:chat-reset', { file }),

    aiSettingsGet: () => ipcRenderer.invoke('ai-settings:get'),
    aiSettingsSetProvider: provider =>
      ipcRenderer.invoke('ai-settings:set-provider', provider),
    aiSettingsSetKey: (type, key) =>
      ipcRenderer.invoke('ai-settings:set-key', { type, key }),
    aiSettingsClearKey: type =>
      ipcRenderer.invoke('ai-settings:clear-key', type),
    aiSettingsSetModel: model =>
      ipcRenderer.invoke('ai-settings:set-model', model),
    aiSettingsTest: () =>
      ipcRenderer.invoke('ai-settings:test'),
    aiSettingsChatGPTLogin: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-login'),
    aiSettingsChatGPTCancel: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-cancel'),
    aiSettingsChatGPTLogout: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-logout'),

    aiMonitorGet: () => ipcRenderer.invoke('ai-monitor:get'),
    aiMonitorWindows: () => ipcRenderer.invoke('ai-monitor:windows'),
    aiMonitorConnect: (provider, targetId) => ipcRenderer.invoke('ai-monitor:connect', { provider, targetId }),
    aiMonitorDisconnect: provider => ipcRenderer.invoke('ai-monitor:disconnect', { provider }),
    aiMonitorOpenSource: provider => ipcRenderer.invoke('ai-monitor:open-source', { provider }),
    aiMonitorHooksInstall: agent => ipcRenderer.invoke('ai-monitor:hooks-install', { agent }),
    aiMonitorHooksUninstall: agent => ipcRenderer.invoke('ai-monitor:hooks-uninstall', { agent }),
    // Extras: file tray, calendar, weather, volume, Bluetooth battery
    pathForFile: file => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
    trayGet: () => ipcRenderer.invoke('extras:tray-get'),
    trayAdd: paths => ipcRenderer.invoke('extras:tray-add', { paths }),
    trayRemove: filePath => ipcRenderer.invoke('extras:tray-remove', { path: filePath }),
    trayOpen: filePath => ipcRenderer.invoke('extras:tray-open', { path: filePath }),
    trayDrag: filePath => ipcRenderer.send('extras:tray-drag', filePath),
    extrasConfig: config => ipcRenderer.invoke('extras:config', config),
    calendarNext: () => ipcRenderer.invoke('extras:calendar'),
    weatherNow: () => ipcRenderer.invoke('extras:weather'),
    onVolume: callback => subscribe('extras:volume', callback),
    volumeSet: level => ipcRenderer.invoke('extras:volume-set', { level }),
    volumeGet: () => ipcRenderer.invoke('extras:volume-get'),
    clipsGet: () => ipcRenderer.invoke('extras:clips-get'),
    clipsCopy: index => ipcRenderer.invoke('extras:clips-copy', { index }),
    clipsClear: () => ipcRenderer.invoke('extras:clips-clear'),
    onClips: callback => subscribe('extras:clips', callback),
    noteGet: () => ipcRenderer.invoke('extras:note-get'),
    noteSet: text => ipcRenderer.invoke('extras:note-set', { text }),
    onShortcut: callback => subscribe('extras:shortcut', callback),
    onBluetooth: callback => subscribe('extras:bluetooth', callback),
    aiMonitorHooksAnswer:(sessionId, answers) => ipcRenderer.invoke('ai-monitor:hooks-answer', { sessionId, answers }),
    aiMonitorHooksPlan: (sessionId, approve, feedback) => ipcRenderer.invoke('ai-monitor:hooks-plan', { sessionId, approve, feedback }),
    aiMonitorHooksJump: sessionId => ipcRenderer.invoke('ai-monitor:hooks-jump', { sessionId }),
    aiMonitorHooksModel: model => ipcRenderer.invoke('ai-monitor:hooks-model', { model }),
    aiMonitorHooksTest: (kind, command) => ipcRenderer.invoke('ai-monitor:hooks-test', { kind, command }),
    aiMonitorSetNotify:enabled => ipcRenderer.invoke('ai-monitor:set-notify', { enabled }),
    aiMonitorHooksReply:(sessionId, text) => ipcRenderer.invoke('ai-monitor:hooks-reply', { sessionId, text }),
    aiMonitorHooksSeen:() => ipcRenderer.invoke('ai-monitor:hooks-seen'),
    aiMonitorHooksDecide:(sessionId, behavior) => ipcRenderer.invoke('ai-monitor:hooks-decide', { sessionId, behavior }),
    aiMonitorReply:(provider, questionId, text) => ipcRenderer.invoke('ai-monitor:reply', { provider, questionId, text }),
    onAiMonitorState: callback => subscribe('ai-monitor:state', callback),
    onAiMonitorOpen: callback => subscribe('ai-monitor:open', callback),

    setIslandInteractive: interactive =>
      ipcRenderer.send('island:set-interactive', interactive),
    setLanguage: language =>
      ipcRenderer.send('app:set-language', language),
    setIslandState: state =>
      ipcRenderer.send('island:set-state', state),
    setMode: mode =>
      ipcRenderer.send('window:set-mode', mode),
    openUrl: url =>
      ipcRenderer.send('twocode:open-url', url),
    close: () =>
      ipcRenderer.send('window:close'),
    notify: (title, body, url) =>
      ipcRenderer.send('twocode:notify', { title, body, url }),
    onPointer: callback =>
      subscribe('companion:pointer', callback),
    onGoodbye: callback =>
      subscribe('twocode:goodbye', callback),
    // Robo the buddy (buddy-main.cjs): grab him out of the island and drop him on the screen
    settingsOpen: tab => ipcRenderer.send('settings-app:open', typeof tab === 'string' ? tab : ''), // the TwoCode app, its own window
    buddyGrab: info => ipcRenderer.send('buddy:grab', info),
    buddyDrop: () => ipcRenderer.send('buddy:drop'),
    buddyFrame: url => ipcRenderer.send('buddy:frame', url),
    // Robo's chat in the island (chat-ui.js)
    buddyAsk: (kind, text, history, lang) => ipcRenderer.invoke('buddy:ask', { kind, text, history, lang }),
    buddyApply: () => ipcRenderer.invoke('buddy:apply'),
    buddyForget: () => ipcRenderer.send('buddy:forget'),
    buddyAi: () => ipcRenderer.invoke('buddy:ai'),
    buddyUseAi: id => ipcRenderer.invoke('buddy:use-ai', id),
    buddyLogin: () => ipcRenderer.invoke('buddy:login'),
    buddyApplyFix: () => ipcRenderer.invoke('buddy:apply-fix'),
    buddyCancelFix: () => ipcRenderer.send('buddy:cancel-fix'),
    onBuddyChat: callback => subscribe('buddy:chat', callback),
    settingsFrame: url => ipcRenderer.send('settings-app:frame', url), // the settings app's own Robo
    // packs (license-main.cjs): which paid apps are open
    licenseGet: () => ipcRenderer.invoke('license:get'),
    onLicense: callback => subscribe('license:changed', callback),
    onBuddy: callback => {
      subscribe('buddy:home', () => callback('home'));
      subscribe('buddy:mood', data => callback('mood', data));
      subscribe('buddy:collapse', () => callback('collapse'));
      subscribe('buddy:dropped', () => callback('dropped'));
    }
  });
})();
