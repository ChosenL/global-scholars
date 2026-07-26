export const VISA_RPC = {
  createCase: "create_visa_case",
  updateStage: "update_visa_stage",
  scheduleInterview: "schedule_visa_interview",
  recordDecision: "record_visa_decision",
  uploadDocument: "upload_visa_document",
  calculateReadiness: "calculate_visa_readiness",
  closeCase: "close_visa_case",
  updateChecklist: "update_visa_checklist_item",
  linkNote: "link_visa_note",
  updateInterview: "update_visa_interview_status",
  recordPassport: "record_visa_passport",
  upsertTravelPlan: "upsert_visa_travel_plan",
} as const;
