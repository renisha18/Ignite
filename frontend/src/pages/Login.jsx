import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { validateLogin } from "../services/validation";
import { getErrorMessage } from "../services/errorMessage";
import { dashboardPathForRole } from "../services/roleRoutes";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear that field's error as soon as the user edits it, rather
    // than leaving a stale error visible while they retype.
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errors = validateLogin(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const data = await login(form);
      // If ProtectedRoute redirected here from a specific page,
      // return there; otherwise go to the role's default dashboard.
      const redirectTo = location.state?.from?.pathname || dashboardPathForRole(data.user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Ignite account">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Alert variant="error">{serverError}</Alert>

        <FormInput
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />

        <FormInput
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={fieldErrors.password}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <Button loading={loading}>Log in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-maroon hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
