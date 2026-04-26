export const DAYS = [
  { key: "lunes", short: "L" },
  { key: "martes", short: "M" },
  { key: "miercoles", short: "X" },
  { key: "jueves", short: "J" },
  { key: "viernes", short: "V" },
  { key: "sabado", short: "S" },
  { key: "domingo", short: "D" },
];

// Order matches Date.getDay(): 0=domingo, 1=lunes, ..., 6=sabado
export const DAY_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export const ATTENDANCE_STATUSES: Array<{
  value: "present" | "absent" | "late";
  label: string;
  color: string;
}> = [
  { value: "present", label: "Presente", color: "var(--ok)" },
  { value: "absent", label: "Ausente", color: "var(--err)" },
  { value: "late", label: "Tarde", color: "var(--warn)" },
];

export const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Tarde",
};

export const STATUS_COLOR: Record<string, string> = {
  present: "var(--ok)",
  absent: "var(--err)",
  late: "var(--warn)",
};

export const STATUS_BG: Record<string, string> = {
  present: "var(--ok-dim)",
  absent: "#fef2f2",
  late: "#fefce8",
};
