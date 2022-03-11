'use strict';

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;
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
        super._init({ styleClass: 'tl__summary',
                destroyOnClose: true });
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

  titleBox.add(title);

  headline.add(icon);
  headline.add(titleBox);

  this.contentLayout.style_class = 'nm-dialog-content';
  this.contentLayout.add(headline);

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
  scrollView.add_actor(itemBox);
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
    topBox.add_actor(icon);
    topBox.add_actor(this._label);
    this.actor.add_child(topBox);

    this.menu.addMenuItem(new TlCommand('media-playback-stop-symbolic', 'Stop', this._stop.bind(this)));
    this.menu.addMenuItem(new TlCommand('media-playback-start-symbolic', 'Continue', this._continue.bind(this)));
    let newTask = new St.Entry({
      name: 'newTaskEntry',
      hint_text: _('start #...'),
      track_hover: true,
      can_focus: true
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
    let newTaskSection = new PopupMenu.PopupMenuSection();
    newTaskSection.actor.add_actor(newTask);
    newTaskSection.actor.add_style_class_name('tl__start');
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

function enable() {
  button = new TlButton();
  Main.panel.addToStatusArea('tl', button);
}

function disable() {
  button.destroy();
  button = null;
}
