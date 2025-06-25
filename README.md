Allows you to automatically rest when stam is depleted, and automatically return to the fight where you died or lost your stamina. This lets you semi-automatically farm combat areas and go afk.

To run it you can either add the js as a tampermonkey script or, in your bookmarks, create a bookmarklet.

It's like a javascript bookmark you run from the same tab as the game.
Change the url of the bookmark to this and name it something like "YAIRPG Fight AFK".

```javascript:(function(){var d=document,s=d.createElement('script');s.src='https://raw.githubusercontent.com/MercuriusXeno/YAIRPG-script/refs/heads/main/afk_combat.min.js';d.body.appendChild(s);})();```
