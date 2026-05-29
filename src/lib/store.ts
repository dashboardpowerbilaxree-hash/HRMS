import { create } from 'zustand';

export type PageKey = 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'leaves' | 'holidays' | 'overtime' | 'departments' | 'reports' | 'ai-assistant' | 'salary-slip' | 'settings' | 'notifications' | 'employee-profile';

interface HRMSStore {
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useHRMSStore = create<HRMSStore>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedEmployeeId: null,
  setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id, currentPage: id ? 'employee-profile' : 'employees' }),
  darkMode: true,
  toggleDarkMode: () => set((state) => {
    const newDark = !state.darkMode;
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newDark };
  }),
}));
