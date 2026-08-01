import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { validateRegister } from "../services/validation";
import { getErrorMessage } from "../services/errorMessage";
import { dashboardPathForRole } from "../services/roleRoutes";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  orgName: "",
  orgDescription: "",
  orgLocation: "",
};

export default function Register() {
  const { registerVolunteer, registerOrganizer } = useAuth();
  const navigate = useNavigate();

  // Why "role" is local UI state, not sent as a field: the backend
  // has two distinct endpoints (register/volunteer, register/organizer)
  // rather than one endpoint branching on a role field — this toggle
  // decides which service function to call, matching that design.
  // There's no "admin" option here on purpose: admins are seeded via
  // the backend's seed-admin.js script, never self-registered.
  const [role, setRole] = useState("volunteer");
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleRoleChange(next) {
    setRole(next);
    setFieldErrors({});
    setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errors = validateRegister({ ...form, role });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const data =
        role === "volunteer"
          ? await registerVolunteer(form)
          : await registerOrganizer(form);
      navigate(dashboardPathForRole(data.user.role), { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join Ignite as a volunteer or organizer">
      {/* Role toggle */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
        {["volunteer", "organizer"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleRoleChange(r)}
            className={`rounded-md py-2 text-sm font-medium capitalize transition ${
              role === r ? "bg-maroon text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Alert variant="error">{serverError}</Alert>

        <FormInput
          label="Full name"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          error={fieldErrors.fullName}
          autoComplete="name"
          placeholder="Jane Doe"
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />

        {role === "organizer" && (
          <>
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                Organization details
              </p>
            </div>

            <FormInput
              label="Organization name"
              name="orgName"
              value={form.orgName}
              onChange={handleChange}
              error={fieldErrors.orgName}
              placeholder="Rotaract Club of..."
            />

            <FormInput
              label="Description (optional)"
              name="orgDescription"
              value={form.orgDescription}
              onChange={handleChange}
              placeholder="What does your club do?"
            />

            <FormInput
              label="Location (optional)"
              name="orgLocation"
              value={form.orgLocation}
              onChange={handleChange}
              placeholder="City"
            />

            <Alert variant="info">
              New organizations start as <strong>pending</strong> — an admin
              needs to approve yours before you can publish events.
            </Alert>
          </>
        )}

        <Button loading={loading}>Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-maroon hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
