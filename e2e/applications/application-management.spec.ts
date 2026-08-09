import { expect, test } from "../fixtures/test";

import {
  applicationTestData,
  missingApplicationE2EEnvironment,
  requireApplicationE2EConfig,
} from "../fixtures/application";
import { ApplicationManagementPage } from "../pages/ApplicationManagementPage";

const missingEnvironment = missingApplicationE2EEnvironment();

test.describe("Student Application Management workflow", () => {
  test.setTimeout(60_000);
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

    await test.step("review deterministic evidence and hand off to application creation", async () => {
      await page.goto("/advisor-dashboard");
      await page
        .getByRole("button", {
          name: new RegExp(
            `e2e-preview-${config.runId} Application Student`,
            "i",
          ),
        })
        .click();
      await expect(
        page.getByRole("heading", { name: "Find Matches" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Find Matches" }).click();
      await expect(
        page.getByText(
          "Matches are based on verified catalog evidence and require advisor review.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Unknown / verify").first()).toBeVisible();
      await expect(page.getByText("Known blockers").first()).toBeVisible();
      await page
        .getByRole("link", { name: "Start Application" })
        .first()
        .click();
      await expect(
        page.getByRole("dialog", { name: "Create application" }),
      ).toBeVisible();
      await expect(page.getByLabel("Student selector")).toHaveValue(
        config.studentProfileId,
      );
      await expect(page.getByLabel("Program selector")).not.toHaveValue("");
    });

    await test.step("request deterministic matches for the authorized student", async () => {
      const response = await page.request.get(
        `/api/matching?studentProfileId=${config.studentProfileId}`,
      );
      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      expect(payload.ok).toBe(true);
      expect([
        "results",
        "insufficient_evidence",
        "no_catalog_evidence",
      ]).toContain(payload.data.status);
      expect(Array.isArray(payload.data.results)).toBe(true);
    });

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
