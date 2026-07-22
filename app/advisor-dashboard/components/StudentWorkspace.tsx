"use client";

import StudentAppointmentsCard from "./StudentAppointmentsCard";
import StudentDocumentsCard from "./StudentDocumentsCard";
import StudentHeader from "./StudentHeader";
import StudentNotesCard from "./StudentNotesCard";
import StudentProgressCard from "./StudentProgressCard";
import StudentTasksCard from "./StudentTasksCard";
import MessagesSection from "@/app/scholar-dashboard/components/MessagesSection";

import type { AdvisorStudent } from "../hooks/useAdvisorStudents";

interface StudentWorkspaceProps {
  student: AdvisorStudent;
}

export default function StudentWorkspace({
  student,
}: StudentWorkspaceProps) {
  return (
    <div className="space-y-8">

      <StudentHeader
        student={student}
        progress={18}
      />

      <div className="grid gap-8 xl:grid-cols-3">

        <div className="space-y-8 xl:col-span-2">

          <StudentProgressCard progress={18} />

          <StudentDocumentsCard />

          <StudentTasksCard />

          <StudentAppointmentsCard />

          <MessagesSection
            portalRole="advisor"
            selectedStudentId={student.userId}
            selectedStudentName={student.displayName}
          />

        </div>

        <div className="space-y-8">

          <StudentNotesCard />

        </div>

      </div>

    </div>
  );
}