import { Lexend } from 'next/font/google';

const lexend = Lexend({ subsets: ['latin', 'vietnamese'], weight: '700' });

const topics = [
  {
    title: 'Nhạc Hàn',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85',
    position: 'center 30%',
  },
  {
    title: 'Remix',
    image: 'https://images.unsplash.com/photo-1571266028243-d220c6cfb6c3?auto=format&fit=crop&w=900&q=85',
    position: 'center',
  },
  {
    title: 'Thư Giãn',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85',
    position: 'center 60%',
  },
  {
    title: 'Nhạc Trẻ',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=85',
    position: 'center 35%',
  },
  {
    title: 'Pop',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85',
    position: 'center 25%',
  },
  {
    title: 'Nhạc Hoa',
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85',
    position: 'center 25%',
  },
  {
    title: 'Rap Việt',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=85',
    position: 'center 30%',
  },
  {
    title: 'Bolero',
    image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85',
    position: 'center 30%',
  },
  {
    title: 'Chill Out',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=85',
    position: 'center 55%',
  },
  {
    title: 'Buồn',
    image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85',
    position: 'center',
  },
];

export default function TopicsSection() {
  return (
    <section aria-labelledby="topics-heading" className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="topics-heading" className={`${lexend.className} text-[24px] font-bold leading-none text-white`} style={{ color: '#ffffff', fontFamily: 'Lexend, sans-serif', fontSize: '24px', fontWeight: 700 }}>
          Chủ Đề
        </h2>
        <button type="button" className="cursor-pointer text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]" style={{ color: '#bdbdbd', fontSize: '14px', fontWeight: 500 }}>
          Thêm
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-5">
        {topics.map((topic) => (
          <article key={topic.title} className="relative h-[115px] w-full min-w-0 overflow-hidden rounded-[10px] bg-[#30443f]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: `url(${topic.image})`,
                backgroundPosition: topic.position,
              }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/0" />
            <h3 className="relative z-10 p-3 text-[14px] font-bold leading-tight text-white drop-shadow-sm" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>
              {topic.title}
            </h3>
          </article>
        ))}
      </div>
    </section>
  );
}
