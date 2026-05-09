"use client";

import { useState } from "react";

export function useFilters<T extends object>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);
  return { filters, setFilters };
}
