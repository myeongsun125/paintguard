import { create } from "zustand";

export type DateRange = [Date, Date];

export interface FilterState {
  plant: string | null;
  line: string | null;
  model: string | null;
  dateRange: DateRange;
  comparePanel: boolean;
  filterB: {
    plant: string | null;
    line: string | null;
    model: string | null;
    dateRange: DateRange;
  };
  setPlant: (v: string | null) => void;
  setLine: (v: string | null) => void;
  setModel: (v: string | null) => void;
  setDateRange: (v: DateRange) => void;
  toggleComparePanel: () => void;
  setPlantB: (v: string | null) => void;
  setLineB: (v: string | null) => void;
  setModelB: (v: string | null) => void;
  setDateRangeB: (v: DateRange) => void;
  reset: () => void;
}

const today = new Date();
const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

export const useFilterStore = create<FilterState>((set) => ({
  plant: null,
  line: null,
  model: null,
  dateRange: [monthAgo, today],
  comparePanel: false,
  filterB: {
    plant: null,
    line: null,
    model: null,
    dateRange: [monthAgo, today],
  },
  setPlant: (plant) => set({ plant }),
  setLine: (line) => set({ line }),
  setModel: (model) => set({ model }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleComparePanel: () => set((s) => ({ comparePanel: !s.comparePanel })),
  setPlantB: (v) => set((s) => ({ filterB: { ...s.filterB, plant: v } })),
  setLineB: (v) => set((s) => ({ filterB: { ...s.filterB, line: v } })),
  setModelB: (v) => set((s) => ({ filterB: { ...s.filterB, model: v } })),
  setDateRangeB: (v) => set((s) => ({ filterB: { ...s.filterB, dateRange: v } })),
  reset: () =>
    set({
      plant: null,
      line: null,
      model: null,
      dateRange: [monthAgo, today],
      comparePanel: false,
    }),
}));
