"use client";

import { useEffect, useState } from "react";
import fallback from "@/lib/fallback.json";
import {
  DailyContent,
  readDay,
  readFavorites,
  readPrefs,
  SavedDay,
  writeDay,
  writeFavorites,
  writePrefs,
} from "@/lib/storage";

const topics = [
  "Animals",
  "Space",
  "History",
  "Food",
  "Science",
  "Words",
  "Oceans",
  "Art",
  "Plants",
  "Nature",
];
const reactions = ["Mind blown", "Loved it", "Make me laugh", "Tell me more"];
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function Owl() {
  return (
    <svg className="owl" viewBox="0 0 110 110" role="img" aria-label="Pip the curious cat">
      <path d="M84 94C104 96 102 62 90 60" fill="none" stroke="#2B1B17" strokeWidth="15" strokeLinecap="round" />
      <path d="M84 94C104 96 102 62 90 60" fill="none" stroke="#F6B91E" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="55" cy="88" rx="30" ry="19" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" />
      <ellipse cx="55" cy="92" rx="15" ry="12" fill="#FFF4DC" />
      <path d="M22 42 19 9l27 14ZM88 42l3-33-27 14Z" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 30 25 17l12 7ZM84 30l1-13-12 7Z" fill="#FF8FB1" />
      <ellipse cx="55" cy="52" rx="38" ry="29" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" />
      <path d="M55 24v9M45 26l2 8M65 26l-2 8" stroke="#E8452C" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="39" cy="52" rx="6.5" ry="8" fill="#2B1B17" />
      <ellipse cx="71" cy="52" rx="6.5" ry="8" fill="#2B1B17" />
      <circle cx="41.5" cy="49" r="2.6" fill="#FFF4DC" />
      <circle cx="73.5" cy="49" r="2.6" fill="#FFF4DC" />
      <circle cx="27" cy="63" r="6" fill="#FF8FB1" opacity=".75" />
      <circle cx="83" cy="63" r="6" fill="#FF8FB1" opacity=".75" />
      <path d="M51 60h8l-4 5Z" fill="#FF8FB1" stroke="#2B1B17" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M55 65q-4 6-9 3M55 65q4 6 9 3" fill="none" stroke="#2B1B17" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 59 8 56M24 66 9 70M86 59l16-3M86 66l15 4" stroke="#2B1B17" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="42" cy="101" rx="9" ry="6" fill="#FFF4DC" stroke="#2B1B17" strokeWidth="3" />
      <ellipse cx="68" cy="101" rx="9" ry="6" fill="#FFF4DC" stroke="#2B1B17" strokeWidth="3" />
    </svg>
  )
}

function SectionTitle({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <span>{kicker}</span>
      <h2>{children}</h2>
    </div>
  );
}
const inflight = new Map<string, Promise<DailyContent>>()

