"use client";

import MessagesSection from "@/app/scholar-dashboard/components/MessagesSection";
import PlatformJourneyPanel from "@/app/shared/PlatformJourneyPanel";

import type { AdvisorStudent } from "../hooks/useAdvisorStudents";
import { useStudentReadiness } from "../hooks/useStudentReadiness";

import StudentAppointmentsCard from "./StudentAppointmentsCard";
import StudentDocumentsCard from "./StudentDocumentsCard";
import StudentHeader from "./StudentHeader";
import StudentMatchesCard from "./StudentMatchesCard";
import StudentNotesCard from "./StudentNotesCard";
import StudentProgressCard from "./StudentProgressCard";
import StudentTasksCard from "./StudentTasksCard";

interface StudentWorkspaceProps {
  student: AdvisorStudent;
}

export default function StudentWorkspace({ student }: StudentWorkspaceProps) {
  const readiness = useStudentReadiness(student.profileId);
  const readinessScore = readiness?.total_score ?? 0;

  return (
    <div className="w-full min-w-0 max-w-none">
      <div className="grid w-full min-w-0 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="w-full min-w-0 space-y-6">
          <StudentNotesCard
            studentProfileId={student.profileId}
            studentName={student.displayName}
          />

          <StudentTasksCard
            studentProfileId={student.profileId}
            studentName={student.displayName}
          />

          <StudentAppointmentsCard />

          <StudentProgressCard progress={readinessScore} />
        </aside>

        <main className="w-full min-w-0 max-w-none space-y-6">
          <StudentHeader student={student} progress={readinessScore} />

          <StudentMatchesCard
            studentProfileId={student.profileId}
            studentName={student.displayName}
          />

          <MessagesSection
            portalRole="advisor"
            selectedStudentProfileId={student.profileId}
            selectedStudentName={student.displayName}
            layout="stacked"
          />

          <StudentDocumentsCard
            studentProfileId={student.profileId}
            studentName={student.displayName}
          />

          <PlatformJourneyPanel
            studentProfileId={student.profileId}
            advisorMode
          />
        </main>
      </div>
    </div>
  );
}
