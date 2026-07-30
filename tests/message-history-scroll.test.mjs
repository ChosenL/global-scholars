import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const chatWindowPath = new URL(
  "../app/scholar-dashboard/components/ChatWindow.tsx",
  import.meta.url,
);
const messagesSectionPath = new URL(
  "../app/scholar-dashboard/components/MessagesSection.tsx",
  import.meta.url,
);
const dashboardPath = new URL(
  "../app/scholar-dashboard/page.tsx",
  import.meta.url,
);

test("asynchronously loaded messages cannot scroll the outer dashboard while Messages is inactive", async () => {
  let outerPageScrollTop = 0;
  const history = {
    scrollHeight: 1_200,
    scrollTop: 0,
    scrollTo({ top }) {
      this.scrollTop = top;
    },
  };

  const applyLoadedMessages = (isActive) => {
    if (isActive) {
      history.scrollTo({ top: history.scrollHeight });
    }
  };

  await Promise.resolve();
  applyLoadedMessages(false);

  assert.equal(outerPageScrollTop, 0);
  assert.equal(history.scrollTop, 0);

  const chatWindow = await readFile(chatWindowPath, "utf8");
  const messagesSection = await readFile(messagesSectionPath, "utf8");
  const dashboard = await readFile(dashboardPath, "utf8");

  assert.match(chatWindow, /isActive &&\s+scrollContainer/);
  assert.match(
    chatWindow,
    /scrollContainer\.scrollTo\(\{\s+top: scrollContainer\.scrollHeight/,
  );
  assert.doesNotMatch(chatWindow, /scrollIntoView/);
  assert.match(messagesSection, /isActive=\{isActive\}/);
  assert.match(dashboard, /isActive=\{activeSection === "messages"\}/);
});

test("active message history scroll remains confined to its own container", () => {
  let outerPageScrollTop = 240;
  const history = {
    scrollHeight: 1_200,
    scrollTop: 100,
    scrollTo({ top }) {
      this.scrollTop = top;
    },
  };

  history.scrollTo({ top: history.scrollHeight });

  assert.equal(history.scrollTop, 1_200);
  assert.equal(outerPageScrollTop, 240);
});
