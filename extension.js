const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

let button;

const TlButton = new Lang.Class({
  Name: 'TlButton',

  _text: null,

  Extends: PanelMenu.Button,

  _timeout: undefined,

  _notify: function(text) {
    let source = new MessageTray.Source('tl', 'document-open-recent-symbolic');
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, text, '');
    notification.setTransient(true);
    source.notify(notification);
  },

  _stop: function() {
    let text = this._execute('stop');
    this._notify(text);
    this._updateText();
  },

  _continue: function() {
    let text = this._execute('continue');
    this._notify(text);
    this._updateText();
  },

  _execute: function(command) {
    let out = {};
    let result = GLib.spawn_sync(null, ["/home/rowlands/bin/tl", command], null, GLib.SpawnFlags.SEARCH_PATH, null, null);
    let [status, text, error] = result;
    if (text.constructor.name !== 'String') {
      text = String.fromCharCode.apply(String, text);
    }
    return text;
  },

  _updateText: function() {
    let text = Lang.bind(this, this._execute)('bitbar');
    this._label.text = text;
    this._clearTimeout();
    this._timeout = Mainloop.timeout_add_seconds(15, Lang.bind(this, this._updateText));
  },

  _stopButton: null,
  _continueButton: null,
  _buttonBox: null,
  _buttonMenu: null,
  menu: null,

  _init: function() {
    this.parent(0.0);
    this._label = new St.Label({text: "..."});
    this.actor.add_child(this._label);

    this._stopButton = new PopupMenu.PopupMenuItem('Stop');
    this._stopButton.connect('activate', Lang.bind(this, this._stop));
    let stopIcon = new St.Icon({ icon_name: 'media-playback-stop-symbolic', icon_size: 22});
    this._stopButton.actor.add_actor(stopIcon);
    this.menu.addMenuItem(this._stopButton);
    this._continueButton = new PopupMenu.PopupMenuItem('Continue');
    this._continueButton.connect('activate', Lang.bind(this, this._continue));
    let continueIcon = new St.Icon({ icon_name: 'media-playback-start-symbolic', icon_size: 22});
    this._continueButton.actor.add_actor(continueIcon);
    this.menu.addMenuItem(this._continueButton);
    this._updateText();
    Main.panel.menuManager.addMenu(this.menu);
    this._timeout = Mainloop.timeout_add_seconds(15, Lang.bind(this, this._updateText));
  },

  destroy: function() {
    this._clearTimeout();
  },

  _clearTimeout: function() {
    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
      this._timeout = undefined;
    }
  }

});

function init() {
  // Nil op.
}

function enable() {
  button = new TlButton();
  Main.panel.addToStatusArea('tl', button);
}

function disable() {
  button.destroy();
}
