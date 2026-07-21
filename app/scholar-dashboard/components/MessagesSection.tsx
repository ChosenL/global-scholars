"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCirclePlus,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useState,
} from "react";
import { useMessages } from "../hooks/useMessages";
import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";

const SUBJECT_MAX_LENGTH = 120;

export default function MessagesSection() {
  const { user } = useUser();

  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    totalUnreadCount,
    isLoadingConversations,
    isLoadingMessages,
    isCreatingConversation,
    isSendingMessage,
    editingMessageId,
    deletingMessageId,
    updatingConversationId,
    error,
    successMessage,
    refreshMessages,
    selectConversation,
    createConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    markActiveConversationRead,
    setConversationStatus,
    clearFeedback,
  } = useMessages();

  const [isComposerOpen, setIsComposerOpen] =
    useState(false);

  const [newConversationSubject, setNewConversationSubject] =
    useState("");

  const [showMobileChat, setShowMobileChat] =
    useState(false);

  const currentUserId = user?.id ?? "";

  const normalizedSubject =
    newConversationSubject.trim();

  const canCreateConversation =
    normalizedSubject.length > 0 &&
    normalizedSubject.length <= SUBJECT_MAX_LENGTH &&
    !isCreatingConversation;

  const closeComposer = (): void => {
    if (isCreatingConversation) {
      return;
    }

    setIsComposerOpen(false);
    setNewConversationSubject("");
  };

  const handleCreateConversation = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!canCreateConversation) {
      return;
    }

    await createConversation({
      subject: normalizedSubject,
    });

    setNewConversationSubject("");
    setIsComposerOpen(false);
    setShowMobileChat(true);
  };

  const handleSelectConversation = async (
    conversationId: string,
  ): Promise<void> => {
    await selectConversation(conversationId);
    setShowMobileChat(true);
  };

  const handleAttachmentRequest = (): void => {
    window.alert(
      "File attachments will be enabled in the Supabase Storage phase.",
    );
  };

  return (
    <section
      id="messages"
      className="min-w-0 scroll-mt-28"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
            Messages
          </p>

          <h2 className="mt-2 text-3xl font-black text-[#071526]">
            Advisor Conversations
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Send questions, receive application updates, and
            stay connected with your Global Scholars advisor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalUnreadCount > 0 ? (
            <span className="rounded-full bg-[#FFF4CF] px-3 py-2 text-xs font-black text-[#8A6A1F]">
              {totalUnreadCount} unread
            </span>
          ) : null}

          <button
            type="button"
            onClick={() => {
              clearFeedback();
              setIsComposerOpen(true);
            }}
            disabled={isCreatingConversation}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-xl",
              "bg-[#0F2747] px-4 py-3 text-sm font-black text-white",
              "shadow-sm transition hover:bg-[#173B68]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
            ].join(" ")}
          >
            {isCreatingConversation ? (
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <MessageCirclePlus
                aria-hidden="true"
                className="h-4 w-4"
              />
            )}

            New conversation
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />

            <p className="leading-6">{error}</p>
          </div>

          <button
            type="button"
            onClick={clearFeedback}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <X
              aria-hidden="true"
              className="h-4 w-4"
            />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />

            <p className="leading-6">
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={clearFeedback}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-emerald-100"
            aria-label="Dismiss success message"
          >
            <X
              aria-hidden="true"
              className="h-4 w-4"
            />
          </button>
        </div>
      ) : null}

      <div className="grid min-h-[42rem] gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <div
          className={
            showMobileChat
              ? "hidden xl:block"
              : "block"
          }
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            isLoading={isLoadingConversations}
            isCreatingConversation={
              isCreatingConversation
            }
            onSelectConversation={
              handleSelectConversation
            }
            onStartConversation={() => {
              clearFeedback();
              setIsComposerOpen(true);
            }}
          />
        </div>

        <div
          className={
            showMobileChat
              ? "block"
              : "hidden xl:block"
          }
        >
          <ChatWindow
            key={activeConversation?.id ?? "empty"}
            conversation={activeConversation}
            messages={messages}
            currentUserId={currentUserId}
            isLoadingMessages={isLoadingMessages}
            isSendingMessage={isSendingMessage}
            editingMessageId={editingMessageId}
            deletingMessageId={deletingMessageId}
            updatingConversationId={
              updatingConversationId
            }
            onSendMessage={async (input) => {
              await sendMessage(input);
            }}
            onEditMessage={async (input) => {
              await editMessage(input);
            }}
            onDeleteMessage={deleteMessage}
            onMarkRead={markActiveConversationRead}
            onRefreshMessages={refreshMessages}
            onUpdateStatus={async (input) => {
              await setConversationStatus(input);
            }}
            onBack={() => setShowMobileChat(false)}
            onRequestAttachment={
              handleAttachmentRequest
            }
          />
        </div>
      </div>

      {isComposerOpen ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#071526]/70 px-4 py-8 backdrop-blur-sm"
          role="presentation"
        >
          <button
            type="button"
            onClick={closeComposer}
            className="absolute inset-0"
            aria-label="Close new conversation dialog"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-conversation-title"
            className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C8A24A]">
                  New message
                </p>

                <h3
                  id="new-conversation-title"
                  className="mt-2 text-2xl font-black text-[#071526]"
                >
                  Start a conversation
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Add a clear subject so your advisor can
                  quickly understand what you need help with.
                </p>
              </div>

              <button
                type="button"
                onClick={closeComposer}
                disabled={isCreatingConversation}
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  "border border-slate-200 text-slate-500 transition",
                  "hover:bg-slate-50 hover:text-[#071526]",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[#C8A24A]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
                aria-label="Close dialog"
              >
                <X
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                void handleCreateConversation(event);
              }}
              className="mt-6"
            >
              <label
                htmlFor="conversation-subject"
                className="text-sm font-black text-[#071526]"
              >
                Subject
              </label>

              <input
                id="conversation-subject"
                type="text"
                value={newConversationSubject}
                onChange={(event) =>
                  setNewConversationSubject(
                    event.target.value,
                  )
                }
                maxLength={SUBJECT_MAX_LENGTH}
                placeholder="Example: Help with my university shortlist"
                autoFocus
                disabled={isCreatingConversation}
                className={[
                  "mt-2 h-12 w-full rounded-xl border border-slate-200",
                  "px-4 text-sm text-[#071526] outline-none transition",
                  "placeholder:text-slate-400",
                  "focus:border-[#C8A24A] focus:ring-2",
                  "focus:ring-[#C8A24A]/20",
                  "disabled:cursor-not-allowed disabled:bg-slate-100",
                ].join(" ")}
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Keep the subject brief and specific.
                </p>

                <span className="text-xs font-semibold text-slate-400">
                  {newConversationSubject.length}/
                  {SUBJECT_MAX_LENGTH}
                </span>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeComposer}
                  disabled={isCreatingConversation}
                  className={[
                    "rounded-xl border border-slate-200 px-4 py-3",
                    "text-sm font-black text-slate-600 transition",
                    "hover:bg-slate-50 hover:text-[#071526]",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[#C8A24A]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  ].join(" ")}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!canCreateConversation}
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-xl",
                    "bg-[#0F2747] px-5 py-3 text-sm font-black text-white",
                    "transition hover:bg-[#173B68]",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  ].join(" ")}
                >
                  {isCreatingConversation ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <MessageCirclePlus
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  )}

                  {isCreatingConversation
                    ? "Starting"
                    : "Start conversation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}