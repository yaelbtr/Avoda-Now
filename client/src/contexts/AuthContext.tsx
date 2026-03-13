import { createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PROTECTED_PATHS } from "@/const";

interface AuthUser {
  id: number;
  openId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: "user" | "admin" | "test";
  loginMethod: string | null;
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
  const [location, navigate] = useLocation();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      refetch();
      // Redirect to home if on a protected page so no inline login prompt appears
      const isProtected = PROTECTED_PATHS.some((p) => location.startsWith(p));
      if (isProtected) {
        navigate("/");
      }
    },
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
