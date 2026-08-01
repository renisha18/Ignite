import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center">
      <h1 className="text-2xl font-semibold text-maroon">403</h1>
      <p className="text-sm text-gray-500">
        You don&apos;t have permission to view this page.
      </p>
      <Link to="/login" className="text-sm font-medium text-maroon hover:underline">
        Back to login
      </Link>
    </div>
  );
}
