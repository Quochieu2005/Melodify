'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { listGenres, listTopics, subscribeCatalogResponse } from '@/lib/api';
import {
  genreRecordToCard,
  pickDailyTopics,
  topicHref,
  topicRecordToCard,
  type TopicCard,
  vietnamDateKey,
} from '@/lib/topic-data';


export default function HomeTopicsSection() {
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateKey] = useState(vietnamDateKey);

  useEffect(() => {
    let cancelled = false;
    let genres: TopicCard[] = [];
    let topicsFromApi: TopicCard[] = [];

    const publishTopics = () => {
      if (cancelled) return;
      setTopics(pickDailyTopics([...genres, ...topicsFromApi], 12, dateKey));
      setError('');
      setIsLoading(false);
    };

    const unsubscribeGenres = subscribeCatalogResponse<Awaited<ReturnType<typeof listGenres>>>(
      '/v1/genres?per_page=20',
      (response) => { genres = response.data.map(genreRecordToCard); publishTopics(); },
    );
    const unsubscribeTopics = subscribeCatalogResponse<Awaited<ReturnType<typeof listTopics>>>(
      '/v1/topics?per_page=20',
      (response) => { topicsFromApi = response.data.map(topicRecordToCard); publishTopics(); },
    );

    const loadDailyTopics = async () => {
      try {
        const [genresResult, topicsResult] = await Promise.allSettled([
          listGenres({ perPage: 20 }),
          listTopics({ perPage: 20 }),
        ]);
        if (genresResult.status === 'fulfilled') genres = genresResult.value.data.map(genreRecordToCard);
        if (topicsResult.status === 'fulfilled') topicsFromApi = topicsResult.value.data.map(topicRecordToCard);

        if (!cancelled) {
          setTopics(pickDailyTopics([...genres, ...topicsFromApi], 12, dateKey));
          setError(genresResult.status === 'rejected' && topicsResult.status === 'rejected' ? 'Không thể tải chủ đề lúc này.' : '');
        }
      } catch {
        if (!cancelled) {
          setTopics([]);
          setError('Không thể tải chủ đề lúc này.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadDailyTopics();
    return () => {
      cancelled = true;
      unsubscribeGenres();
      unsubscribeTopics();
    };
  }, [dateKey]);

  return (
    <section aria-labelledby="home-topics-heading" className="mt-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2
          id="home-topics-heading"
          className="text-[24px] font-bold leading-none text-white"
          style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700 }}
        >
          Chủ Đề
        </h2>
        <Link
          href="/topic"
          className="cursor-pointer text-[14px] font-medium text-[#bdbdbd] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]"
          style={{ color: '#bdbdbd', fontSize: '14px', fontWeight: 500 }}
        >
          Thêm
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:gap-5">
          {Array.from({ length: 12 }, (_, index) => <div key={index} className="h-[115px] animate-pulse rounded-[10px] bg-[#30443f]" />)}
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-red-300">{error}</p>
      ) : topics.length === 0 ? (
        <p className="text-sm text-white/60">Chưa có chủ đề.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:gap-5">
          {topics.map((topic) => (
            <Link
              key={`${topic.kind}-${topic.id}`}
              href={topicHref(topic)}
              aria-label={`Mở playlist theo chủ đề ${topic.title}`}
              className="group relative block h-[115px] w-full min-w-0 overflow-hidden rounded-[10px] bg-[#30443f] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]"
            >
              {topic.image ? <Image aria-hidden="true" src={topic.image} alt="" fill sizes="(max-width: 640px) 50vw, 20vw" unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" /> : null}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/0 transition-colors group-hover:from-black/55" />
              <h3 className="relative z-10 p-3 text-[14px] font-bold leading-tight text-white drop-shadow-sm" style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700 }}>
                {topic.title}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
