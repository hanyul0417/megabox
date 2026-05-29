import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { MAX_SHORTCUTS } from './shortcut.config';

export interface AdminShortcut {
  id: string;
  label: string;
  path: string;
}

interface ShortcutState {
  shortcutsByUser: Record<string, AdminShortcut[]>;
  addShortcut: (userId: string, shortcut: AdminShortcut) => void;
  removeShortcut: (userId: string, id: string) => void;
  toggleShortcut: (userId: string, shortcut: AdminShortcut) => void;
}

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set, get) => ({
      shortcutsByUser: {},

      addShortcut: (userId, shortcut) =>
        set((state) => {
          const current = state.shortcutsByUser[userId] ?? [];
          if (current.length >= MAX_SHORTCUTS) return state;
          if (current.some((s) => s.id === shortcut.id)) return state;
          return {
            shortcutsByUser: {
              ...state.shortcutsByUser,
              [userId]: [...current, shortcut],
            },
          };
        }),

      removeShortcut: (userId, id) =>
        set((state) => ({
          shortcutsByUser: {
            ...state.shortcutsByUser,
            [userId]: (state.shortcutsByUser[userId] ?? []).filter((s) => s.id !== id),
          },
        })),

      toggleShortcut: (userId, shortcut) => {
        const current = get().shortcutsByUser[userId] ?? [];
        if (current.some((s) => s.id === shortcut.id)) {
          get().removeShortcut(userId, shortcut.id);
        } else {
          get().addShortcut(userId, shortcut);
        }
      },
    }),
    { name: 'admin-shortcuts' },
  ),
);
