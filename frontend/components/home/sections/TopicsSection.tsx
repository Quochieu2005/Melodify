'use client';

import Image from 'next/image';
import { useState } from 'react';

type Topic = { title: string; image: string };
type TopicItem = readonly [string, string];

const asset = (group: string, file: string) => `/topics/${group}/${file}`;
const makeTopics = (group: string, items: readonly TopicItem[]): Topic[] =>
  items.map(([title, file]) => ({ title, image: asset(group, file) }));

const forYou = makeTopics('genre', [
  ['TikTok', 'scene_2_600.png'], ['Remix', 'genre_39_600.png'], ['V-Pop', 'vpop_600.png'],
  ['Pop', 'genre_101_600.png'], ['V-Rap', 'vrap_600.png'], ['V-Indie', 'genre_29_600.png'],
]);
forYou[0].image = asset('scene', 'scene_2_600.png');

const genres = makeTopics('genre', [
  ['C-Pop', 'CPop_600.png'], ['Bolero', 'genre_23_600.png'], ['K-Pop', 'kpop_600.png'],
  ['Pop Ballad', 'genre_25_600.png'], ['Lofi', 'genre_14_600.png'], ['Instrumental', 'genre_18_600.png'],
  ['Acoustic', 'genre_20_600.png'], ['Golden Age Music', 'genre_30_600.png'], ['Soundtrack', 'genre_10_600.png'],
  ['Chinese Melody Viet Version', 'genre_102_600.png'], ['Buddhist Music', 'genre_15_600.png'], ['Jazz', 'genre_13_600.png'],
  ['Anime', 'genre_16_600.png'], ['Erotic Music', 'genre_12_600.png'], ['Disco Music', 'genre_11_600.png'],
  ['Other US-UK', 'genre_4_600.png'], ['Rock', 'genre_7_600.png'], ['Country', 'genre_99_600_600.png'],
  ['Symphony', 'genre_17_600.png'], ['Latin', 'genre_98_600_600.png'], ['J-Pop', 'JPop_600.png'],
  ['T-Pop', 'genre_22_600.png'], ['Indian Music', 'genre_24_600.png'], ['Christian Music', 'genre_26_600.png'],
  ['Indie', 'genre_27_600.png'], ['Children Music', 'genre_28_600.png'], ['Opera', 'genre_31_600.png'],
  ['Cartoon', 'genre_32_600.png'], ['French Music', 'genre_33_600.png'], ['Baroque', 'genre_35_600.png'],
  ['V-Rock', 'genre_36_600.png'],
]);

const moods = makeTopics('mood', [
  ['Chill Out', 'mood_108_600.png'], ['Sad', 'mood_3_600.png'], ['Relaxing', 'mood_2_600.png'],
  ['Heartbreak', 'mood_9_600.png'], ['Love', 'mood_1_600.png'], ['Missing', 'mood_4_600.png'],
  ['Sweet', 'mood_5_600.png'], ['Lonely', 'mood_6_600.png'], ['Exciting', 'mood_7_600.png'],
  ['Hopeful', 'mood_10_600.png'], ['Motivation', 'mood_11_600.png'], ['Dreamy', 'mood_13_600.png'],
  ['Lazy', 'mood_14_600.png'], ['Shy', 'mood_15_600.png'], ['Sexy', 'mood_16_600.png'],
  ['Soft', 'mood_17_600.png'], ['Soothing', 'mood_18_600.png'], ['Inspiring', 'mood_19_600.png'],
  ['Strong', 'mood_20_600.png'], ['Vulnerable', 'mood_21_600.png'], ['Sentimental', 'mood_22_600.png'],
]);

