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
    window.hax = {
        isRestingWhenBeat: true, // rest when stam hits zero, turn this off to level persistence
        lastLocation: null,
        lastCombatLocation: null
    };
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


    hax.bottomPanelDiv = () => getById("bottom_panel_div");
    hax.isAutoReturnToFightCheckBox = () => getById("is_auto_returning_to_fights");
    hax.isEnabled = () => {
        const cb = hax.isAutoReturnToFightCheckBox();
        return !cb || cb.checked; // default ON until checkbox exists
    };

    const addToggle = () => {
        const bottom = hax.bottomPanelDiv();
        if (!bottom || hax.isAutoReturnToFightCheckBox()) return;

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = "is_auto_returning_to_fights";
        cb.checked = true;

        const label = document.createElement("label");
        label.id = "return_to_fights_label";
        label.htmlFor = cb.id;
        label.textContent = " Auto-farm";

        const wrap = document.createElement("span");
        wrap.appendChild(cb);
        wrap.appendChild(label);

        addElemAt(bottom, wrap, 2);
    };

    // may not need interval here... test this
    addToggle();
    // setInterval(addToggle, 500);

    hax.healthSpan = () => getById("character_healthbar_current");
    hax.parseHp = () => hax.healthSpan().style.width.replace("%", "") / 100;
    hax.stamSpan = () => getById("character_stamina_bar_current");
    hax.parseStam = () => hax.stamSpan().style.width.replace("%", "") / 100;
    hax.isMaxed = () => hax.parseStam() == 1 && hax.parseHp() == 1;
    hax.location = () => getById("location_name_span").innerHTML;
    hax.isBeat = () => hax.isRestingWhenBeat && hax.parseStam() == 0;
    hax.isAtHome = () => getByClass("location_bed_icon").length > 0;
    hax.actionStatusDiv = () => getById("action_status_div");
    hax.isSleeping = () => innerHas(hax.actionStatusDiv(), "Sleeping");
    hax.wakeButton = () => getById("action_end_div");
    hax.wakeUp = () => tryClick(hax.wakeButton());
    hax.combatDiv = () => getById("combat_div");
    hax.isFighting = () => hax.combatDiv() && hax.combatDiv().style.display != "none";
    hax.navigationOptions = () => findAnyAttribute("data-travel");
    hax.quickReturnOption = () => findElem(hax.navigationOptions(), "Quick return");
    hax.quickReturn = () => tryClick(hax.quickReturnOption());
    hax.travelRoots = () => getByClass("choice_travel");
    hax.fastTravelRoot = () => findElem(hax.travelRoots(), "Fast travel");
    hax.isFastTravelRootExpanded = () => classHas(hax.fastTravelRoot(), "location_choice_dropdown_expanded");
    hax.openFastTravelMenu = () => tryClick(hax.fastTravelRoot());
    hax.favoriteIconSpan = () => getById("location_icon_span");
    hax.isFavorited = () => !innerHas(hax.favoriteIconSpan(), "star_border");
    hax.isReadyToWakeUp = () => hax.isAtHome() && hax.isSleeping() && hax.isMaxed();
    hax.isDoneResting = () => hax.isAtHome() && !hax.isSleeping() && hax.isMaxed();
    hax.sleepDiv = () => getById("start_sleeping_div");
    hax.sleep = () => tryClick(hax.sleepDiv());
    hax.fastTravelOptions = () => getByClass("fast_travel_name");
    hax.fastTravelToFight = () => findElem(hax.fastTravelOptions(), hax.lastCombatLocation);
    hax.returnToFight = () => tryClick(hax.fastTravelToFight());

    // intervals/automation
    // rest when "beat" when fighting
    setInterval(() => {
        if (!hax.isEnabled()) return;

        if (hax.isBeat() && hax.isRestingWhenBeat) {
            if (hax.isFighting()) {
                hax.quickReturn();
            } else if (hax.isAtHome()) {
                hax.sleep();
            }
        }
    }, 50);

    setInterval(() => hax.isEnabled() && hax.isReadyToWakeUp() && hax.wakeUp(), 50);

    setInterval(() => {
        if (!hax.isEnabled()) return;
        if (hax.isDoneResting()) {
            if (hax.isFastTravelRootExpanded()) {
                hax.returnToFight();
            } else {
                hax.openFastTravelMenu();
            }
        }
    }, 50);

    setInterval(() => {
        if (!hax.isEnabled()) return;
        if (hax.isFighting()) {
            if (hax.lastLocation != hax.location()) {
                hax.lastLocation = hax.location();
            }
            if (!hax.isFavorited()) {
                hax.favoriteIconSpan().click();
            }
            if (hax.lastLocation != hax.lastCombatLocation) {
                hax.lastCombatLocation = hax.lastLocation;
            }
        }
    }, 50);
})();
