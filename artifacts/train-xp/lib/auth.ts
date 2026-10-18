import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  provider: "apple" | "google" | "email" | "anonymous";
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<AuthUser | null> {
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only supported on iOS devices.");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(" ")
      : undefined;

    if (!credential.identityToken) {
      throw new Error(
        "Apple did not return an identity token. Please try again.",
      );
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;
    if (!data.user?.id)
      throw new Error("Supabase did not return an authenticated user.");

    return {
      id: data.user.id,
      email: data.user.email ?? credential.email ?? undefined,
      fullName: fullName || undefined,
      provider: "apple",
    };
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      return null; // User cancelled Apple Sign In dialog
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  try {
    // The root callback must match the exact train-xp:// URL in Supabase.
    // createURL("/") adds a third slash and misses that allow-list entry.
    const redirectUrl = Linking.createURL("");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error("No OAuth URL returned from Supabase.");
    }

    const authRes = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
    );

    if (authRes.type !== "success" || !authRes.url) {
      return null; // User cancelled or dismissed browser
    }

    // Extract auth tokens or code from redirect URL
    const parsedUrl = new URL(authRes.url);
    const hash = parsedUrl.hash ? parsedUrl.hash.substring(1) : "";
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(parsedUrl.search);

    const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
    const code = queryParams.get("code") || hashParams.get("code");

    let sessionUser: any = null;

    if (code) {
      const { data: exchanged, error: exchErr } =
        await supabase.auth.exchangeCodeForSession(code);
      if (exchErr) throw exchErr;
      sessionUser = exchanged?.user;
    } else if (accessToken && refreshToken) {
      const { data: setRes, error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setErr) throw setErr;
      sessionUser = setRes?.user;
    } else {
      throw new Error("Google did not return a session. Check the Supabase redirect URL.");
    }

    if (!sessionUser) {
      throw new Error(
        "Failed to retrieve session after Google authentication.",
      );
    }

    const fullName =
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      sessionUser.email?.split("@")[0] ||
      "Athlete";

    return {
      id: sessionUser.id,
      email: sessionUser.email,
      fullName,
      provider: "google",
    };
  } catch (err) {
    console.warn("[Auth] Google Sign-In error:", err);
    throw err;
  }
}

export const signInWithGoogleMock = signInWithGoogle;

export async function signInWithPassword(
  identifier: string,
  password: string,
): Promise<AuthUser | null> {
  const cleanId = identifier.trim();
  const cleanPass = password.trim();
  if (!cleanId || !cleanPass) {
    throw new Error("Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.");
  }

  const email = cleanId.includes("@")
    ? cleanId
    : `${cleanId.toLowerCase()}@trainxp.app`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: cleanPass,
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("Không nhận được thông tin tài khoản.");
  }

  const fullName =
    data.user.user_metadata?.full_name ||
    data.user.user_metadata?.name ||
    data.user.email?.split("@")[0] ||
    cleanId;

  return {
    id: data.user.id,
    email: data.user.email ?? email,
    fullName,
    provider: "email",
  };
}

export async function deleteUserAccount(): Promise<void> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session)
    throw new Error("No signed-in account is available to delete.");

  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw new Error(`Account deletion failed: ${error.message}`);

  await supabase.auth.signOut();
}
