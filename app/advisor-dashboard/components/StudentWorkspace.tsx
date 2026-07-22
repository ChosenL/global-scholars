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
    <div className="w-full min-w-0 max-w-none">
      <div className="grid w-full min-w-0 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="w-full min-w-0 space-y-6">
          <StudentNotesCard />

          <StudentTasksCard />

          <StudentAppointmentsCard />

          <StudentProgressCard progress={18} />
        </aside>

        <main className="w-full min-w-0 max-w-none space-y-6">
          <StudentHeader
            student={student}
            progress={18}
          />

          <MessagesSection
            portalRole="advisor"
            selectedStudentId={student.userId}
            selectedStudentName={student.displayName}
            layout="stacked"
          />

          <StudentDocumentsCard />
        </main>
      </div>
    </div>
  );
}
