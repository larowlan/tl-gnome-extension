'use strict';

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const GObject = imports.gi.GObject;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

let button;

const TlCommand = GObject.registerClass(
  {
      GTypeName: 'TlCommand'
  },
class TlCommand extends PopupMenu.PopupBaseMenuItem {
  _init(icon, text, callback, params) {
    super._init(params);
    this.actor.add_child(new St.Icon({
      icon_name: icon,
      icon_size: '22'
    }));
    this.label = new St.Label({ text: text });
    this.actor.add_child(this.label);
    this.connect('activate', callback);
  }
});

const TlButton = GObject.registerClass(
  {
      GTypeName: 'TlButton'
  },class TlButton extends PanelMenu.Button {

  _notify (text) {
    const source = new MessageTray.Source('tl', 'document-open-recent-symbolic');
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification(source, text, '');
    notification.setTransient(true);
    source.showNotification(notification);
  }

  _stop () {
    const text = this._execute(['stop']);
    this._notify(text);
    this._updateText();
  }

  _continue () {
    const text = this._execute(['continue']);
    this._notify(text);
    this._updateText();
  }

  _execute (args) {
    args.unshift("tl");
    let out = {};
    let result = GLib.spawn_sync(null, args, null, GLib.SpawnFlags.SEARCH_PATH, null);
    let [status, text, error] = result;
    if (text.constructor.name !== 'String') {
      text = String.fromCharCode.apply(String, text);
    }
    return text;
  }

  _updateText () {
    this._label.text = Lang.bind(this, this._execute)(['bitbar']);
    this._clearTimeout();
    this._timeout = Mainloop.timeout_add_seconds(15, Lang.bind(this, this._updateText));
  }

  _init() {
    super._init(0.0);
    this._label = new St.Label({text: "...", style_class: 'tl__tally'});
    let icon = new St.Icon({
      icon_name: 'document-open-recent-symbolic',
      icon_size: '16'
    });
    let topBox = new St.BoxLayout();
    topBox.add_actor(icon);
    topBox.add_actor(this._label);
    this.actor.add_child(topBox);

    this.menu.addMenuItem(new TlCommand('media-playback-stop-symbolic', 'Stop', Lang.bind(this, this._stop)));
    this.menu.addMenuItem(new TlCommand('media-playback-start-symbolic', 'Continue', Lang.bind(this, this._continue)));

    let newTask = new St.Entry({
      name: 'newTaskEntry',
      hint_text: _('start #...'),
      track_hover: true,
      can_focus: true
    });

    let entryNewTask = newTask.clutter_text;

    entryNewTask.connect('key-press-event', Lang.bind(this, function(o, e) {
      let symbol = e.get_key_symbol();
      if ((symbol == Clutter.KEY_Return) || (symbol == Clutter.KEY_KP_Enter)) {
        this.menu.close();
        if (o.get_text() === '') {
          return;
        }
        this._execute(['stop']);
        this._notify(this._execute(['start', o.get_text()]));
        o.set_text(null);
        this._updateText();
      }
    }));
    let newTaskSection = new PopupMenu.PopupMenuSection();
    newTaskSection.actor.add_actor(newTask);
    newTaskSection.actor.add_style_class_name('tl__start');
    this.menu.addMenuItem(newTaskSection);
    this._updateText();
    Main.panel.menuManager.addMenu(this.menu);
    this._timeout = Mainloop.timeout_add_seconds(15, Lang.bind(this, this._updateText));
  }

  destroy() {
    this._clearTimeout();
  }

  _clearTimeout() {
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
  button = null;
}
