"use client";

import { useRef, useState, useTransition } from "react";
import type { FoodTemplateDto } from "@/lib/dal/food-template";
import { loadCatalogFoodDraftAction } from "@/app/actions/catalog";
import type { FoodSearchHit } from "@/lib/dal/nutrition";
import { FoodCatalogSearch } from "./food-catalog-search";
import { InstantLog } from "./instant-log";
import { LogMealForm, type LogMealFormHandle } from "./log-meal-form";
import { RecentFavorites } from "./recent-favorites";

type Props = {
  recent: FoodTemplateDto[];
  favorites: FoodTemplateDto[];
  aiParsesRemaining?: number | null;
  freePlan?: boolean;
};

/** Client shell wiring recent/favorites and catalog into the review form. */
export function LogPageContent({
  recent,
  favorites,
  aiParsesRemaining = null,
  freePlan = false,
}: Props) {
  const formRef = useRef<LogMealFormHandle>(null);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const [catalogPending, startCatalogTransition] = useTransition();

  function reviewCatalogHit(hit: FoodSearchHit) {
    setCatalogMessage(null);
    startCatalogTransition(async () => {
      const result = await loadCatalogFoodDraftAction({ slug: hit.slug });
      if (!result.ok) {
        setCatalogMessage(result.error);
        return;
      }
      formRef.current?.addDraft(result.data);
      setCatalogMessage(`Review ${result.data.name} below, then save.`);
    });
  }

  return (
    <>
      <RecentFavorites
        recent={recent}
        favorites={favorites}
        onSelectForEdit={(draft) => formRef.current?.addDraft(draft)}
      />
      <FoodCatalogSearch onAddToReview={reviewCatalogHit} />
      {catalogMessage ? (
        <p
          className="-mt-4 text-sm text-neutral-700 dark:text-neutral-200"
          role="status"
          aria-busy={catalogPending}
        >
          {catalogMessage}
        </p>
      ) : null}
      <InstantLog />
      <LogMealForm
        ref={formRef}
        aiParsesRemaining={aiParsesRemaining}
        freePlan={freePlan}
      />
    </>
  );
}
