import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

function PageContainer({ children, className }: Props) {
  return (
    <div className={cn("mx-auto max-w-5xl p-6", className)}>{children}</div>
  );
}

export default PageContainer;
