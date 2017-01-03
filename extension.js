const St = imports.gi.St;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

let button;

const TlCommand = new Lang.Class({
  Name: 'TlCommand',
  Extends: PopupMenu.PopupBaseMenuItem,
  _init: function(icon, text, callback, params) {
    this.parent(params);
    this.actor.add_child(new St.Icon({
      icon_name: icon,
      icon_size: '22'
    }));
    this.label = new St.Label({ text: text });
    this.actor.add_child(this.label);
    this.connect('activate', callback);
  }
});

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
    this._label.text = Lang.bind(this, this._execute)('bitbar');;
    this._clearTimeout();
    this._timeout = Mainloop.timeout_add_seconds(15, Lang.bind(this, this._updateText));
  },

  _stopButton: null,
  _continueButton: null,
  _buttonMenu: null,
  menu: null,

  _init: function() {
    this.parent(0.0);
    this._label = new St.Label({text: "..."});
    let icon = new St.Icon({
      icon_name: 'document-open-recent-symbolic',
      icon_size: '22'
    });
    let topBox = new St.BoxLayout();
    topBox.add_actor(icon);
    topBox.add_actor(this._label);
    this.actor.add_child(topBox);

    this.menu.addMenuItem(new TlCommand('media-playback-stop-symbolic', 'Stop', Lang.bind(this, this._stop)));
    this.menu.addMenuItem(new TlCommand('media-playback-start-symbolic', 'Continue', Lang.bind(this, this._continue)));
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
