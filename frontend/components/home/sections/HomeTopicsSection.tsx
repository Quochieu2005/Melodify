'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHomeBootstrap } from '@/lib/api';
import {
  fallbackHomeTopics,
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
  const [dateKey] = useState(vietnamDateKey);

  useEffect(() => {
    let cancelled = false;

    const loadDailyTopics = async () => {
      try {
        const response = await getHomeBootstrap();
        const allTopics = [
          ...response.data.genres.map(genreRecordToCard),
          ...response.data.topics.map(topicRecordToCard),
        ];

        if (!cancelled) setTopics(pickDailyTopics(allTopics.length ? allTopics : fallbackHomeTopics, 12, dateKey));
      } catch {
        if (!cancelled) setTopics(pickDailyTopics(fallbackHomeTopics, 12, dateKey));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadDailyTopics();
    return () => { cancelled = true; };
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
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 2xl:gap-5">
          {topics.map((topic) => (
            <Link
              key={`${topic.kind}-${topic.id}`}
              href={topicHref(topic)}
              aria-label={`Mở playlist theo chủ đề ${topic.title}`}
              className="group relative block h-[115px] w-full min-w-0 overflow-hidden rounded-[10px] bg-[#30443f] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#202a28]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: topic.image ? `url("${topic.image}")` : undefined }}
              />
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
