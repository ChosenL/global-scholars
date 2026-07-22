"use client";

import MessagesSection from "@/app/scholar-dashboard/components/MessagesSection";

import type { AdvisorStudent } from "../hooks/useAdvisorStudents";

import StudentAppointmentsCard from "./StudentAppointmentsCard";
import StudentDocumentsCard from "./StudentDocumentsCard";
import StudentHeader from "./StudentHeader";
import StudentNotesCard from "./StudentNotesCard";
import StudentProgressCard from "./StudentProgressCard";
import StudentTasksCard from "./StudentTasksCard";

interface StudentWorkspaceProps {
  student: AdvisorStudent;
}

export default function StudentWorkspace({
  student,
}: StudentWorkspaceProps) {
  return (
    <div className="space-y-6">
      <StudentHeader
        student={student}
        progress={18}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <StudentNotesCard />

          <StudentTasksCard />

          <StudentAppointmentsCard />

          <StudentProgressCard progress={18} />
        </aside>

        <main className="min-w-0 space-y-6">
          <MessagesSection
            portalRole="advisor"
            selectedStudentId={student.userId}
            selectedStudentName={student.displayName}
          />

          <StudentDocumentsCard />
        </main>
      </div>
    </div>
  );
}