const scenes = makeTopics('scene', [
  ['Coffee', 'scene_1_600.png'], ['Traveling', 'scene_11_600.png'], ['Workout', 'scene_26_600.png'],
  ['Wedding', 'scene_37_600.png'], ['Summer', 'scene_39_600.png'], ['Driving', 'Driving_600.png'],
  ['Music Awards', 'scene_47_600.png'], ['Nonstop', 'scene_48_600.png'], ['Rainy', 'scene_30_600.png'],
  ['Tet Holiday', 'scene_1213_600.png'], ['Mother', 'scene_41_600.png'], ['Winter', 'scene_32_600.png'],
  ['Christmas', 'scene_31_600.png'], ['Dating', 'scene_12_600.png'], ['Fall', 'scene_44_600.png'],
  ['Mashup', 'scene_50_600.png'], ['Relieve Stress', 'scene_3_600.png'], ['Night', 'scene_4_600.png'],
  ['Hang Out', 'scene_5_600.png'], ['Party', 'scene_6_600.png'], ['Afternoon', 'scene_7_600.png'],
  ['Morning', 'scene_8_600.png'], ['Girls', 'scene_9_600.png'], ['Quiet', 'scene_13_600.png'],
  ['Nightclub', 'scene_14_600.png'], ['Twilight', 'scene_15_600.png'], ['Lounge Music', 'scene_16_600.png'],
  ['Jogging', 'scene_17_600.png'], ['Mother & Baby', 'scene_18_600.png'], ['Boys', 'scene_19_600.png'],
  ['Friendship', 'scene_20_600.png'], ['Sleeping', 'scene_21_600.png'], ['Weekend', 'scene_22_600.png'],
  ['Household Chores', 'scene_23_600.png'], ['Working', 'scene_24_600.png'], ['Sport', 'scene_25_600.png'],
  ['Studying', 'scene_28_600.png'], ['Shower', 'scene_29_600.png'], ['Family', 'scene_33_600.png'],
  ['Gaming', 'scene_34_600.png'], ['Shopping', 'scene_35_600.png'], ['Aerobic', 'scene_36_600.png'],
  ['Spring', 'scene_38_600.png'], ['Schoolyard', 'scene_40_600.png'], ['Cinema', 'scene_42_600.png'],
  ['Sunny', 'scene_43_600.png'], ['Spa & Yoga', 'scene_45_600.png'], ['Southern Vietnam', 'scene_46_600.png'],
  ['Dancing', 'scene_49_600.png'], ['Birthday', 'scene_51_600.png'], ['Father', 'scene_52_600.png'],
  ['Northern Vietnam', 'scene_53_600.png'], ['Central Vietnam', 'scene_54_600.png'], ['Teacher', 'scene_55_600.png'],
]);

const tabs = [
  { label: 'ALL', sections: [{ title: 'For You', topics: forYou }, { title: 'Genres', topics: genres }, { title: 'Mood', topics: moods }, { title: 'Scene', topics: scenes }] },
  { label: 'Genre', sections: [{ title: 'Genres', topics: genres }] },
  { label: 'Scene', sections: [{ title: 'Scene', topics: scenes }] },
  { label: 'Mood', sections: [{ title: 'Mood', topics: moods }] },
];

const sectionTabIndex: Record<string, number> = { Genres: 1, Scene: 2, Mood: 3 };

export default function TopicsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const selectTab = (tabIndex: number) => setActiveTab(tabIndex);

  return (
    <section aria-labelledby="topics-heading" className="mt-12">
      <h2 id="topics-heading" className="text-[24px] font-bold leading-none text-white">Topics</h2>
      <div role="tablist" aria-label="Topic categories" className="relative z-10 mb-9 mt-8 flex gap-9">
        {tabs.map((tab, index) => (
          <button key={tab.label} type="button" role="tab" aria-selected={activeTab === index} onClick={() => selectTab(index)} className={`relative z-10 cursor-pointer pb-2 text-[14px] font-semibold transition-colors ${activeTab === index ? 'text-[#00d3e5]' : 'text-[#a9aaa9] hover:text-white'}`}>
            {tab.label}
            {activeTab === index && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#00d3e5]" />}
          </button>
        ))}
      </div>
      <div key={tabs[activeTab].label} className="space-y-10">
        {tabs[activeTab].sections.map((section) => (
          <div key={section.title}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[23px] font-bold leading-none text-white">{section.title}</h3>
              {section.topics.length > 6 && (
                <button type="button" onClick={() => selectTab(sectionTabIndex[section.title])} className="relative z-10 cursor-pointer text-[13px] font-semibold text-white hover:text-[#00d3e5]">
                  More
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-5 min-[1500px]:grid-cols-6 min-[1800px]:grid-cols-7">
              {section.topics.map((topic) => (
                <button
                  key={topic.title}
                  type="button"
                  className="group relative flex aspect-[2.08/1] items-start justify-start overflow-hidden rounded-[8px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d3e5]"
                >                  
                <Image src={topic.image} alt="" fill sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 520px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
                  <span className="relative z-10 block p-3 text-[14px] font-bold leading-tight text-white drop-shadow-md">{topic.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
