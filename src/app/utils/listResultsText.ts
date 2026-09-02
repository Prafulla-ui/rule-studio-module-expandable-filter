export function formatListResultsText({
  startIndex,
  itemsPerPage,
  filteredCount,
  statusTotalCount,
  statusLabel,
  hasRefinements,
  entityLabel,
}: {
  startIndex: number;
  itemsPerPage: number;
  filteredCount: number;
  statusTotalCount: number;
  statusLabel: string;
  hasRefinements: boolean;
  entityLabel: string;
}): string {
  const pluralEntity = filteredCount === 1 ? entityLabel : `${entityLabel}s`;
  const filteredSuffix =
    hasRefinements && filteredCount !== statusTotalCount
      ? ` (filtered from ${statusTotalCount})`
      : '';

  if (filteredCount === 0) {
    return hasRefinements && statusTotalCount > 0
      ? `Showing 0 of 0${filteredSuffix} ${statusLabel} ${pluralEntity}`
      : `Showing 0 of ${statusTotalCount} ${statusLabel} ${pluralEntity}`;
  }

  const rangeEnd = Math.min(startIndex + itemsPerPage, filteredCount);
  return `Showing ${startIndex + 1} - ${rangeEnd} of ${filteredCount}${filteredSuffix} ${statusLabel} ${pluralEntity}`;
}
