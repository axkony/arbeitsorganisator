import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { SessionFormDialog } from "@/features/sessions/SessionFormDialog";
import { TodoFormDialog } from "@/features/todos/TodoFormDialog";
import { PatientFormDialog } from "@/features/patients/PatientFormDialog";
import { useDialogStore } from "@/stores/dialogs";

export function GlobalDialogs() {
  const newSession = useDialogStore((s) => s.newSession);
  const newTodo = useDialogStore((s) => s.newTodo);
  const newPatient = useDialogStore((s) => s.newPatient);
  const setNewSession = useDialogStore((s) => s.setNewSession);
  const setNewTodo = useDialogStore((s) => s.setNewTodo);
  const setNewPatient = useDialogStore((s) => s.setNewPatient);

  // Wire native menu events → open the matching dialog.
  useEffect(() => {
    const unlisten = Promise.all([
      listen("menu:new-session", () => setNewSession(true)),
      listen("menu:new-todo", () => setNewTodo(true)),
      listen("menu:new-patient", () => setNewPatient(true)),
    ]);
    return () => {
      unlisten.then((fns) => fns.forEach((f) => f()));
    };
  }, [setNewSession, setNewTodo, setNewPatient]);

  return (
    <>
      <SessionFormDialog open={newSession} onOpenChange={setNewSession} />
      <TodoFormDialog open={newTodo} onOpenChange={setNewTodo} />
      <PatientFormDialog open={newPatient} onOpenChange={setNewPatient} />
    </>
  );
}
