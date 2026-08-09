import { expect, test } from "../fixtures/test";

import {
  missingOrganizationE2EEnvironment,
  organizationTestData,
  requireOrganizationE2EConfig,
} from "../fixtures/organization";
import { OrganizationManagementPage } from "../pages/OrganizationManagementPage";

const missingEnvironment = missingOrganizationE2EEnvironment();

test.describe("Organization Management workflow", () => {
  test.setTimeout(60_000);
  test.skip(
    missingEnvironment.length > 0,
    `Requires real E2E configuration: ${missingEnvironment.join(", ")}`,
  );

  test("administrator completes the organization lifecycle", async ({
    page,
  }, testInfo) => {
    const config = requireOrganizationE2EConfig();
    const data = organizationTestData(config.runId, testInfo.retry);
    const organizations = new OrganizationManagementPage(page);

    await test.step("create organization and open details", async () => {
      await organizations.openList();
      await organizations.createOrganization(data);
      await organizations.openList();
      await organizations.search(data.name);
      await expect(organizations.organizationRow(data.name)).toBeVisible();
      await organizations.openOrganization(data.name);
    });

    await test.step("edit organization details", async () => {
      await organizations.editOrganization({
        name: data.updatedName,
        email: data.updatedEmail,
        address: data.updatedAddress,
      });
    });

    await test.step("assign, reject duplicate, and remove advisor", async () => {
      await organizations.assignAdvisor(config.advisorProfileId);
      await organizations.verifyDuplicateAdvisorIsPrevented(
        config.advisorProfileId,
      );
      await organizations.removeAdvisor(config.advisorProfileId);
    });

    await test.step("assign primary student and remove student", async () => {
      await organizations.assignStudent(config.studentProfileId);
      await organizations.removeStudent(config.studentProfileId);
    });

    await test.step("archive and remove from active list", async () => {
      await organizations.archiveOrganization();
      await organizations.openList();
      await organizations.search(data.updatedName);
      await expect(organizations.organizationRow(data.updatedName)).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("heading", { name: "No organizations found" }),
      ).toBeVisible();
    });
  });
});
