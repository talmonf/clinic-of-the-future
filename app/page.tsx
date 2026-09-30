import Link from "next/link";
import { InterestForm } from "@/components/interest-form";
import { founders } from "@/lib/founders";
import { t } from "@/lib/i18n";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <p className="min-w-0 flex-1 font-serif text-base leading-6 md:text-lg">{t.meta.title}</p>
          <Link href="/login" className="shrink-0 rounded-md border border-line bg-card px-3 py-1.5 text-sm">
            {t.nav.login}
          </Link>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="text-sm tracking-wide text-clay">{t.public.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl">{t.meta.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{t.public.lead}</p>
        </section>
        <section className="border-y border-line bg-card">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 md:grid-cols-2">
            <article>
              <h2 className="font-serif text-2xl">{t.public.buildingTitle}</h2>
              <p className="mt-3 leading-7 text-muted">{t.public.buildingBody}</p>
            </article>
            <article>
              <h2 className="font-serif text-2xl">{t.public.notTitle}</h2>
              <p className="mt-3 leading-7 text-muted">{t.public.notBody}</p>
            </article>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="font-serif text-2xl">{t.public.foundersTitle}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {founders.map((founder) => (
              <li key={founder.name} className="border-s-2 border-clay ps-4">
                <p className="font-serif text-xl">{founder.name}</p>
                <p className="whitespace-nowrap text-sm text-muted">{founder.role}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="interest" className="border-t border-line bg-paper-2/60">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 md:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="font-serif text-2xl">{t.public.interestTitle}</h2>
              <p className="mt-3 leading-7 text-muted">{t.public.interestLead}</p>
            </div>
            <div className="rounded-xl border border-line bg-card p-5">
              <InterestForm />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
