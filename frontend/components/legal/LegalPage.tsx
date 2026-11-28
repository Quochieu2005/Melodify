import type { ReactNode } from 'react';

export type LegalSection = { title: string; body: ReactNode };

// Fill in a contact address to show a "Liên hệ" section at the end of both legal pages.
export const LEGAL_CONTACT_EMAIL = '';

export default function LegalPage({ title, updatedAt, intro, sections }: { title: string; updatedAt: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="w-full max-w-3xl px-8 pb-16 pt-8 text-white/85">
      <h1 className="text-[28px] font-bold leading-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/55">Cập nhật lần cuối: {updatedAt}</p>
      <p className="mt-6 leading-7">{intro}</p>
      {sections.map((section, index) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-xl font-bold text-white">{index + 1}. {section.title}</h2>
          <div className="mt-3 space-y-3 leading-7 [&_a]:text-cyan-300 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">{section.body}</div>
        </section>
      ))}
      {LEGAL_CONTACT_EMAIL ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">{sections.length + 1}. Liên hệ</h2>
          <p className="mt-3 leading-7">Mọi câu hỏi hoặc yêu cầu liên quan, vui lòng gửi tới <a className="text-cyan-300 underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p>
        </section>
      ) : null}
    </main>
  );
}
