// Cubo Blocks — The theme being played (a world's in Aventure, else the equipped one) and its block palette.
'use strict';

// An Aventure level or a Mondes run wears its world's theme; otherwise the equipped one.
const worldOf = () => (state ? (state.stage ? state.stage.world : state.world) || null : null);
const themeId = () => worldOf() || profile.equipped.boards;
const theme = () => THEMES[themeId()] || THEMES.toy;
// Rétro levels squash every shape family into three LCD greens (the world's drawback).
const RETRO4 = [null, ...Array.from({ length: 14 }, (_, i) => ['#0f380f', '#306230', '#4d7a1e'][i % 3])];
const pal = () => (worldOf() === 'retro' ? RETRO4 : paletteOf(theme()));
const blockSkin = () => BLOCK_SKINS[profile.equipped.blocks] || BLOCK_SKINS.classic;
const fmt = (n) => n.toLocaleString(locale());
const COIN = '<i class="coin"></i>';
