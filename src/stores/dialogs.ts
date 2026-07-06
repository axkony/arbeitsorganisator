import { create } from "zustand";

// Global "create" dialogs, so the native menu (or anything else) can open them
// from any route. The dialogs are mounted once in GlobalDialogs.
type DialogStore = {
  newSession: boolean;
  newTodo: boolean;
  newPatient: boolean;
  setNewSession: (open: boolean) => void;
  setNewTodo: (open: boolean) => void;
  setNewPatient: (open: boolean) => void;
};

export const useDialogStore = create<DialogStore>((set) => ({
  newSession: false,
  newTodo: false,
  newPatient: false,
  setNewSession: (open) => set({ newSession: open }),
  setNewTodo: (open) => set({ newTodo: open }),
  setNewPatient: (open) => set({ newPatient: open }),
}));
