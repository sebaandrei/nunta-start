/**
 * Chei de query, toate sub prefixul nunții, ca o nuntă să poată fi invalidată sau ștearsă dintr-un loc.
 * Cache-ul ține rânduri/liste întregi la cheile frunză (`tasks()`, `budgetLines()`...), ca un strat
 * realtime să le poată corecta cu `setQueryData` fără să știe nimic despre ecrane.
 */
export const keys = {
  all: ['weddings'] as const,
  /** Nunțile mele (cu rolul). */
  list: () => ['weddings', 'list'] as const,
  wedding: (id: string) => {
    const base = ['weddings', id] as const;
    return {
      all: base,
      detail: () => [...base, 'detail'] as const,
      tasks: () => [...base, 'tasks'] as const,
      budget: () => [...base, 'budget'] as const,
      budgetSettings: () => [...base, 'budget', 'settings'] as const,
      budgetScenarios: () => [...base, 'budget', 'scenarios'] as const,
      budgetLines: () => [...base, 'budget', 'lines'] as const,
      guests: () => [...base, 'guests'] as const,
      members: () => [...base, 'members'] as const,
    };
  },
};
