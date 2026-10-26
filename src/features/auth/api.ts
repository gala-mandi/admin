import { api } from "@/lib/api";
import type {
  ChangePasswordInput,
  LoginInput,
  RevokedSessionsResult,
  Session,
  User,
} from "./types";

export async function login(input: LoginInput): Promise<Session> {
  const { data } = await api.post<Session>("/auth/login", input);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function logoutAll(): Promise<void> {
  await api.post("/auth/logout-all");
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<RevokedSessionsResult> {
  const { data } = await api.post<RevokedSessionsResult>(
    "/auth/change-password",
    input,
  );
  return data;
}
