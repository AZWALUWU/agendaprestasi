import type { PostStatus } from "@frontend/lib/getPostStatus";

const config: Record<PostStatus, { label: string; classes: string; dotClass: string }> = {
  active: {
    label: "Berlangsung",
    classes: "bg-green-400 text-green-100 border border-green-400",
    dotClass: "text-green-100",
},

  upcoming: {
    label: "Akan Datang",
    classes: "bg-blue-100 text-blue-800 border border-blue-200",
    dotClass: "text-blue-800",
  },
  closed: {
    label: "Telah Berakhir",
    classes: "bg-gray-100 text-gray-500 border border-gray-200",
    dotClass: "text-gray-500",
  },
};

export function StatusBadge({ status, className = "" }: { status: PostStatus; className?: string }) {
  const { label, classes, dotClass } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold ${classes} ${className}`}>
      <span className={dotClass}>{"\u25CF"}</span>
      {label}
    </span>
  );
}
