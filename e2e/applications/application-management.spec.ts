import { test } from "../fixtures/test";

import {
  applicationTestData,
  missingApplicationE2EEnvironment,
  requireApplicationE2EConfig,
} from "../fixtures/application";
import { ApplicationManagementPage } from "../pages/ApplicationManagementPage";

const missingEnvironment = missingApplicationE2EEnvironment();

test.describe("Student Application Management workflow", () => {
  test.skip(
    missingEnvironment.length > 0,
    `Requires real E2E configuration: ${missingEnvironment.join(", ")}`,
  );

  test("administrator completes the application lifecycle", async ({
    page,
  }, testInfo) => {
    const config = requireApplicationE2EConfig();
    const data = applicationTestData(config.runId, testInfo.retry);
    const applications = new ApplicationManagementPage(page);

    await test.step("create application and open details", async () => {
      await applications.openList();
      await applications.createApplication({
        studentProfileId: config.studentProfileId,
        university: data.university,
        program: data.program,
        intake: data.intake,
      });
      await applications.verifyApplicationAppearsInList();
      await applications.openCreatedDetails();
    });

    await test.step("update and persist financial details", async () => {
      await applications.updateFinancials(
        data.tuitionAmount,
        data.currency,
        data.financialSource,
      );
      await applications.updateFinancials(
        data.updatedTuitionAmount,
        data.updatedCurrency,
        data.updatedFinancialSource,
      );
      await applications.verifyFinancialsPersist(
        data.updatedTuitionAmount,
        data.updatedCurrency,
        data.updatedFinancialSource,
      );
    });

    await test.step("assign and change advisor", async () => {
      await applications.assignAdvisor(config.advisorProfileId);
      await applications.changeAdvisor(config.secondAdvisorProfileId);
    });

    await test.step("move through valid statuses and verify timeline", async () => {
      await applications.transitionStatus(
        "ready_for_review",
        "E2E ready for review",
      );
      await applications.transitionStatus("draft", "E2E returned to draft");
      await applications.verifyTimelineIncludesStatusChange();
    });

    await test.step("archive and remove from default active list", async () => {
      await applications.archiveApplication();
      await applications.verifyRemovedFromDefaultActiveList();
    });
  });
});
