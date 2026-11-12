import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-4 text-center">
      <div className="grid gap-5 justify-items-center">
        <p className="label">404</p>
        <h1 className="text-4xl">This path does not lead anywhere.</h1>
        <Link href="/" className="btn-outline">Back to the house</Link>
      </div>
    </main>
  );
}
