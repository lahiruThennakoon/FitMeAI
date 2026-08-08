"use client";

import {
  ONBOARDING_CHECKLIST_DISMISSED_KEY,
  ONBOARDING_FIRST_VISIT_DISMISSED_KEY,
} from "@/lib/onboarding/constants";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage blocked — ignore */
  }
}

export function isFirstVisitGuideDismissed(): boolean {
  return readFlag(ONBOARDING_FIRST_VISIT_DISMISSED_KEY);
}

export function dismissFirstVisitGuide(): void {
  writeFlag(ONBOARDING_FIRST_VISIT_DISMISSED_KEY);
}

export function isGettingStartedChecklistDismissed(): boolean {
  return readFlag(ONBOARDING_CHECKLIST_DISMISSED_KEY);
}

export function dismissGettingStartedChecklist(): void {
  writeFlag(ONBOARDING_CHECKLIST_DISMISSED_KEY);
}
