"use client";

import { Suspense, useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);
  const [socialProviders, setSocialProviders] = useState<string[]>([]);

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    getProviders().then((providers) => {
      if (!providers) return;
      setSocialProviders(
        Object.values(providers)
          .filter((p) => p.id !== "credentials")
          .map((p) => p.id)
      );
    });
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (!result?.ok) {
        const errorMessage = result?.error === "CredentialsSignin"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다.";
        toast.error(errorMessage);
        return;
      }

      toast.success("로그인되었습니다.");
      router.push(callbackUrl);
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              역사자료부 자료이관 시스템
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Credentials 로그인 */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  이메일
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      email: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      password: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>

            {socialProviders.length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">또는</span>
                  </div>
                </div>

                {/* Social 로그인 */}
                <div className="space-y-3">
                  {socialProviders.includes("google") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin("google")}
                      disabled={isLoading}
                    >
                      Google로 로그인
                    </Button>
                  )}

                  {socialProviders.includes("github") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin("github")}
                      disabled={isLoading}
                    >
                      GitHub로 로그인
                    </Button>
                  )}
                </div>
              </>
            )}

            <div className="text-center text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="text-blue-600 hover:underline font-medium"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
