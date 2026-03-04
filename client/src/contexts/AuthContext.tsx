import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface AuthUser {
  id: number;
  openId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => refetch(),
  });

  const logout = () => logoutMutation.mutate();

  return (
    <AuthContext.Provider
      value={{
        user: user as AuthUser | null,
        loading: isLoading,
        isAuthenticated: !!user,
        logout,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
