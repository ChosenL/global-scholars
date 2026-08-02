import { expect, type Locator, type Page } from "@playwright/test";

interface OrganizationData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export class OrganizationManagementPage {
  constructor(private readonly page: Page) {}

  async openList() {
    await this.page.goto("/organizations");
    await expect(
      this.page.getByRole("heading", { name: "Organizations", exact: true }),
    ).toBeVisible();
  }

  async createOrganization(data: OrganizationData) {
    await this.page.getByRole("link", { name: "New organization" }).click();
    await this.fillOrganizationForm(data);
    await this.page
      .getByRole("button", { name: "Create organization" })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Organization created.",
    );
    await this.page.waitForURL(/\/organizations\/[0-9a-f-]+$/);
  }

  async search(name: string) {
    await this.page
      .getByRole("searchbox", {
        name: "Search organizations",
      })
      .fill(name);
    await this.page.getByRole("button", { name: "Search" }).click();
  }

  organizationRow(name: string): Locator {
    return this.page.getByRole("link", { name: `Open ${name}` });
  }

  async openOrganization(name: string) {
    await this.organizationRow(name).click();
    await expect(
      this.page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }

  async editOrganization(data: {
    name: string;
    email: string;
    address: string;
  }) {
    await this.page.getByRole("link", { name: "Edit" }).click();
    await this.page.getByLabel(/^Name/).fill(data.name);
    await this.page.getByLabel("Email").fill(data.email);
    await this.page.getByLabel("Address").fill(data.address);
    await this.page.getByRole("button", { name: "Save changes" }).click();
    await expect(this.page).toHaveURL(/\/organizations\/[0-9a-f-]+$/);
    await expect(
      this.page.getByRole("heading", { name: data.name, exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText(data.email, { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByText(data.address, { exact: true }),
    ).toBeVisible();
  }

  async assignAdvisor(profileId: string) {
    await this.assignmentsRegion()
      .getByRole("button", { name: "Assign advisor", exact: true })
      .click();
    const dialog = this.page.getByRole("dialog", { name: /assign advisor/i });
    await dialog
      .getByRole("combobox", {
        name: "Advisor profile",
      })
      .fill(profileId);
    await dialog
      .getByRole("button", { name: "Assign advisor", exact: true })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Advisor assigned.",
    );
    await expect(this.page.getByText(profileId, { exact: true })).toBeVisible();
  }

  async verifyDuplicateAdvisorIsPrevented(profileId: string) {
    await this.assignmentsRegion()
      .getByRole("button", { name: "Assign advisor", exact: true })
      .click();
    const dialog = this.page.getByRole("dialog", { name: /assign advisor/i });
    await dialog
      .getByRole("combobox", {
        name: "Advisor profile",
      })
      .fill(profileId);
    await expect(dialog.getByRole("alert")).toContainText(
      "already has an active assignment",
    );
    await expect(
      dialog.getByRole("button", {
        name: "Assign advisor",
        exact: true,
      }),
    ).toBeDisabled();
    await dialog
      .getByRole("button", {
        name: "Close assign advisor dialog",
      })
      .click();
  }

  async removeAdvisor(profileId: string) {
    await this.page
      .getByRole("button", {
        name: `Remove advisor ${profileId}`,
      })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Advisor assignment removed.",
    );
    await expect(this.page.getByText(profileId, { exact: true })).toHaveCount(
      0,
    );
  }

  async assignStudent(profileId: string) {
    await this.assignmentsRegion()
      .getByRole("button", { name: "Assign student", exact: true })
      .click();
    const dialog = this.page.getByRole("dialog", { name: /assign student/i });
    await dialog
      .getByRole("combobox", {
        name: "Student profile",
      })
      .fill(profileId);
    await dialog
      .getByRole("checkbox", { name: "Primary organization membership" })
      .check();
    await dialog
      .getByRole("button", { name: "Assign student", exact: true })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Student assigned.",
    );
    await expect(this.page.getByText(profileId, { exact: true })).toBeVisible();
    await expect(this.page.getByText(/Client · Primary/)).toBeVisible();
  }

  async removeStudent(profileId: string) {
    await this.page
      .getByRole("button", {
        name: `Remove student ${profileId}`,
      })
      .click();
    await expect(this.page.getByRole("status")).toContainText(
      "Student assignment removed.",
    );
    await expect(this.page.getByText(profileId, { exact: true })).toHaveCount(
      0,
    );
  }

  async archiveOrganization() {
    await this.page.getByRole("button", { name: "Archive" }).click();
    const dialog = this.page.getByRole("dialog", {
      name: "Archive this organization?",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Archive organization" }).click();
    await expect(this.page.getByRole("status")).toContainText(
      "Organization archived.",
    );
    const statusCard = this.page.locator("article").filter({
      has: this.page.getByText("Status", { exact: true }),
    });
    await expect(
      statusCard.getByText("Archived", { exact: true }),
    ).toBeVisible();
  }

  private async fillOrganizationForm(data: OrganizationData) {
    await this.page.getByLabel(/^Name/).fill(data.name);
    await this.page.getByLabel(/^Slug/).fill(data.slug);
    await this.page
      .getByLabel("Organization type")
      .selectOption("partner_school");
    await this.page.getByLabel("Email").fill(data.email);
    await this.page.getByLabel("Phone").fill(data.phone);
    await this.page.getByLabel("Website").fill(data.website);
    await this.page.getByLabel("Address").fill(data.address);
  }

  private assignmentsRegion(): Locator {
    return this.page.getByRole("region", { name: "Assignments" });
  }
}
