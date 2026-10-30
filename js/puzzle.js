// Shared puzzle data and daily selection.
//
// Loaded by the browser as a classic script (index.html) and imported by the
// hint function (netlify/functions/chat.mts), so the page and the server agree
// on today's answer from one source. It sets a single global and exports
// nothing, which keeps it valid in both contexts.
(function (root) {
  // ────────────────────────────────────────────────
  // WORD LIST  [word, hint]
  // Lengths range 5–9 letters for variety
  // ────────────────────────────────────────────────
  const OSRS_SKILLS = [
    ["AGILITY", "Improves run energy restoration and unlocks shortcuts"],
    ["ATTACK", "Determines your accuracy with melee weapons"],
    ["CONSTRUCTION", "Lets you build and customise your Player-Owned House"],
    ["COOKING", "Used to prepare food for healing and buffs"],
    ["CRAFTING", "Used to create jewellery, leather armour, and more"],
    ["DEFENCE", "Reduces damage taken from enemy attacks"],
    ["FARMING", "Allows you to grow crops, herbs, and trees"],
    ["FIREMAKING", "Lets you light fires and burn logs"],
    ["FISHING", "Allows you to catch fish from rivers, lakes, and seas"],
    ["FLETCHING", "Lets you make bows, arrows, and bolts"],
    ["HERBLORE", "Allows you to make potions from herbs and ingredients"],
    ["HITPOINTS", "Determines your total health points"],
    ["HUNTER", "Allows you to track and catch creatures across Gielinor"],
    ["MAGIC", "Used to cast spells from spellbooks"],
    ["MINING", "Used to extract ores and gems from rocks"],
    ["PRAYER", "Lets you use protective and boosting prayers"],
    ["RANGED", "Determines accuracy and damage with bows and ranged weapons"],
    ["RUNECRAFT", "Allows you to craft magical runes at altars"],
    ["SAILING", "Lets you captain ships and explore the seas of Gielinor"],
    ["SLAYER", "Unlocks special monsters assigned by Slayer Masters"],
    ["SMITHING", "Lets you forge metal bars into weapons and armour"],
    ["STRENGTH", "Increases your maximum melee hit damage"],
    ["THIEVING", "Lets you pickpocket NPCs and steal from stalls"],
    ["WOODCUTTING", "Used to chop trees for logs"]
  ];

  const RUNES = [
    ["AIR", "A basic elemental rune used in many spells"],
    ["ASTRAL", "Used for Lunar spells and high-level magic"],
    ["BLOOD", "A powerful rune used in high-level combat spells"],
    ["BODY", "Used in stat-reducing and curse spells"],
    ["CHAOS", "Used in mid-level offensive combat spells"],
    ["COSMIC", "Used in jewellery enchanting spells"],
    ["DEATH", "Used in strong offensive and teleport spells"],
    ["EARTH", "A basic elemental rune used in many spells"],
    ["FIRE", "A basic elemental rune used in combat and utility spells"],
    ["LAW", "Used primarily for teleportation spells"],
    ["MIND", "Used in basic strike combat spells"],
    ["MIST", "A combination rune containing Air and Water elements"],
    ["MUD", "A combination rune containing Earth and Water elements"],
    ["NATURE", "Used for High Alchemy and item transformation spells"],
    ["SMOKE", "A combination rune containing Air and Fire elements"],
    ["SOUL", "Used in powerful utility and combat spells"],
    ["STEAM", "A combination rune containing Water and Fire elements"],
    ["WATER", "A basic elemental rune used in many spells"],
    ["WRATH", "Used in powerful surge and dragonfire spells"]
  ];

  const F2P_CITIES = [
    ["AL KHARID", "A desert city south of Lumbridge known for its mine and palace"],
    ["BARBARIAN VILLAGE", "A small settlement west of Varrock with stronghold access"],
    ["DRAYNOR VILLAGE", "A quiet village known for willow trees and Master Farmers"],
    ["EDGEVILLE", "A settlement on the edge of the Wilderness with a furnace and bank"],
    ["FALADOR", "A white stone city ruled by the White Knights"],
    ["LUMBRIDGE", "The starting city of Gielinor located beside the River Lum"],
    ["PORT SARIM", "A harbour town connecting ships across Gielinor"],
    ["RIMMINGTON", "A small village west of Port Sarim near player house portals"],
    ["VARROCK", "A major trading city with the Grand Exchange and Varrock Palace"],
    ["WIZARDS' TOWER", "A magical tower south of Draynor inhabited by wizards"]
  ];

  const P2P_CITIES = [
    ["APE ATOLL", "A jungle island inhabited by monkeys and ninja guards"],
    ["ARCEUUS", "A dark magical district of Great Kourend focused on necromancy"],
    ["BURGH DE ROTT", "A rundown settlement deep within Morytania"],
    ["CAMELOT", "A royal city in Kandarin ruled by King Arthur"],
    ["CANIFIS", "A gloomy werewolf town in Morytania"],
    ["CATHERBY", "A coastal fishing town popular for Farming and Fishing"],
    ["DORGESH-KAAN", "A hidden underground city inhabited by cave goblins"],
    ["EAST ARDOUGNE", "A wealthy trading city in Kandarin"],
    ["ENTRANA", "A peaceful island inhabited by monks"],
    ["GNOME STRONGHOLD", "A massive tree city inhabited by gnomes"],
    ["HOSIDIUS", "A fertile farming district within Great Kourend"],
    ["KELDAGRIM", "A vast underground dwarven city"],
    ["LLETYA", "A hidden elven settlement within the forests of Tirannwn"],
    ["MENAPHOS", "A desert city sealed behind massive walls"],
    ["MOS LE'HARMLESS", "A pirate-controlled island settlement"],
    ["NEITIZNOT", "A Fremennik island village north of Rellekka"],
    ["PISCARILIUS", "A port district of Great Kourend focused on fishing"],
    ["PRIFDDINAS", "The crystal city of the elves"],
    ["RELLEKKA", "A Fremennik warrior city on the northern coast"],
    ["SHAYZIEN", "A military district of Great Kourend fighting the lizardmen"],
    ["SOPHANEM", "A desert city associated with plagues and the dead"],
    ["TAVERLEY", "A peaceful town associated with druids and Herblore"],
    ["TREE GNOME VILLAGE", "A hidden gnome settlement protected by maze-like defences"],
    ["WEST ARDOUGNE", "A quarantined section of Ardougne affected by plague"],
    ["YANILLE", "A walled magical city south of Ardougne"]
  ];

  const F2P_MONSTERS = [
    ["CHICKEN", "A weak farm animal commonly killed for early combat training"],
    ["COW", "A basic monster that drops cowhide and raw beef"],
    ["DARK WIZARD", "A dangerous low-level mage found near Varrock"],
    ["DEMON", "An infernal creature often fought for combat training"],
    ["GIANT", "A large creature known for dropping big bones"],
    ["GOBLIN", "A common low-level monster found across Gielinor"],
    ["HILL GIANT", "A popular training monster found in Edgeville Dungeon"],
    ["LESSER DEMON", "A powerful demon found in Karamja Volcano"],
    ["MOSS GIANT", "A bulky giant often fought for keys and combat XP"],
    ["SKELETON", "An undead creature found in dungeons and graveyards"]
  ];

  const P2P_MONSTERS = [
    ["ABYSSAL DEMON", "A high-level Slayer monster known for abyssal whips"],
    ["BASILISK", "A reptilian Slayer creature found in Fremennik regions"],
    ["CERBERUS", "A three-headed hellhound boss found in Taverley Dungeon"],
    ["DRAKE", "A wingless draconic creature found in Karuulm Slayer Dungeon"],
    ["GARGOYLE", "A Slayer monster requiring a rock hammer to finish"],
    ["HYDRA", "An alchemical beast assigned through the Slayer skill"],
    ["KRAKEN", "A sea monster boss fought using Magic"],
    ["KURASK", "A Slayer creature immune to most weapon types"],
    ["LIZARDMAN", "A reptilian enemy found across Great Kourend"],
    ["WYRM", "A draconic Slayer creature found in Mount Karuulm"]
  ];

  const SLAYER_MASTERS = [
    ["CHAELDAR", "A mid-level Slayer Master located in Zanaris"],
    ["DURADEL", "A high-level Slayer Master located in Shilo Village"],
    ["KONAR", "A Slayer Master assigning location-specific tasks"],
    ["KRYSTILIA", "A Wilderness Slayer Master located in Edgeville"],
    ["MAZCHNA", "An early Slayer Master located in Canifis"],
    ["NIEVE", "A popular Slayer Master found in the Tree Gnome Stronghold"],
    ["SPRIA", "A beginner Slayer Master located in Draynor Village"],
    ["TURAEL", "The easiest Slayer Master located in Burthorpe"],
    ["VANNAKA", "A mid-level Slayer Master found in Edgeville Dungeon"]
  ];

  const F2P_QUESTS = [
    ["BLACK KNIGHTS' FORTRESS", "Help the White Knights uncover a secret plot"],
    ["COOK'S ASSISTANT", "Gather ingredients for the Lumbridge Castle cook"],
    ["DEMON SLAYER", "Defeat the demon Delrith in Varrock"],
    ["DORIC'S QUEST", "Collect mining materials for Doric the dwarf"],
    ["DRAGON SLAYER I", "Defeat Elvarg to earn the right to wear rune platebody"],
    ["ERNEST THE CHICKEN", "Reverse a scientist's accidental chicken transformation"],
    ["GOBLIN DIPLOMACY", "Settle an argument between goblin generals"],
    ["IMP CATCHER", "Recover magical beads for Wizard Mizgog"],
    ["PRINCE ALI RESCUE", "Help Prince Ali escape from Lady Keli"],
    ["THE KNIGHT'S SWORD", "Forge a replacement sword for the White Knights"]
  ];

  // List of word groups

  const WORD_GROUPS = [
    OSRS_SKILLS,
    RUNES,
    F2P_CITIES,
    P2P_CITIES,
    F2P_MONSTERS,
    P2P_MONSTERS,
    SLAYER_MASTERS,
    F2P_QUESTS,
  ];

  const WORD_GROUP_NAMES = [
    'Skills',
    'Runes',
    'F2P Cities',
    'P2P Cities',
    'F2P Monsters',
    'P2P Monsters',
    'Slayer Masters',
    'F2P Quests',
  ];

  const RELEASE_DAY_UTC = Date.UTC(2026, 4, 14); // 14 May 2026 = day 0

  // Same LCG shuffle the game has always used, so existing streaks and answers are unchanged.
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed | 0;
    const rand = () => {
      s = Math.imul(s, 1664525) + 1013904223 | 0;
      return (s >>> 0) / 4294967296;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // [word, hint] for a given day number.
  function entryForDay(day) {
    const group = WORD_GROUPS[day % WORD_GROUPS.length];
    const shuffled = seededShuffle(group, 77777);
    return shuffled[day % shuffled.length];
  }

  function categoryForDay(day) {
    return WORD_GROUP_NAMES[day % WORD_GROUPS.length];
  }

  // Day number for a UTC timestamp. The browser uses the player's local date,
  // so the server accepts a day within one of this to cover every time zone.
  function utcDayNumber(nowMs) {
    const d = new Date(nowMs);
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.floor((midnight - RELEASE_DAY_UTC) / 86400000);
  }

  root.Wordlescape = {
    WORD_GROUPS,
    WORD_GROUP_NAMES,
    entryForDay,
    categoryForDay,
    utcDayNumber,
  };
})(globalThis);
