import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAttendanceExcel } from "@/lib/reports/generate-attendance-excel";
import type { ReportSession } from "@/actions/reports";

type RawRecord = {
  student_id: string;
  status: "present" | "absent" | "late";
  students: { full_name: string } | { full_name: string }[] | null;
};

type RawSession = {
  id: string;
  group_id: string;
  date: string;
  groups: { name: string } | { name: string }[] | null;
  attendance_records: RawRecord[];
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin permiso" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director" || !profile.academy_id)
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { startDate, endDate, groupIds } = (await req.json()) as {
    startDate: string;
    endDate: string;
    groupIds: string[] | null;
  };

  let query = supabase
    .from("attendance_sessions")
    .select(
      "id, group_id, date, groups(name), attendance_records(student_id, status, students(full_name))"
    )
    .eq("academy_id", profile.academy_id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  if (groupIds && groupIds.length > 0) query = query.in("group_id", groupIds);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions: ReportSession[] = (
    (data ?? []) as unknown as RawSession[]
  ).map((s) => ({
    session_id: s.id,
    group_id: s.group_id,
    group_name:
      (Array.isArray(s.groups) ? s.groups[0]?.name : s.groups?.name) ??
      "Grupo desconocido",
    date: s.date,
    records: s.attendance_records.map((r) => ({
      student_id: r.student_id,
      student_name:
        (Array.isArray(r.students)
          ? r.students[0]?.full_name
          : r.students?.full_name) ?? "Alumno desconocido",
      status: r.status,
    })),
  }));

  if (sessions.length === 0)
    return NextResponse.json(
      { error: "No hay datos de asistencia en el período seleccionado." },
      { status: 404 }
    );

  try {
    const buffer = await generateAttendanceExcel(sessions);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="informe-asistencia.xlsx"',
      },
    });
  } catch (e) {
    console.error("[attendance-excel]", e);
    const msg = e instanceof Error ? e.message : "Error al generar el informe.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
