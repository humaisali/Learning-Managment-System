import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Phone, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import useAuthStore from "@/stores/authStore";
import { ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithPhone, requestOTP } = useAuthStore();

  const [tab, setTab] = useState("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone form
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate(ROLE_DASHBOARD_PATHS[user.role] || "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!phone) return;

    setLoading(true);
    try {
      const result = await requestOTP(phone);
      setOtpSent(true);
      toast.success("OTP sent to your phone number.");

      // Start countdown
      setOtpCountdown(result.expiresInMinutes * 60);
      const interval = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (!phone || !otp) return;

    setLoading(true);
    try {
      const user = await loginWithPhone(phone, otp);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate(ROLE_DASHBOARD_PATHS[user.role] || "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">LMS Platform</span>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Your gateway to quality education
          </h1>
          <p className="mt-4 text-lg text-primary-200 leading-relaxed">
            Access recorded lectures, practice with MCQs, get your doubts resolved by expert teachers, and track your progress — all in one place.
          </p>
        </div>

        <p className="text-sm text-primary-300">
          Trusted by students across Pakistan
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LMS Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-500">
            Choose your preferred login method below
          </p>

          {/* Tab Switcher */}
          <div className="mt-6 flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "email"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setTab("phone"); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "phone"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Phone className="h-4 w-4" />
              Phone
            </button>
          </div>

          {/* Email Login */}
          {tab === "email" && (
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          )}

          {/* Phone Login */}
          {tab === "phone" && (
            <form onSubmit={handlePhoneLogin} className="mt-6 space-y-4">
              <Input
                label="Phone number"
                type="tel"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              {!otpSent ? (
                <Button
                  type="button"
                  onClick={handleRequestOTP}
                  className="w-full"
                  disabled={loading || !phone}
                >
                  {loading ? "Sending OTP..." : "Send verification code"}
                </Button>
              ) : (
                <>
                  <Input
                    label="Verification code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                  />

                  {otpCountdown > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      Code expires in {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, "0")}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? "Verifying..." : "Verify & Sign in"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>

                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={otpCountdown > 0}
                    className="w-full text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                  >
                    Resend code
                  </button>
                </>
              )}
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
