'use client';

import { useEffect, useMemo, useState } from 'react';
import { listGenres, listTopics } from '@/lib/api';
import {
  genreRecordToCard,
  pickDailyTopics,
  topicRecordToCard,
  type TopicCard,
  vietnamDateKey,
} from '@/lib/topic-data';

type TabId = 'all' | 'genre' | 'scene' | 'mood';

type TopicSection = {
  id: string;
  title: string;
  topics: TopicCard[];
  moreTab?: TabId;
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'all', label: 'TẤT CẢ' },
  { id: 'genre', label: 'THỂ LOẠI' },
  { id: 'scene', label: 'BỐI CẢNH' },
  { id: 'mood', label: 'TÂM TRẠNG' },
];

const emptyCollections = {
  genres: [] as TopicCard[],
  scenes: [] as TopicCard[],
  moods: [] as TopicCard[],
  other: [] as TopicCard[],
};

function TopicCardButton({ topic }: { topic: TopicCard }) {
  return (
    <button
      type="button"
      aria-label={`Mở chủ đề ${topic.title}`}
      className="group relative flex aspect-[2.08/1] items-start justify-start overflow-hidden rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundImage: topic.image ? `url("${topic.image}")` : undefined }}
      />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
      <span className="relative z-10 block p-3 text-[14px] font-bold leading-tight text-white drop-shadow-md">{topic.title}</span>
    </button>
  );
}

function TopicSectionBlock({ section, onMore }: { section: TopicSection; onMore: (tab: TabId) => void }) {
  if (section.topics.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[23px] font-bold leading-none text-white">{section.title}</h3>
        {section.moreTab && section.topics.length > 6 && (
          <button
            type="button"
            onClick={() => onMore(section.moreTab as TabId)}
            className="relative z-10 cursor-pointer text-[13px] font-semibold text-white hover:text-[#00d3e5]"
          >
            Xem thêm
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1500px]:grid-cols-6 min-[1800px]:grid-cols-7">
        {section.topics.map((topic) => <TopicCardButton key={`${topic.kind}-${topic.id}`} topic={topic} />)}
      </div>
    </div>
  );
}

export default function TopicsSection() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [collections, setCollections] = useState(emptyCollections);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTopics = async () => {
      try {
        const [topicResponse, genreResponse] = await Promise.all([
          listTopics({ perPage: 50 }),
          listGenres({ perPage: 50 }),
        ]);

        if (cancelled) return;

        const topicCards = topicResponse.data.map(topicRecordToCard);
        setCollections({
          genres: genreResponse.data.map(genreRecordToCard),
          scenes: topicCards.filter((topic) => topic.kind === 'scene'),
          moods: topicCards.filter((topic) => topic.kind === 'mood'),
          other: topicCards.filter((topic) => topic.kind === 'topic'),
        });
        setError(null);
      } catch {
        if (!cancelled) setError('Không thể tải danh sách chủ đề lúc này.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadTopics();
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo<TopicSection[]>(() => {
    const allTopics = [collections.genres, collections.moods, collections.scenes, collections.other].flat();
    const forYou = pickDailyTopics(allTopics, 6, vietnamDateKey());

    return [
      { id: 'for-you', title: 'Dành cho bạn', topics: forYou },
      { id: 'genres', title: 'Thể loại', topics: collections.genres, moreTab: 'genre' as TabId },
      { id: 'moods', title: 'Tâm trạng', topics: collections.moods, moreTab: 'mood' as TabId },
      { id: 'scenes', title: 'Bối cảnh', topics: collections.scenes, moreTab: 'scene' as TabId },
      { id: 'other', title: 'Chủ đề khác', topics: collections.other },
    ];
  }, [collections]);

  const visibleSections = useMemo(() => {
    if (activeTab === 'all') return sections;
    return sections.filter((section) => section.moreTab === activeTab);
  }, [activeTab, sections]);

  return (
    <section aria-labelledby="topics-heading" className="mt-12">
      <h2 id="topics-heading" className="text-[24px] font-bold leading-none text-white">Chủ đề</h2>
      <div role="tablist" aria-label="Danh mục chủ đề" className="relative z-10 mb-9 mt-8 flex gap-9">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 cursor-pointer pb-2 text-[14px] font-semibold transition-colors ${activeTab === tab.id ? 'text-[#00d3e5]' : 'text-[#a9aaa9] hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#00d3e5]" />}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1500px]:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2.08/1] animate-pulse rounded-[8px] bg-[#30443f]" />)}
        </div>
      )}

      {!isLoading && error && (
        <p role="status" className="rounded-[8px] bg-[#30443f] px-4 py-3 text-sm text-[#bdbdbd]">{error}</p>
      )}

      {!isLoading && !error && (
        <div key={activeTab} className="space-y-10">
          {visibleSections.map((section) => (
            <TopicSectionBlock key={section.id} section={section} onMore={setActiveTab} />
          ))}
        </div>
      )}
    </section>
  );
}
