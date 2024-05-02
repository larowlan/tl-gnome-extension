'use strict';

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

const Mainloop = imports.mainloop

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
      icon_size: '16'
    }));
    this.label = new St.Label({ text: text });
    this.actor.add_child(this.label);
    this.connect('activate', callback);
  }
});
const TSummary = GObject.registerClass(
  {
    GTypeName: 'TlSummary'
  }, class TlSummary extends ModalDialog.ModalDialog {
    _init(titleTxt, content) {
    super._init({ styleClass: 'tl__summary'});
    const report = new St.Label({style_class: 'tl__summary-report', text: content})
    let headline = new St.BoxLayout({
      style_class: 'nm-dialog-header-hbox'
    });

  const icon = new St.Icon({
      icon_name: 'x-office-calendar-symbolic',
      icon_size: 16,
  });

  const titleBox = new St.BoxLayout({
      vertical: true
  });
  const title = new St.Label({
      style_class: 'nm-dialog-header',
      text: titleTxt
  });

  titleBox.add_child(title);

  headline.add_child(icon);
  headline.add_child(titleBox);

  this.contentLayout.style_class = 'nm-dialog-content';
  this.contentLayout.add_child(headline);

  // Create ScrollView and ItemBox
  const stack = new St.Widget({
      layout_manager: new Clutter.BinLayout()
  });

  const itemBox = new St.BoxLayout({
      vertical: true
  });
  const scrollView = new St.ScrollView({
      style_class: 'nm-dialog-scroll-view'
  });
  scrollView.set_x_expand(true);
  scrollView.set_y_expand(true);
  scrollView.set_policy(Gtk.PolicyType.AUTOMATIC,
      Gtk.PolicyType.AUTOMATIC);
  scrollView.add_child(itemBox);
  stack.add_child(scrollView);
  itemBox.add_child(report);

  this.contentLayout.add_child(stack);
                this.setButtons([{ action: this.close.bind(this),
                           label: _("Close"),
                           key: Clutter.Escape }]);
    }
});

const TlButton = GObject.registerClass(
  {
      GTypeName: 'TlButton'
  },class TlButton extends PanelMenu.Button {

  _notify (text) {
    const source = new MessageTray.Source({title:'tl', iconName:'document-open-recent-symbolic'});
    Main.messageTray.add(source);
    const notification = new MessageTray.Notification({source: source, title: text, isTransient: true});
    source.addNotification(notification);
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

  _execute (args, callback) {
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
    this._label.text = this._execute.bind(this)(['bitbar']);
    this._clearTimeout();
    this._timeout = Mainloop.timeout_add_seconds(15, this._updateText.bind(this));
  }

  _init() {
    super._init(0.0);
    this._label = new St.Label({text: "...", style_class: 'tl__tally'});
    let icon = new St.Icon({
      icon_name: 'document-open-recent-symbolic',
      icon_size: '16'
    });
    let topBox = new St.BoxLayout();
    topBox.add_child(icon);
    topBox.add_child(this._label);
    this.actor.add_child(topBox);

    this.menu.addMenuItem(new TlCommand('media-playback-stop-symbolic', 'Stop', this._stop.bind(this)));
    this.menu.addMenuItem(new TlCommand('media-playback-start-symbolic', 'Continue', this._continue.bind(this)));
    let newTask = new St.Entry({
      name: 'newTaskEntry',
      hint_text: _('start #...'),
      track_hover: true,
      can_focus: true,
      x_expand: true,
      y_expand: true,
    });

    let entryNewTask = newTask.clutter_text;

    entryNewTask.connect('key-press-event', ((o, e) => {
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
    }).bind(this));
    let newTaskSection = new PopupMenu.PopupMenuSection({style_class_name: 'tl__start'});
    const entryBox = new St.BoxLayout({
      vertical: false,
    });

    newTaskSection.actor.add_child(entryBox);
    entryBox.add_child(newTask)
    this.menu.addMenuItem(newTaskSection);
    this._updateText();
    Main.panel.menuManager.addMenu(this.menu);
    this._timeout = Mainloop.timeout_add_seconds(15, this._updateText.bind(this));

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this.menu.addMenuItem(new TlCommand('x-office-calendar-symbolic', 'Review', (() => {
      const summary = new TSummary('Unsent entries', this._execute(['review']));
		  summary.open();
    }).bind(this)));
    this.menu.addMenuItem(new TlCommand('x-office-calendar-symbolic', 'Summary', (() => {
      const summary = new TSummary('Monthly summary', this._execute(['bill', 'month']));
		  summary.open();
    }).bind(this)));

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

export default class TlExtension {
    enable() {
      button = new TlButton();
      Main.panel.addToStatusArea('tl', button);
    }

    disable() {
      button.destroy();
      button = null;
    }
}

