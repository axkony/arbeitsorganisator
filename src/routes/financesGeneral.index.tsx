// src/routes/financesGeneral.index.tsx
import { createFileRoute } from "@tanstack/react-router";
import FgPage from "@/features/financesGeneral/FgPage";

export const Route = createFileRoute("/financesGeneral/")({
  component: FgPage,
});