export default function DailyDelight() {
  const [today, setToday] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [day, setDay] = useState<SavedDay | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [favorite, setFavorite] = useState<ReturnType<
    typeof readFavorites
  > | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [teared, setTeared] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [archive, setArchive] = useState<
    { date: string; day: SavedDay }[] | null
  >(null);
  const [readStatus, setReadStatus] = useState("");
  const [openPin, setOpenPin] = useState<string | null>(null);

  useEffect(() => {
    const localToday = dateKey(new Date());
    setToday(localToday);

    const prefs = readPrefs();
    setSelectedTopics(prefs.topics);
    const last = prefs.lastVisit;
    const previous = new Date(`${last || localToday}T12:00:00`);
    const current = new Date(`${localToday}T12:00:00`);
    const gap = Math.round((current.getTime() - previous.getTime()) / 86400000);
    const nextStreak = !last
      ? 1
      : gap === 0
        ? prefs.streak || 1
        : gap === 1
          ? (prefs.streak || 1) + 1
          : 1;
    setStreak(nextStreak);
    writePrefs({ ...prefs, lastVisit: localToday, streak: nextStreak });
    setFavorite(readFavorites());
    const saved = readDay(localToday);
    const days: { date: string; day: SavedDay }[] = [];
    for (let offset = 1; offset <= 30; offset++) {
      const date = new Date(`${localToday}T12:00:00`);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const old = readDay(key);
      if (old) days.push({ date: key, day: old });
    }
    setArchive(days);
    setMounted(true);
    if (saved) {
      setDay(saved);
      setLoading(false);
      return;
    }

    const recentTopics = days
      .slice(0, 14)
      .map((item) => item.day.content.topic);
    let request = inflight.get(localToday);
    if (!request) {
      request = fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localToday,
          topics: prefs.topics,
          recentTopics,
        }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("fallback");
          return response.json() as Promise<DailyContent>;
        })
        .finally(() => {
          inflight.delete(localToday);
        });
      inflight.set(localToday, request);
    }
    request
      .then((content) => {
        const result = { content };
        writeDay(localToday, result);
        setDay(result);
      })
      .catch(() => {
        const content = fallback[
          (new Date(`${localToday}T12:00:00`).getDate() - 1) % fallback.length
        ] as DailyContent;
        setDay({ content });
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleFavorite = (kind: string, title: string, text: string) => {
    if (!today) return;
    const id = `${today}:${kind}`;
    const savedFavorites = favorite ?? [];
    const exists = savedFavorites.some((item) => item.id === id);
    const next = exists
      ? savedFavorites.filter((item) => item.id !== id)
      : [...savedFavorites, { id, date: today, kind, title, text }];
    setFavorite(next);
    writeFavorites(next);
  };
  const isFavorite = (kind: string) =>
    Boolean(
      today && (favorite ?? []).some((item) => item.id === `${today}:${kind}`),
    );
  const chooseReaction = (reaction: string) => {
    if (!day || !today) return;
    const next = { ...day, reaction };
    setDay(next);
    writeDay(today, next);
  };
  const toggleChallenge = () => {
    if (!day || !today || !displayingToday) return;
    const next = { ...day, challengeDone: !day.challengeDone };
    setDay(next);
    writeDay(today, next);
  };
  const chooseTopic = (topic: string) => {
    const currentTopics = selectedTopics ?? [];
    const next = currentTopics.includes(topic)
      ? currentTopics.filter((item) => item !== topic)
      : [...currentTopics, topic];
    setSelectedTopics(next);
    writePrefs({ ...readPrefs(), topics: next });
  };
  const readAloud = () => {
    if (!day || !("speechSynthesis" in window)) {
      setReadStatus("This browser does not have a read-aloud voice.");
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(
      `${day.content.fact}. ${day.content.paragraph.text} ${day.content.story.title}. ${day.content.story.text}`,
    );
    speech.rate = 0.88;
    window.speechSynthesis.speak(speech);
    setReadStatus("Pip is reading today’s page aloud.");
  };
  const showOld = (item: { date: string; day: SavedDay }) => {
    setDay(item.day);
    setTeared(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const displayingToday =
    day && !(archive ?? []).some((item) => item.day === day);
  const topicsLearned = Array.from(
    new Set([
      ...(day ? [day.content.topic] : []),
      ...(archive ?? []).map((item) => item.day.content.topic),
    ]),
  );
  const daysLearned = (archive ?? []).length + (day ? 1 : 0);
  const challengesDone =
    (archive ?? []).filter((item) => item.day.challengeDone).length +
    (day?.challengeDone ? 1 : 0);

  if (!mounted || !today) {
    return (
      <main className="desk" aria-busy="true">
        <div className="paper-grain" aria-hidden="true" />
        <section
          className="calendar-placeholder"
          aria-label="Preparing your calendar page"
        >
          <span className="placeholder-kicker">THE LITTLE DAILY ALMANAC</span>
          <div className="placeholder-date" aria-hidden="true" />
          <div className="placeholder-line" aria-hidden="true" />
          <span>Getting today’s page ready…</span>
        </section>
      </main>
    );
  }

  return (
    <main className="desk">
      <div className="paper-grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-ribbon">
          <span className="brand-sun">✳</span>
          <div>
            <p>THE LITTLE DAILY ALMANAC</p>
            <h1>
              Daily <i>Delight</i>
            </h1>
          </div>
          <span className="brand-sun">✳</span>
        </div>
        <div className="marquee" aria-label="Daily encouragement">
          <div>
            Today you’ll learn something lovely&nbsp; • &nbsp;Keep your
            curiosity untied&nbsp; • &nbsp;Small facts, big wonder&nbsp; •
            &nbsp;Turn a page, find a world&nbsp; • &nbsp;
          </div>
        </div>
        <div
          className="streak-stamp"
          aria-label={`${streak ?? 1} day learning streak`}
        >
          <span className="flame">♨</span>
          <b>{streak}</b>
          <small>DAY STREAK</small>
        </div>
      </header>

      <section className="top-composition">
        <div className={`calendar-sheet ${teared ? "is-torn" : ""}`}>
          <div className="spiral" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <div className="sheet-header">
            <span>
              NO.{" "}
              {String(new Date(`${today}T12:00:00`).getDate()).padStart(2, "0")}
            </span>
            <span>YOUR POCKET ALMANAC</span>
            <span>VOL. 01</span>
          </div>
          <p className="weekday">
            {displayingToday
              ? new Date(`${today}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                })
              : formatDate(today).split(",")[0]}
          </p>
          <div className="date-hero">
            <strong>
              {displayingToday ? new Date(`${today}T12:00:00`).getDate() : "↶"}
            </strong>
            <div>
              <span>
                {displayingToday
                  ? new Date(`${today}T12:00:00`).toLocaleDateString("en-US", {
                      month: "long",
                    })
                  : "A PAGE BACK"}
              </span>
              <em>
                {displayingToday
                  ? new Date(`${today}T12:00:00`).getFullYear()
                  : "FROM THE ARCHIVE"}
              </em>
            </div>
          </div>
          <div className="hand-note">{day ? `Today’s wonder: ${day.content.topic}` : 'A fresh little thing for your curious brain'} <span>↘</span></div>
          <div className="streak-ribbon">
            ✳ DAY #{streak} OF YOUR LEARNING STREAK ✳
          </div>
          <div className="calendar-doodle" aria-hidden="true">
            ✳
          </div>
          <button
            className="tear-button"
            onClick={() => setTeared((value) => !value)}
          >
            {teared ? "Page peeled! Tomorrow is waiting" : "Peel today’s page"}{" "}
            <span>↗</span>
          </button>
          {teared && (
            <div className="tomorrow-note">
              <b>Tomorrow’s page is still tucked away.</b>
              <span>
                Come back when the date turns. Good things take a little time.
              </span>
            </div>
          )}
        </div>
        <div className="desk-note">
          <span className="tape" />
          <p>
            “
            {day?.content.quote?.text ??
              "The world is full of tiny doors. Today we found one."}
            ”
          </p>
          <small>
            —{" "}
            {(
              day?.content.quote?.author ?? "Pip, chief page-turner"
            ).toUpperCase()}
          </small>
        </div>
        <div className="mascot-note">
          <Owl />
          <div className="speech">
            {day?.content.owlSays ?? "Ooh, this one’s a good one!"}
          </div>
        </div>
        <div className="read-knob-wrap">
          <button
            className="radio-knob"
            onClick={readAloud}
            aria-label="Read today's page aloud"
          >
            <span>▶</span>
          </button>
          <small>READ ALOUD</small>
          {readStatus && (
            <span className="sr-only" role="status">
              {readStatus}
            </span>
          )}
        </div>
      </section>

      {loading || !day ? (
        <div className="loading-card">
          <Owl />
          <div>
            <b>Pip is turning the pages…</b>
            <p>Just a moment while the glue dries.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="content-grid">
            <section
              className="fact-card collage-card"
              aria-labelledby="fact-title"
            >
              <div className="card-topline">
                <span>01 / A FACT TO KEEP</span>
                <button
                  className={`heart ${isFavorite("fact") ? "active" : ""}`}
                  onClick={() =>
                    toggleFavorite("fact", "Fact of the day", day.content.fact)
                  }
                  aria-label={
                    isFavorite("fact")
                      ? "Remove fact from favorites"
                      : "Save fact to favorites"
                  }
                >
                  {isFavorite("fact") ? "♥" : "♡"}
                </button>
              </div>
              <span className="topic-stamp">
                {day.content.topic.toUpperCase()}
              </span>
              <h2 id="fact-title">{day.content.fact}</h2>
              <div className="wow-burst" aria-hidden="true">
                WOW!
              </div>
              <span className="tiny-caption">
                A little fact with a rather big hat.
              </span>
            </section>
            <section
              className="paragraph-card collage-card"
              aria-labelledby="paragraph-title"
            >
              <div className="card-topline">
                <span>02 / THE LONGER STORY</span>
                <button
                  className={`heart ${isFavorite("paragraph") ? "active" : ""}`}
                  onClick={() =>
                    toggleFavorite(
                      "paragraph",
                      "A closer look",
                      day.content.paragraph.text,
                    )
                  }
                  aria-label={
                    isFavorite("paragraph")
                      ? "Remove paragraph from favorites"
                      : "Save paragraph to favorites"
                  }
                >
                  {isFavorite("paragraph") ? "♥" : "♡"}
                </button>
              </div>
              <h2 id="paragraph-title">Let’s look a little closer</h2>
              <p className="reading-time">◷ &nbsp;1 MIN READ</p>
              <p className="paragraph-copy">
                {day.content.paragraph.text
                  .split(
                    new RegExp(
                      `(${day.content.paragraph.keyTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                      "i",
                    ),
                  )
                  .map((part, i) =>
                    part.toLowerCase() ===
                    day.content.paragraph.keyTerm.toLowerCase() ? (
                      <mark key={i}>{part}</mark>
                    ) : (
                      part
                    ),
                  )}
              </p>
              <span className="paper-clip" aria-hidden="true">
                ⌁
              </span>
            </section>
            <section
              className="story-card collage-card"
              aria-labelledby="story-title"
            >
              <div className="card-topline">
                <span>03 / A LITTLE TALE</span>
                <button
                  className={`heart ${isFavorite("story") ? "active" : ""}`}
                  onClick={() =>
                    toggleFavorite(
                      "story",
                      day.content.story.title,
                      day.content.story.text,
                    )
                  }
                  aria-label={
                    isFavorite("story")
                      ? "Remove story from favorites"
                      : "Save story to favorites"
                  }
                >
                  {isFavorite("story") ? "♥" : "♡"}
                </button>
              </div>
              <div className="story-kicker">A STORY FOR YOUR POCKET</div>
              <h2 id="story-title">{day.content.story.title}</h2>
              <p className="story-copy">{day.content.story.text}</p>
              <p className="moral">{day.content.story.moral}</p>
              <div className="the-end">
                The end <span>✳</span>
              </div>
            </section>
            <section
              className="quiz-card collage-card"
              aria-labelledby="quiz-title"
            >
              <div className="card-topline">
                <span>04 / THINK ABOUT IT</span>
                <span className="quiz-stamp">PIP’S POP QUIZ</span>
              </div>
              <h2 id="quiz-title">{day.content.quiz.question}</h2>
              <div className="quiz-options">
                {day.content.quiz.options.map((option, index) => (
                  <button
                    key={option}
                    className={`${answer === index ? "picked" : ""} ${answer !== null && index === day.content.quiz.answerIndex ? "correct" : ""} ${answer === index && index !== day.content.quiz.answerIndex ? "wrong" : ""}`}
                    onClick={() => setAnswer(index)}
                    disabled={answer !== null}
                  >
                    {String.fromCharCode(65 + index)}. &nbsp;{option}
                  </button>
                ))}
              </div>
              {answer !== null && (
                <p
                  className={`answer-note ${answer === day.content.quiz.answerIndex ? "right" : ""}`}
                  role="status"
                >
                  {answer === day.content.quiz.answerIndex
                    ? "Brilliant! Your brain gets a paper crown."
                    : `Not quite — it’s ${day.content.quiz.options[day.content.quiz.answerIndex]}. Now you know!`}
                </p>
              )}
            </section>
          </div>
          <section className="reaction-strip">
            <div>
              <span className="section-eyebrow">ONE STICKER, PLEASE</span>
              <h2>How did that land?</h2>
            </div>
            <div className="reactions">
              {reactions.map((reaction, index) => (
                <button
                  key={reaction}
                  onClick={() => chooseReaction(reaction)}
                  className={`reaction reaction-${index} ${day.reaction === reaction ? "stuck" : ""}`}
                  aria-pressed={day.reaction === reaction}
                >
                  {reaction}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {day && !loading && (
        <>
          <div className="extras-grid">
            {day.content.word && (
              <section
                className="extra-card word-card"
                aria-labelledby="word-title"
              >
                <span className="extra-kicker">05 / WORD OF THE DAY</span>
                <h2 id="word-title">{day.content.word.word}</h2>
                <p className="word-pos">{day.content.word.partOfSpeech}</p>
                <p>{day.content.word.meaning}</p>
                <p className="word-example">“{day.content.word.example}”</p>
              </section>
            )}
            {day.content.onThisDay && (
              <section
                className="extra-card history-card"
                aria-labelledby="history-title"
              >
                <span className="extra-kicker">06 / ON THIS DAY</span>
                <h2 id="history-title">{day.content.onThisDay.year}</h2>
                <p>{day.content.onThisDay.event}</p>
              </section>
            )}
            {day.content.challenge && (
              <section
                className="extra-card challenge-card"
                aria-labelledby="challenge-title"
              >
                <span className="extra-kicker">07 / TRY THIS TODAY</span>
                <h2 id="challenge-title">A tiny challenge</h2>
                <p>{day.content.challenge}</p>
                {displayingToday && (
                  <button
                    className={`challenge-btn ${day.challengeDone ? "done" : ""}`}
                    onClick={toggleChallenge}
                    aria-pressed={Boolean(day.challengeDone)}
                  >
                    {day.challengeDone
                      ? "Done! Gold star earned ★"
                      : "I did it"}
                  </button>
                )}
              </section>
            )}
          </div>
          <section className="log-section">
            <SectionTitle kicker="YOUR LEARNING LOG">
              What you’ve collected so far
            </SectionTitle>
            <div className="log-stats">
              <div className="log-stat">
                <b>{daysLearned}</b>
                <span>pages read</span>
              </div>
              <div className="log-stat">
                <b>{streak}</b>
                <span>day streak</span>
              </div>
              <div className="log-stat">
                <b>{(favorite ?? []).length}</b>
                <span>things pinned</span>
              </div>
              <div className="log-stat">
                <b>{challengesDone}</b>
                <span>challenges done</span>
              </div>
            </div>
            <div className="log-topics">
              {topicsLearned.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="topics-section">
        <SectionTitle kicker="YOUR CURIOSITY COMPASS">
          Pick a few favorite topics
        </SectionTitle>
        <p className="section-blurb">
          We’ll nudge future pages toward your kind of wonder.
        </p>
        <div className="topic-pins">
          {topics.map((topic, i) => (
            <button
              key={topic}
              className={`pin pin-${i % 6} ${(selectedTopics ?? []).includes(topic) ? "selected" : ""}`}
              aria-pressed={(selectedTopics ?? []).includes(topic)}
              onClick={() => chooseTopic(topic)}
            >
              {topic}
              {(selectedTopics ?? []).includes(topic) && (
                <span aria-hidden="true"> ✓</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="scrapbook-section">
        <div className="section-heading-row">
          <SectionTitle kicker="THE SCRAPBOOK WALL">
            Little things worth keeping
          </SectionTitle>
          <span className="counter-stamp">
            {(favorite ?? []).length} PINNED
          </span>
        </div>
        {(favorite ?? []).length ? (
          <div className="scrapbook-wall">
            {(favorite ?? []).map((item, i) => (
              <article
                className={`saved-note saved-${i % 4} ${openPin === item.id ? "open" : ""}`}
                key={item.id}
              >
                <span className="pin-dot" />
                <span className="saved-kind">
                  {item.kind} · {item.date}
                </span>
                <h3>{item.title}</h3>
                <p className={openPin === item.id ? "saved-full" : ""}>
                  {openPin === item.id || item.text.length <= 156
                    ? item.text
                    : `${item.text.slice(0, 156)}…`}
                </p>
                {item.text.length > 156 && (
                  <button
                    className="pin-toggle"
                    onClick={() =>
                      setOpenPin(openPin === item.id ? null : item.id)
                    }
                    aria-expanded={openPin === item.id}
                  >
                    {openPin === item.id
                      ? "Show less ↑"
                      : "Read the whole thing ↓"}
                  </button>
                )}
                <button
                  onClick={() => {
                    const next = (favorite ?? []).filter(
                      (saved) => saved.id !== item.id,
                    );
                    setFavorite(next);
                    writeFavorites(next);
                  }}
                  aria-label={`Remove ${item.title} from scrapbook`}
                >
                  Remove pin ×
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-scrap">
            Nothing pinned yet. Go find something wonderful, then tap its little
            heart.
          </div>
        )}
      </section>

      <section className="archive-section">
        <div className="section-heading-row">
          <SectionTitle kicker="PAGES FROM THE PAST">
            Flip through old pages
          </SectionTitle>
          <span className="archive-scribble">
            Every day leaves a little paper trail ↘
          </span>
        </div>
        {(archive ?? []).length ? (
          <div className="archive-stack">
            {(archive ?? []).slice(0, 14).map((item, i) => (
              <button
                key={item.date}
                className={`archive-page archive-${i % 5}`}
                onClick={() => showOld(item)}
              >
                <span>
                  {new Date(`${item.date}T12:00:00`)
                    .toLocaleDateString("en-US", { month: "short" })
                    .toUpperCase()}
                </span>
                <b>{new Date(`${item.date}T12:00:00`).getDate()}</b>
                <small>{item.day.content.topic}</small>
                <em>{item.day.content.fact}</em>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-scrap archive-empty">
            Your first old page will appear here tomorrow. Today gets to be the
            beginning.
          </div>
        )}
      </section>

      <footer className="colophon">
        <span>✳</span>
        <p>Made with paper, glue and curiosity.</p>
        <small>DAILY DELIGHT · A LITTLE ALMANAC FOR THE VERY CURIOUS</small>
        <span>✳</span>
      </footer>
    </main>
  );
}
