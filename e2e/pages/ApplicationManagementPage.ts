import { expect, type Locator, type Page } from "@playwright/test";

interface ApplicationCreationData {
  studentProfileId: string;
  intakeId: string;
  university: string;
  program: string;
  degreeLevel: string;
}

export class ApplicationManagementPage {
  private applicationId: string | null = null;

  constructor(private readonly page: Page) {}

  async openList() {
    await this.page.goto("/applications");
    await expect(
      this.page.getByRole("heading", {
        name: "Student applications",
        exact: true,
      }),
    ).toBeVisible();
  }

  async createApplication(data: ApplicationCreationData) {
    await this.page.getByRole("button", { name: "New Application" }).click();
    const dialog = this.page.getByRole("dialog", {
      name: "Create application",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Student selector").fill(data.studentProfileId);
    await dialog.getByLabel("University selector").fill(data.university);
    await dialog.getByLabel("Intake field").fill(data.intakeId);
    await dialog.getByLabel("Program field").fill(data.program);
    await dialog.getByLabel("Degree level field").fill(data.degreeLevel);
    await dialog.getByRole("button", { name: "Create application" }).click();
    try {
      await expect(this.page.getByRole("status")).toContainText(
        "Application created.",
      );
    } catch (error) {
      const dialogVisible = await dialog.isVisible();
      const feedback = [
        ...new Set(
          (
            await this.page
              .locator('[role="alert"]:visible, [role="status"]:visible')
              .allInnerTexts()
          )
            .map((text) => text.trim())
            .filter(Boolean),
        ),
      ];

      throw new Error(
        "Application creation did not reach its visible success state.\n" +
          `Dialog visible: ${dialogVisible}\n` +
          `Visible alert/status text: ${feedback.join(" | ") || "<none>"}\n` +
          `Current URL: ${this.page.url()}`,
        { cause: error },
      );
    }

    const openLink = this.page.getByRole("link", {
      name: "Open new application",
    });
    await expect(openLink).toBeVisible();
    const href = await openLink.getAttribute("href");
    const match = href?.match(/\/applications\/([0-9a-f-]+)/i);
    expect(match?.[1]).toBeTruthy();
    this.applicationId = match![1];
  }

  async verifyApplicationAppearsInList() {
    const id = this.requireApplicationId();
    await expect(
      this.page.getByRole("link", { name: new RegExp(id) }),
    ).toBeVisible();
  }

  async openCreatedDetails() {
    await this.page.getByRole("link", { name: "Open new application" }).click();
    await this.expectDetailsLoaded();
  }

  async updateFinancials(amount: string, currency: string, source: string) {
    await this.page.getByLabel("Tuition amount").fill(amount);
    await this.page.getByLabel("Currency").fill(currency);
    await this.page.getByLabel("Source").fill(source);
    await this.page.getByRole("button", { name: "Update financials" }).click();
    await expect(this.page.getByRole("status")).toContainText(
      "Financial details updated.",
    );
    await expect(
      this.page.getByText(Number(amount).toLocaleString()),
    ).toBeVisible();
    await expect(
      this.page.getByText(currency.toUpperCase(), { exact: true }),
    ).toBeVisible();
  }

  async verifyFinancialsPersist(
    amount: string,
    currency: string,
    source: string,
  ) {
    await this.page.reload();
    await this.expectDetailsLoaded();
    await expect(
      this.page.getByText(Number(amount).toLocaleString()),
    ).toBeVisible();
    await expect(
      this.page.getByText(currency.toUpperCase(), { exact: true }),
    ).toBeVisible();
    await expect(this.page.getByLabel("Source")).toHaveValue(source);
  }

  async assignAdvisor(profileId: string) {
    await this.page.getByLabel("Advisor profile ID").fill(profileId);
    await this.page
      .getByRole("button", { name: /Assign advisor|Change advisor/ })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Advisor assignment updated.",
    );
    await expect(this.currentAdvisor()).toContainText(profileId);
  }

  async changeAdvisor(profileId: string) {
    await this.assignAdvisor(profileId);
  }

  async transitionStatus(status: string, reason: string) {
    await this.page.getByLabel("New status").selectOption(status);
    await this.page.getByLabel("Reason").fill(reason);
    await this.page.getByRole("button", { name: "Update status" }).click();
    await expect(this.page.getByRole("status")).toContainText(
      "Application status updated.",
    );
    await expect(
      this.page.getByText(this.statusLabel(status), { exact: true }).first(),
    ).toBeVisible();
  }

  async verifyTimelineIncludesStatusChange() {
    await expect(
      this.page.getByRole("heading", { name: "Timeline" }),
    ).toBeVisible();
    const visibleStatusChanges = this.page
      .getByText(/Application\.Status Changed/i)
      .filter({ visible: true });

    await expect.poll(() => visibleStatusChanges.count()).toBeGreaterThan(0);
  }

  async archiveApplication() {
    await this.page.getByRole("button", { name: "Archive" }).click();
    const dialog = this.page.getByRole("dialog", {
      name: "Archive this application?",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Archive application" }).click();
    await expect(this.page.getByRole("status")).toContainText(
      "Application archived.",
    );
    await expect(
      this.page.getByRole("button", { name: "Archived" }),
    ).toBeDisabled();
  }

  async verifyRemovedFromDefaultActiveList() {
    const id = this.requireApplicationId();
    await this.openList();
    await this.page
      .getByPlaceholder("Search student, intake, reference, or application ID")
      .fill(id);
    await expect(
      this.page.getByRole("heading", { name: "No applications found" }),
    ).toBeVisible();
  }

  private async expectDetailsLoaded() {
    await expect(this.page).toHaveURL(/\/applications\/[0-9a-f-]+$/);
    await expect(
      this.page.getByRole("heading", { name: /Application / }),
    ).toBeVisible();
  }

  private currentAdvisor(): Locator {
    return this.page.locator("section").filter({
      has: this.page.getByRole("heading", { name: "Advisor Assignment" }),
    });
  }

  private requireApplicationId(): string {
    if (!this.applicationId)
      throw new Error("Application has not been created.");
    return this.applicationId;
  }

  private statusLabel(value: string) {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
