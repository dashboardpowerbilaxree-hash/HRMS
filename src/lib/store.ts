import { create } from 'zustand';

export type PageKey = 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'leaves' | 'holidays' | 'reports' | 'analytics' | 'scorecard' | 'ai-assistant' | 'salary-slip' | 'settings' | 'employee-profile';

interface HRMSStore {
  currentPage: PageKey;
  setCurrentPage: (page: PageKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  selectedFirm: string;
  setSelectedFirm: (firm: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  // Admin auth state
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  adminName: string;
  setAdminName: (name: string) => void;
  adminRole: string;
  setAdminRole: (role: string) => void;
  logout: () => void;
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
  selectedFirm: '',
  setSelectedFirm: (firm) => set({ selectedFirm: firm }),
  selectedLocation: '',
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  // Admin auth
  isLoggedIn: false,
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  adminName: '',
  setAdminName: (name) => set({ adminName: name }),
  adminRole: '',
  setAdminRole: (role) => set({ adminRole: role }),
  logout: () => set({
    isLoggedIn: false,
    adminName: '',
    adminRole: '',
    currentPage: 'dashboard',
  }),
}));
