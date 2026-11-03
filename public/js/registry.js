// Central registry: to add a ship, map or level, create its file in
// js/ships/, js/maps/ or js/levels/ and add one import + array entry here.
import gunboat from './ships/gunboat.js';
import destroyer from './ships/destroyer.js';
import battleship from './ships/battleship.js';

import map1 from './maps/map1.js';

import level1 from './levels/level1.js';
import level2 from './levels/level2.js';

export const SHIPS = [gunboat, destroyer, battleship];
export const shipById = (id) => SHIPS.find(s => s.id === id);

export const MAPS = [map1];
export const mapById = (id) => MAPS.find(m => m.id === id);

export const LEVELS = [level1, level2];
export const levelById = (id) => LEVELS.find(l => l.id === id);
