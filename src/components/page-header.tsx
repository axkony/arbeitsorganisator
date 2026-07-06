import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
};

function PageHeader({ title, children }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h1 className="font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export default PageHeader;
