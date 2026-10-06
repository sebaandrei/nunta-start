/** Chei de query, toate sub prefixul nunții, ca o nuntă să poată fi invalidată sau ștearsă dintr-un loc. */
export const keys = {
  all: ['weddings'] as const,
  wedding: (id: string) => {
    const base = ['weddings', id] as const;
    return {
      all: base,
      tasks: () => [...base, 'tasks'] as const,
      budget: () => [...base, 'budget'] as const,
      guests: () => [...base, 'guests'] as const,
      members: () => [...base, 'members'] as const,
    };
  },
};
