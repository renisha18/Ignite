// Volunteer Profile — view and edit.
//
// Owns fetching, form state and submit. Presentation is delegated to
// the ui/ components; the skill picker owns its own catalogue fetch.
//
// Name and email are read-only: they live on `users` and changing them
// is an auth concern, not a profile one — there's no endpoint for it
// and inventing one would mean touching the locked auth module.
import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import SkillMultiSelect from "../../components/ui/SkillMultiSelect";
import Alert from "../../components/Alert";
import { getProfile, updateProfile } from "../../services/profileService";
import { getErrorMessage } from "../../services/errorMessage";

const MAX_LOCATION = 255;

// The server stores NULL for "not set"; a controlled <input> needs "".
// Converting at both boundaries keeps React from flipping between
// controlled and uncontrolled mid-edit.
function toForm(profile) {
  return {
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    skillIds: profile.skills.map((s) => s.skillId),
  };
}

function sameSelection(a, b) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let ignore = false;

    getProfile()
      .then((data) => {
        if (ignore) return;
        setProfile(data);
        setForm(toForm(data));
      })
      .catch((err) => {
        if (!ignore) setLoadError(getErrorMessage(err, "Couldn't load your profile."));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Only send what actually changed. The backend treats an absent key
  // as "leave it alone", so this keeps a bio-only edit from rewriting
  // the skill rows (and vice versa).
  function changedFields() {
    const original = toForm(profile);
    const body = {};
    if (form.bio !== original.bio) body.bio = form.bio;
    if (form.location !== original.location) body.location = form.location;
    if (!sameSelection(form.skillIds, original.skillIds)) {
      body.skillIds = form.skillIds;
    }
    return body;
  }

  const isDirty = profile && form && Object.keys(changedFields()).length > 0;
  const locationTooLong = form ? form.location.length > MAX_LOCATION : false;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isDirty || locationTooLong) return;

    setSaving(true);
    setSaveError(null);

    try {
      const updated = await updateProfile(changedFields());
      // Reset the baseline from the server's response, not the local
      // form — so the dirty check reflects what was actually stored
      // (including a bio the server trimmed or nulled).
      setProfile(updated);
      setForm(toForm(updated));
      setToast({ variant: "success", message: "Profile saved." });
    } catch (err) {
      const message = getErrorMessage(err, "Couldn't save your profile.");
      setSaveError(message);
      setToast({ variant: "error", message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Profile" />
        <Card className="h-56 animate-pulse" aria-busy="true" aria-label="Loading profile">
          <div className="h-3 w-32 rounded bg-muted/25" />
          <div className="mt-4 h-3 w-48 rounded bg-muted/20" />
          <div className="mt-8 h-20 w-full rounded bg-muted/15" />
        </Card>
      </>
    );
  }

  // Plain statement of what happened, no filler apology.
  if (loadError) {
    return (
      <>
        <PageHeader title="Profile" />
        <Alert>{loadError}</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your details and the skills organizers match you on."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Name
              </p>
              <p className="mt-1 text-sm text-ink">{profile.fullName}</p>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Email
              </p>
              <p className="mt-1 truncate text-sm text-ink">{profile.email}</p>
            </div>
          </div>

          <p className="mt-4 border-t border-muted/25 pt-3 text-xs text-muted">
            Name and email come from your account and can&apos;t be changed here.
          </p>
        </Card>

        <Card className="space-y-5">
          <div>
            <label
              htmlFor="profile-bio"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
            >
              Bio
            </label>
            <textarea
              id="profile-bio"
              rows={4}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="A sentence or two about you — organizers read this."
              className="w-full resize-y rounded-lg border border-muted/40 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="profile-location"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
            >
              Location
            </label>
            <input
              id="profile-location"
              type="text"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="City or area"
              aria-invalid={locationTooLong}
              className={`w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none ${
                locationTooLong
                  ? "border-primary focus:border-primary"
                  : "border-muted/40 focus:border-primary"
              }`}
            />
            {locationTooLong && (
              <p className="mt-1 text-xs text-primary">
                Location must be {MAX_LOCATION} characters or fewer — currently{" "}
                {form.location.length}.
              </p>
            )}
          </div>

          <SkillMultiSelect
            value={form.skillIds}
            onChange={(skillIds) => update("skillIds", skillIds)}
            disabled={saving}
          />
        </Card>

        {saveError && <Alert>{saveError}</Alert>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} disabled={!isDirty || locationTooLong}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {isDirty && !saving && (
            <button
              type="button"
              onClick={() => setForm(toForm(profile))}
              className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
            >
              Discard
            </button>
          )}
        </div>
      </form>

      <Toast
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
