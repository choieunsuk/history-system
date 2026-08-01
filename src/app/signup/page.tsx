"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    passwordConfirm: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.passwordConfirm) {
      toast.error("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "회원가입에 실패했습니다.");
        return;
      }

      toast.success("회원가입이 완료되었습니다. 로그인해주세요.");
      router.push("/login");
    } catch (error) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">회원가입</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  이메일
                </label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">이름</label>
                <Input
                  type="text"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  비밀번호 확인
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.passwordConfirm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passwordConfirm: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "가입 중..." : "회원가입"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="text-blue-600 hover:underline font-medium"
              >
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
