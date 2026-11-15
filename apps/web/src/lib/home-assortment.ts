/** Round-robin shelves expose different families/types without inventing popularity. */
export function diverseProducts<
  T extends { sectionType: string; lightingTypeSlug: string },
>(products: readonly T[], limit: number): T[] {
  const families = new Map<string, Map<string, T[]>>();
  for (const product of products) {
    let types = families.get(product.sectionType);
    if (!types) families.set(product.sectionType, (types = new Map()));
    const group = types.get(product.lightingTypeSlug) ?? [];
    group.push(product);
    types.set(product.lightingTypeSlug, group);
  }
  const shelves = [...families.values()].map((types) => {
    const groups = [...types.values()];
    const shelf: T[] = [];
    for (let i = 0; groups.some((group) => i < group.length); i++) {
      for (const group of groups) if (group[i]) shelf.push(group[i]!);
    }
    return shelf;
  });
  const result: T[] = [];
  for (
    let i = 0;
    result.length < limit && shelves.some((shelf) => i < shelf.length);
    i++
  ) {
    for (const shelf of shelves) {
      if (shelf[i] && result.length < limit) result.push(shelf[i]!);
    }
  }
  return result;
}
