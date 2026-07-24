import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import useAuthStore from "@/stores/authStore";
import { ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const errs = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      errs.fullName = "Full name is required (at least 2 characters)";
    }

    if (!form.email && !form.phone) {
      errs.email = "Either email or phone number is required";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address";
    }

    if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/\s/g, ""))) {
      errs.phone = "Please enter a valid phone number";
    }

    if (form.email && !form.password) {
      errs.password = "Password is required for email registration";
    }

    if (form.password && form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }

    if (form.password && form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        role: "STUDENT",
      };

      if (form.email) payload.email = form.email.toLowerCase().trim();
      if (form.phone) payload.phone = form.phone.replace(/\s/g, "");
      if (form.password) payload.password = form.password;

      const user = await register(payload);
      toast.success("Account created! Welcome aboard.");
      navigate(ROLE_DASHBOARD_PATHS[user.role] || "/");
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      const fieldErrors = err.response?.data?.errors;

      if (fieldErrors && Array.isArray(fieldErrors)) {
        const mapped = {};
        fieldErrors.forEach((e) => {
          if (e.field) mapped[e.field] = e.message;
        });
        setErrors(mapped);
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">LMS Platform</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Start your learning journey today
          </h1>
          <p className="mt-4 text-lg text-primary-200 leading-relaxed">
            Create your account in under a minute. Pick your subjects, pay once, and get instant access to recorded lectures, practice questions, and live support from expert teachers.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Recorded lectures for every topic",
              "MCQ practice with instant feedback",
              "Direct doubt support from teachers",
              "Parent dashboard for transparency",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-primary-100">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-primary-300">
          Trusted by students across Pakistan
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LMS Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-500">
            Fill in your details to get started
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Full name"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              error={errors.fullName}
              autoComplete="name"
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Phone number (optional if email provided)"
              type="tel"
              placeholder="+92 300 1234567"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              error={errors.phone}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                error={errors.password}
                autoComplete="new-password"
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

            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
