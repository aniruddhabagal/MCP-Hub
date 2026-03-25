"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  MeResponse,
  PendingInvite,
  TokenResponse,
  User,
  Workspace,
  WorkspaceRole,
} from "./types";
import {
  decodeJwtPayload,
  getAccessToken,
  registerRefreshFn,
  setAccessToken,
} from "./token-store";
import { subscribe, getSnapshot } from "./demo-mode";
import { useSyncExternalStore } from "react";

const REFRESH_KEY = "mcphub_refresh_token";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Demo sentinel ─────────────────────────────────────────────────────────────

export const DEMO_USER: User = {
  id: "demo-user-001",
  email: "demo@mcphub.dev",
  display_name: "Demo User",
  is_superadmin: true, // superadmin in demo so all pages are explorable
  is_active: true,
  created_at: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString(),
};

export const DEMO_WORKSPACE: Workspace = {
  id: "demo-ws-001",
  name: "Acme Corp",
  slug: "acme-corp",
  created_at: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString(),
  is_personal: false,
};

// ── Auth state ────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  role: WorkspaceRole | null;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingInvites: PendingInvite[];
  canCreateWorkspace: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    displayName: string,
    password: string,
    inviteToken?: string,
  ) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchRaw<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedHeaders = new Headers(init?.headers ?? {});
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isFormData && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? `Request failed: ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

function getRoleFromToken(token: string): WorkspaceRole | null {
  const payload = decodeJwtPayload(token);
  const role = payload.role;
  if (role === "owner" || role === "admin" || role === "member") return role;
  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const demo = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // ── Refresh token fn (registered in token-store for api.ts to call) ─────────
  const refresh = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;
    try {
      const data = await fetchRaw<TokenResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: stored }),
      });
      setAccessToken(data.access_token);
      return data.access_token;
    } catch {
      localStorage.removeItem(REFRESH_KEY);
      return null;
    }
  }, []);

  useEffect(() => {
    registerRefreshFn(refresh);
  }, [refresh]);

  // ── Load /auth/me with a given token ─────────────────────────────────────────
  const loadMe = useCallback(async (token: string) => {
    try {
      const data = await fetchRaw<MeResponse>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data.user);
      const cw = data.current_workspace;
      setWorkspace({
        id: cw.id,
        name: cw.name,
        slug: cw.slug,
        created_at: "",
        is_personal: cw.is_personal,
      });
      setRole(cw.role);
      setWorkspaces(
        data.workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          created_at: "",
          is_personal: w.is_personal,
        })),
      );
      setPendingInvites(data.pending_invites ?? []);
    } catch {
      // session invalid — clear
      setAccessToken(null);
      localStorage.removeItem(REFRESH_KEY);
    }
  }, []);

  // ── Session restore / demo mode switch ────────────────────────────────────────
  useEffect(() => {
    if (demo) {
      setUser(DEMO_USER);
      setWorkspace(DEMO_WORKSPACE);
      setWorkspaces([DEMO_WORKSPACE]);
      setRole("owner");
      setPendingInvites([]);
      setIsLoading(false);
      return;
    }

    // Real mode — try to restore session
    const restore = async () => {
      setIsLoading(true);
      const token = await refresh();
      if (token) {
        await loadMe(token);
      } else {
        setUser(null);
        setWorkspace(null);
        setWorkspaces([]);
        setRole(null);
        setPendingInvites([]);
      }
      setIsLoading(false);
    };
    restore();
  }, [demo, refresh, loadMe]);

  // ── Auth actions ──────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await fetchRaw<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setRole(getRoleFromToken(data.access_token));
      await loadMe(data.access_token);
    },
    [loadMe],
  );

  const signup = useCallback(
    async (
      email: string,
      displayName: string,
      password: string,
      inviteToken?: string,
    ) => {
      const body: Record<string, string> = {
        email,
        display_name: displayName,
        password,
      };
      if (inviteToken) body.invite_token = inviteToken;
      const data = await fetchRaw<TokenResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setRole(getRoleFromToken(data.access_token));
      await loadMe(data.access_token);
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
    setRole(null);
    setPendingInvites([]);
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      const token = getAccessToken();
      if (!token) return;
      const data = await fetchRaw<TokenResponse>("/auth/switch-workspace", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setRole(getRoleFromToken(data.access_token));
      await loadMe(data.access_token);
    },
    [loadMe],
  );

  const acceptInvite = useCallback(
    async (token: string) => {
      const accessToken = getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");
      const data = await fetchRaw<TokenResponse>(
        `/auth/accept-invite/${token}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      setAccessToken(data.access_token);
      localStorage.setItem(REFRESH_KEY, data.refresh_token);
      setRole(getRoleFromToken(data.access_token));
      await loadMe(data.access_token);
    },
    [loadMe],
  );

  // User can create a workspace only if they belong to no non-personal workspace
  const canCreateWorkspace = !workspaces.some((w) => !w.is_personal);

  const value: AuthState = {
    user,
    workspace,
    workspaces,
    role,
    isSuperAdmin: user?.is_superadmin ?? false,
    isAuthenticated: !!user,
    isLoading,
    pendingInvites,
    canCreateWorkspace,
    login,
    signup,
    logout,
    switchWorkspace,
    acceptInvite,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
