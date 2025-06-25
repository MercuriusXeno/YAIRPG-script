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

(function() {
    'use strict';
    // you can change these settings if you want
    window.hax = {
        isRestingWhenBeat: true, // rest when stam hits zero, turn this off to level persistence
        lastLocation: null,
        lastCombatLocation: null,
        isMovedAutomatically: false // set when moving automatically, tracks if player disrupts movement
    };
    const hax = window.hax;
    // shorteners
    const getById = (s) => document.getElementById(s);
    const getByClass = (s) => document.querySelectorAll(`.${s}`);
    const findAnyAttribute = (s) => document.querySelectorAll(`[${s}]`);
    const innerHas = (e, s) => e.innerHTML.includes(s);
    const classHas = (e, s) => e.className.includes(s);
    const tryClick = (e) => e && e.click();
    // main lambda functions we use for logic
    hax.healthSpan = () => getById("character_healthbar_current");
    hax.parseHp = () => hax.healthSpan().style.width.replace("%", "") / 100;
    hax.stamSpan = () => getById("character_stamina_bar_current");
    hax.parseStam = () => hax.stamSpan().style.width.replace("%", "") / 100;
    hax.isMaxed = () => hax.parseStam() == 1 && hax.parseHp() == 1;
    hax.location = () => getById("location_name_span").innerHTML;
    hax.isBeat = () => hax.isRestingWhenBeat && hax.parseStam() == 0;
    hax.isAtHome = () => getByClass("location_bed_icon").length > 0;
    hax.actionStatusDiv = () => getById("action_status_div");
    hax.isSleeping = () => hax.actionStatusDiv() && innerHas(hax.actionStatusDiv(),"Sleeping");
    hax.wakeButton = () => getById("action_end_div");
    hax.wakeUp = () => tryClick(hax.wakeButton());
    hax.combatDiv = () => getById("combat_div");
    hax.isFighting = () => hax.combatDiv() && hax.combatDiv().style.display != "none";
    hax.navigationOptions = () => findAnyAttribute("data-travel");
    hax.quickReturnOption = () => [...hax.navigationOptions()].find(n => innerHas(n, "Quick return"));
    hax.quickReturn = () => tryClick(hax.quickReturnOption());
    hax.travelRoots = () => getByClass("choice_travel");
    hax.fastTravelRoot = () => hax.travelRoots().length > 0 && [...hax.travelRoots()].find(r => innerHas(r, "Fast travel"));
    hax.isFastTravelRootExpanded = () => hax.fastTravelRoot() && classHas(hax.fastTravelRoot(), "location_choice_dropdown_expanded");
    hax.openFastTravelMenu = () => tryClick(hax.fastTravelRoot());
    hax.favoriteIconSpan = () => getById("location_icon_span");
    hax.isFavorited = () => !innerHas(hax.favoriteIconSpan(),"star_border");
    hax.isReadyToWakeUp = () => hax.isAtHome() && hax.isSleeping() && hax.isMaxed();
    hax.isDoneResting = () => hax.isAtHome() && !hax.isSleeping() && hax.isMaxed();
    hax.sleepDiv = () => getById("start_sleeping_div");
    hax.sleep = () => tryClick(hax.sleepDiv());
    hax.fastTravelOptions = () => getByClass("fast_travel_name");
    hax.fastTravelToFight = () => hax.fastTravelOptions().find(o => innerHas(o, hax.lastCombatLocation));
    hax.returnToFight = () => tryClick(hax.fastTravelToFight());
    // intervals/automation
    // rest when "beat" when fighting
    const tryResting = setInterval(() => {
        if (hax.isBeat() && hax.isRestingWhenBeat) {
            if (hax.isFighting()) {
                hax.quickReturn();
                hax.isMovedAutomatically = true;
            }
            else if (hax.isAtHome()) {
                hax.sleep();
            }
        }
    }, 100);

    const tryWaking = setInterval(() => hax.isReadyToWakeUp() && hax.wakeUp(), 1000);

    const tryReturningToFight = setInterval(() => {
        if (hax.isDoneResting()) {
            // open the fast travel menu if it isn't already
            if (hax.isFastTravelRootExpanded()) {
                hax.returnToFight();
            }
            else {
                hax.openFastTravelMenu();
            }
        }
    });

    const trackMe = setInterval(() => {
        if (hax.lastLocation != hax.location() && !hax.isMovedAutomatically) {
            hax.lastLocation = hax.location();
            console.log(`player moved to ${hax.lastLocation}`);
        }
        if (hax.isFighting()) {
            if (!hax.isFavorited()) {
                hax.favoriteIconSpan().click();
            }
            if (hax.lastLocation != hax.lastCombatLocation) {
                hax.lastCombatLocation = hax.lastLocation;
            }
        }
        if (hax.isMovedAutomatically) {
            hax.isMovedAutomatically = false;
        }
    }, 100);
})();
