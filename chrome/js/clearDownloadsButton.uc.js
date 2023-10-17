// ==UserScript==
// @name           Clear Downloads Panel Button
// @version        1.4.1
// @author         aminomancer
// @homepage       https://github.com/aminomancer/uc.css.js
// @description    Place a "Clear Downloads" button in the downloads panel,
//                 right next to the "Show all downloads" button.
// @license        This Source Code Form is subject to the terms of the Creative Commons Attribution-NonCommercial-ShareAlike International License, v. 4.0. If a copy of the CC BY-NC-SA 4.0 was not distributed with this file, You can obtain one at http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
// ==/UserScript==

class ClearDLPanel {
    config = {
        // the "Show all downloads" button is in sentence case, but the
        // localized "Clear Downloads" button string is from a context menu, so
        // it's in "Title Case". if you want both in sentence case use this.
        // I've tried to account for other alphabets or RTL languages but user
        // will be the judge
        "Label in sentence case": true
    };
    constructor() {
        this.makeButton();
        this.setCountHandler();
        Services.obs.addObserver(this, "downloads-panel-count-changed");
    }
    async genStrings() {
        this.strings = await new Localization(["browser/downloads.ftl"], true);
        const messages = await this.strings.formatMessages([
            "downloads-cmd-clear-downloads"
        ]);
        this.label = messages[0].attributes[0].value;
        this.accessKey = messages[0].attributes[1].value;
        return [this.label, this.accessKey];
    }
    async makeButton() {
        this.clearPanelButton = document.createXULElement("button");
        let strings = await this.genStrings();
        let labelString = this.config["Label in sentence case"]
            ? this.sentenceCase(strings[0])
            : strings[0];
        for (const [key, val] of Object.entries({
            id: "clearDownloadsPanel",
            class:
                DownloadsView.downloadsHistory.className ||
                "downloadsPanelFooterButton subviewbutton panel-subview-footer-button toolbarbutton-1",
            oncommand: `goDoCommand('downloadsCmd_clearList'); DownloadsPanel.hidePanel();`,
            label: labelString,
            accesskey: strings[1],
            flex: "1",
            pack: "start"
        })) {
            this.clearPanelButton.setAttribute(key, val);
        }
        DownloadsView.downloadsHistory.after(this.clearPanelButton);
        this.clearPanelButton.hidden =
            !DownloadsView._visibleViewItems?.size > 0;
        this.clearPanelButton
            ?.closest("#downloadsFooter")
            .prepend(document.createXULElement("toolbarseparator"));
        this.clearPanelButton?.parentElement.setAttribute("uc-hbox", "true");
    }
    sentenceCase(str) {
        return str
            .toLocaleLowerCase()
            .replace(RTL_UI ? /.$/i : /^./i, function (letter) {
                return letter.toLocaleUpperCase();
            })
            .trim();
    }
    setCountHandler() {
        eval(
            `DownloadsView._itemCountChanged = function ${DownloadsView._itemCountChanged
                .toSource()
                .replace(
                    /hiddenCount \> 0\;\n/,
                    `hiddenCount > 0;\n    Services.obs.notifyObservers(null, "downloads-panel-count-changed", String(count));\n`
                )}`
        );
    }
    observe(_sub, _top, data) {
        this.clearPanelButton.hidden = parseInt(data) < 1;
    }
}

if (gBrowserInit.delayedStartupFinished) {
    new ClearDLPanel();
} else {
    let delayedListener = (subject, topic) => {
        if (topic == "browser-delayed-startup-finished" && subject == window) {
            Services.obs.removeObserver(delayedListener, topic);
            new ClearDLPanel();
        }
    };
    Services.obs.addObserver(
        delayedListener,
        "browser-delayed-startup-finished"
    );
}
