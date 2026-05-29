import { create } from 'zustand';

import { MAX_SHORTCUTS } from './shortcut.config';

export interface AdminShortcut {
  id: string;
  label: string;
  path: string;
}

interface ShortcutState {
  shortcutsByUser: Record<string, AdminShortcut[]>;
  loadShortcuts: (userId: string) => void;
  addShortcut: (userId: string, shortcut: AdminShortcut) => void;
  removeShortcut: (userId: string, id: string) => void;
  toggleShortcut: (userId: string, shortcut: AdminShortcut) => void;
}

const storageKey = (userId: string) => `admin-shortcuts-${userId}`;

function readStorage(userId: string): AdminShortcut[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AdminShortcut[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(userId: string, shortcuts: AdminShortcut[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(shortcuts));
  } catch {
    // ignore
  }
}

export const useShortcutStore = create<ShortcutState>()((set, get) => ({
  shortcutsByUser: {},

  loadShortcuts: (userId) => {
    const shortcuts = readStorage(userId);
    set((state) => ({
      shortcutsByUser: { ...state.shortcutsByUser, [userId]: shortcuts },
    }));
  },

  addShortcut: (userId, shortcut) =>
    set((state) => {
      const current = state.shortcutsByUser[userId] ?? [];
      if (current.length >= MAX_SHORTCUTS || current.some((s) => s.id === shortcut.id)) {
        return state;
      }
      const next = [...current, shortcut];
      writeStorage(userId, next);
      return { shortcutsByUser: { ...state.shortcutsByUser, [userId]: next } };
    }),

  removeShortcut: (userId, id) =>
    set((state) => {
      const next = (state.shortcutsByUser[userId] ?? []).filter((s) => s.id !== id);
      writeStorage(userId, next);
      return { shortcutsByUser: { ...state.shortcutsByUser, [userId]: next } };
    }),

  toggleShortcut: (userId, shortcut) => {
    const current = get().shortcutsByUser[userId] ?? [];
    if (current.some((s) => s.id === shortcut.id)) {
      get().removeShortcut(userId, shortcut.id);
    } else {
      get().addShortcut(userId, shortcut);
    }
  },
}));
