// ==UserScript==
// @name         Auto-Farm YAIRPG
// @namespace    http://tampermonkey.net/
// @version      2025-06-25
// @description  When stam hits zero, rest. When resting, if done, resume farming. Farming returns to wherever your stam hit zero or you died.
// @author       You
// @match        https://miktaew.github.io/yet-another-idle-rpg/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.io
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    // you can change these settings if you want
    window.hax = { lastLocation: null, lastCombatLocation: null };
    const hax = window.hax;

    const getById = (s) => document.getElementById(s);
    const getByClass = (s) => document.querySelectorAll(`.${s}`);
    const findAnyAttribute = (s) => document.querySelectorAll(`[${s}]`);
    const innerHas = (e, s) => e && e.innerHTML.includes(s);
    const classHas = (e, s) => e && e.className.includes(s);
    const tryClick = (e) => e && e.click();
    const findElem = (a, s) => [...a].find(r => innerHas(r, s));

    const addElemAt = (a, elem, i) => {
        if (!a || !elem) return;
        const kids = [...a.children];
        if (i == null || i < 0 || i >= kids.length) a.appendChild(elem);
        else a.insertBefore(elem, kids[i]);
    };

    // dom constants
    const bottomPanelDiv = "bottom_panel_div";
    const autoReturnCheckBox = "is_auto_returning_to_fights";
    const autoReturnLabel = "return_to_fights_label";
    const restWhenTiredCheckBox = "is_resting_when_tired";
    const restWhenTiredLabel = "rests_when_tired_label";

    hax.bottomPanelDiv = () => getById(bottomPanelDiv);
    hax.autoFarmCheckBox = () => getById(autoReturnCheckBox);
    hax.autoFarmLocationLabel = () => getById(autoReturnLabel);
    hax.isEnabled = () => {
        const cb = hax.autoFarmCheckBox();
        return !cb || cb.checked; // default ON until checkbox exists
    };
    hax.autoRestCheckBox = () => getById(restWhenTiredCheckBox);
    hax.autoRestLabel = () => getById(restWhenTiredLabel);
    hax.isRestingWhenTired = () => {
        const cb = hax.autoRestCheckBox();
        return !cb || cb.checked; // default ON until checkbox exists
    };

    hax.getFarmLocationLabel = () => `Auto-Return to [${hax.lastLocation ?? "Awaiting Fight"}]`;
    hax.createCheckBox = (cbId, lbId, labelFunc, index) => {
        const bottom = hax.bottomPanelDiv();
        if (!bottom || getById(cbId)) return;

        const div = document.createElement("div");
        div.id = `${cbId}Div`;        
        div.classList.add("sl_button");

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = cbId;
        cb.checked = false;

        const label = document.createElement("label");
        label.id = lbId;
        label.htmlFor = cb.id;
        label.textContent = labelFunc();

        div.appendChild(cb);
        div.appendChild(label);

        addElemAt(bottom, div, index);
    };
    hax.addEnableFarmToggle = () => hax.createCheckBox(autoReturnCheckBox, autoReturnLabel, 
            hax.getFarmLocationLabel, 7);
    hax.addEnableTiredResting = () => hax.createCheckBox(restWhenTiredCheckBox, restWhenTiredLabel, 
            () => " Rest When Tired", 7);

    // may not need interval here... test this
    hax.addEnableTiredResting();
    hax.addEnableFarmToggle();
    // setInterval(addToggle, 500);

    hax.actionStatusDiv = () => getById("action_status_div");
    hax.wakeButton = () => getById("action_end_div");
    hax.combatDiv = () => getById("combat_div");
    hax.location = () => getById("location_name_span").innerHTML;
    hax.setLocation = () => {
        hax.lastLocation = hax.location();
        const label = getById(autoReturnLabel);
        label.textContent = hax.getFarmLocationLabel();
    };

    // health and stamina parsing
    hax.healthSpan = () => getById("character_healthbar_current");
    hax.stamSpan = () => getById("character_stamina_bar_current");
    hax.parseHp = () => hax.healthSpan().style.width.replace("%", "") / 100;
    hax.parseStam = () => hax.stamSpan().style.width.replace("%", "") / 100;
    hax.isMaxed = () => hax.parseStam() == 1 && hax.parseHp() == 1;
    hax.isTired = () => hax.isRestingWhenTired() && hax.parseStam() == 0;

    // fast travel controls
    hax.favoriteIconSpan = () => getById("location_icon_span");
    hax.fastTravelOptions = () => getByClass("fast_travel_name");
    hax.isAtHome = () => getByClass("location_bed_icon").length > 0;
    hax.travelRoots = () => getByClass("choice_travel");
    hax.navigationOptions = () => findAnyAttribute("data-travel");
    hax.quickReturnOption = () => findElem(hax.navigationOptions(), "Quick return");
    hax.quickReturn = () => tryClick(hax.quickReturnOption());
    hax.fastTravelRoot = () => findElem(hax.travelRoots(), "Fast travel");
    hax.isFastTravelRootExpanded = () => classHas(hax.fastTravelRoot(), "location_choice_dropdown_expanded");
    hax.openFastTravelMenu = () => tryClick(hax.fastTravelRoot());
    hax.isFavorited = () => !innerHas(hax.favoriteIconSpan(), "star_border");

    // resting
    hax.sleepDiv = () => getById("start_sleeping_div");
    hax.isSleeping = () => innerHas(hax.actionStatusDiv(), "Sleeping");
    hax.wakeUp = () => tryClick(hax.wakeButton());
    hax.sleep = () => tryClick(hax.sleepDiv());
    hax.isReadyToWakeUp = () => hax.isAtHome() && hax.isSleeping() && hax.isMaxed();
    hax.isDoneResting = () => hax.isAtHome() && !hax.isSleeping() && hax.isMaxed();

    // fight logic
    hax.isFighting = () => hax.combatDiv() && hax.combatDiv().style.display != "none";
    hax.fastTravelToFight = () => findElem(hax.fastTravelOptions(), hax.lastCombatLocation);
    hax.returnToFight = () => tryClick(hax.fastTravelToFight());

    // intervals/automation
    // rest when tired when fighting
    const tryResting = setInterval(() => {
        if (!hax.isEnabled()) return;

        if (hax.isTired() && hax.isRestingWhenTired()) {
            if (hax.isFighting()) {
                hax.quickReturn();
            } else if (hax.isAtHome()) {
                hax.sleep();
            }
        }
    }, 50);

    const tryWaking = setInterval(() => hax.isEnabled() && hax.isReadyToWakeUp() && hax.wakeUp(), 50);

    const tryReturningToFight = setInterval(() => {
        if (!hax.isEnabled()) return;
        if (hax.isDoneResting()) {
            if (hax.isFastTravelRootExpanded()) {
                hax.returnToFight();
            } else {
                hax.openFastTravelMenu();
            }
        }
    }, 50);

    const trackMe = setInterval(() => {
        if (hax.isFighting()) {
            if (hax.lastLocation != hax.location()) {
                hax.setLocation(hax.location());
            }
            if (!hax.isEnabled()) return;
            if (!hax.isFavorited()) {
                hax.favoriteIconSpan().click();
            }
            if (hax.lastLocation != hax.lastCombatLocation) {
                hax.lastCombatLocation = hax.lastLocation;
            }
        }
    }, 50);
})();
