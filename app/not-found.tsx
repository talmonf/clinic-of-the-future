import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="text-sm text-clay">404</p>
      <h1 className="mt-2 font-serif text-4xl">העמוד לא נמצא</h1>
      <Link href="/" className="mt-6 text-olive underline">
        חזרה לאתר
      </Link>
    </main>
  );
}
