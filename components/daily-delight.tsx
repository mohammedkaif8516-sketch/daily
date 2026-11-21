"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
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
import {
  BADGES,
  XP,
  earnedBadgeIds,
  emptyGame,
  levelInfo,
  readGame,
  writeGame,
} from "@/lib/game";
import type { ActionId, DayGame, GameState } from "@/lib/game";

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
const atNoon = (value: string) => new Date(`${value}T12:00:00`);

type ArchiveItem = { date: string; day: SavedDay };
type Direction = "older" | "newer";
type Toast = {
  id: number;
  kind: "badge" | "level" | "quest";
  title: string;
  text: string;
};

/* ------------------------------------------------------------------ */
/* Pip the cat. Every moving part is its own group so CSS can animate  */
/* blinking, ear twitches, tail swishes, paw licking and purring.      */
/* ------------------------------------------------------------------ */
function Cat({
  purring = false,
  onPet,
}: {
  purring?: boolean;
  onPet?: () => void;
}) {
  const interactive = Boolean(onPet);
  return (
    <svg
      className={`owl cat-svg ${purring ? "is-purring" : ""} ${interactive ? "is-pettable" : ""}`}
      viewBox="0 0 110 110"
      role={interactive ? "button" : "img"}
      aria-label={interactive ? "Pet Pip the cat" : "Pip the curious cat"}
      tabIndex={interactive ? 0 : undefined}
      onClick={onPet}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPet?.();
              }
            }
          : undefined
      }
    >
      <g className="cat-all">
        <g className="cat-tail">
          <path d="M84 94C104 96 102 62 90 60" fill="none" stroke="#2B1B17" strokeWidth="15" strokeLinecap="round" />
          <path d="M84 94C104 96 102 62 90 60" fill="none" stroke="#F6B91E" strokeWidth="7" strokeLinecap="round" />
        </g>
        <ellipse cx="55" cy="88" rx="30" ry="19" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" />
        <ellipse cx="55" cy="92" rx="15" ry="12" fill="#FFF4DC" />
        <ellipse cx="42" cy="101" rx="9" ry="6" fill="#FFF4DC" stroke="#2B1B17" strokeWidth="3" />

        <g className="cat-head">
          <g className="cat-ear cat-ear-l">
            <path d="M22 42 19 9l27 14Z" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" strokeLinejoin="round" />
            <path d="M26 30 25 17l12 7Z" fill="#FF8FB1" />
          </g>
          <g className="cat-ear cat-ear-r">
            <path d="M88 42l3-33-27 14Z" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" strokeLinejoin="round" />
            <path d="M84 30l1-13-12 7Z" fill="#FF8FB1" />
          </g>
          <ellipse cx="55" cy="52" rx="38" ry="29" fill="#F6B91E" stroke="#2B1B17" strokeWidth="4" />
          <path d="M55 24v9M45 26l2 8M65 26l-2 8" stroke="#E8452C" strokeWidth="3.5" strokeLinecap="round" />

          <g className="cat-eyes-lick">
            <g className="cat-look">
              <g className="cat-eyes">
                <ellipse cx="39" cy="52" rx="6.5" ry="8" fill="#2B1B17" />
                <ellipse cx="71" cy="52" rx="6.5" ry="8" fill="#2B1B17" />
                <circle cx="41.5" cy="49" r="2.6" fill="#FFF4DC" />
                <circle cx="73.5" cy="49" r="2.6" fill="#FFF4DC" />
              </g>
            </g>
          </g>
          <g className="cat-happy-eyes">
            <path d="M32 53q7-9 14 0M64 53q7-9 14 0" fill="none" stroke="#2B1B17" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          <circle cx="27" cy="63" r="6" fill="#FF8FB1" opacity=".75" />
          <circle cx="83" cy="63" r="6" fill="#FF8FB1" opacity=".75" />
          <path d="M51 60h8l-4 5Z" fill="#FF8FB1" stroke="#2B1B17" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M55 65q-4 6-9 3M55 65q4 6 9 3" fill="none" stroke="#2B1B17" strokeWidth="3" strokeLinecap="round" />
          <path className="cat-tongue" d="M47 68q-1 8 4 8t3-8z" fill="#FF6F91" stroke="#2B1B17" strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 59 8 56M24 66 9 70M86 59l16-3M86 66l15 4" stroke="#2B1B17" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        <g className="cat-paw-r">
          <rect className="cat-leg" x="60" y="88" width="16" height="22" rx="8" fill="#F6B91E" stroke="#2B1B17" strokeWidth="3" />
          <ellipse cx="68" cy="101" rx="9" ry="6" fill="#FFF4DC" stroke="#2B1B17" strokeWidth="3" />
        </g>
      </g>

      <g className="cat-hearts" aria-hidden="true">
        <g transform="translate(28 14)">
          <path className="cat-heart" d="M0 4C-7-2-6-8-2.5-8 -1-8 0-7 0-6 0-7 1-8 2.5-8 6-8 7-2 0 4Z" fill="#E8452C" stroke="#2B1B17" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
        <g transform="translate(55 4)">
          <path className="cat-heart" d="M0 4C-7-2-6-8-2.5-8 -1-8 0-7 0-6 0-7 1-8 2.5-8 6-8 7-2 0 4Z" fill="#FF8FB1" stroke="#2B1B17" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
        <g transform="translate(82 14)">
          <path className="cat-heart" d="M0 4C-7-2-6-8-2.5-8 -1-8 0-7 0-6 0-7 1-8 2.5-8 6-8 7-2 0 4Z" fill="#E8452C" stroke="#2B1B17" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
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

// One shared request per date, so React Strict Mode's double effect in dev
// does not send two calls to the API.
const inflight = new Map<string, Promise<DailyContent>>();

export default function DailyDelight() {
  const [today, setToday] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [todayDay, setTodayDay] = useState<SavedDay | null>(null);
  const [viewing, setViewing] = useState<string | null>(null); // null = today
  const [direction, setDirection] = useState<Direction>("older");
  const [streak, setStreak] = useState<number | null>(null);
  const [favorite, setFavorite] = useState<ReturnType<
    typeof readFavorites
  > | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [teared, setTeared] = useState(false);
  const [archive, setArchive] = useState<ArchiveItem[] | null>(null);
  const [readStatus, setReadStatus] = useState("");
  const [openPin, setOpenPin] = useState<string | null>(null);
  const [purring, setPurring] = useState(false);
  const [catLine, setCatLine] = useState<string | null>(null);
  const [game, setGameState] = useState<GameState>(emptyGame);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const gameRef = useRef<GameState>(emptyGame());
  const toastId = useRef(0);
  const railRef = useRef<HTMLDivElement>(null);
  const purrTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  /* ---------- which page is on screen ---------- */
  const viewDate = viewing ?? today;
  const archivedDay = viewing
    ? ((archive ?? []).find((item) => item.date === viewing)?.day ?? null)
    : null;
  const day = archivedDay ?? todayDay;
  const isToday = !viewing || !archivedDay;
  const pageDates = today
    ? [today, ...(archive ?? []).map((item) => item.date)]
    : [];
  const rawIndex = viewDate ? pageDates.indexOf(viewDate) : 0;
  const pageIndex = rawIndex < 0 ? 0 : rawIndex;
  const hasOlder = pageIndex < pageDates.length - 1;
  const hasNewer = pageIndex > 0;
  const viewGame: DayGame = (viewDate && game.days[viewDate]) || {};
  const answer = viewGame.answer ?? null;

  const goTo = (date: string, dir: Direction) => {
    setDirection(dir);
    setViewing(date === today ? null : date);
    setTeared(false);
    setOpenPin(null);
  };
  const goOlder = () => {
    if (hasOlder) goTo(pageDates[pageIndex + 1], "older");
  };
  const goNewer = () => {
    if (hasNewer) goTo(pageDates[pageIndex - 1], "newer");
  };
  const goToday = () => {
    if (today) goTo(today, "newer");
  };

  /* ---------- first load ---------- */
  useEffect(() => {
    const localToday = dateKey(new Date());
    setToday(localToday);

    const prefs = readPrefs();
    setSelectedTopics(prefs.topics);
    const last = prefs.lastVisit;
    const previous = atNoon(last || localToday);
    const current = atNoon(localToday);
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
    const savedGame = readGame();
    gameRef.current = savedGame;
    setGameState(savedGame);
    const saved = readDay(localToday);
    const days: ArchiveItem[] = [];
    for (let offset = 1; offset <= 30; offset++) {
      const date = atNoon(localToday);
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const old = readDay(key);
      if (old) days.push({ date: key, day: old });
    }
    setArchive(days);
    setMounted(true);
    if (saved) {
      setTodayDay(saved);
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
        setTodayDay(result);
      })
      .catch(() => {
        // Show a fallback page, but do not save it, so a reload tries again.
        const content = fallback[
          (atNoon(localToday).getDate() - 1) % fallback.length
        ] as DailyContent;
        setTodayDay({ content });
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---------- keyboard: left = older page, right = newer page ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") goOlder();
      else if (e.key === "ArrowRight") goNewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- keep the current page centred in the rail ---------- */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const el = rail.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el) return;
    rail.scrollTo({
      left: el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2,
      behavior: "smooth",
    });
  }, [viewDate, mounted]);

  useEffect(
    () => () => {
      if (purrTimer.current) window.clearTimeout(purrTimer.current);
    },
    [],
  );

  /* ---------- actions ---------- */
  const updateDay = (date: string, patch: Partial<SavedDay>) => {
    if (!today) return;
    if (date === today) {
      if (!todayDay) return;
      const next = { ...todayDay, ...patch };
      setTodayDay(next);
      writeDay(date, next);
      return;
    }
    const found = (archive ?? []).find((item) => item.date === date);
    if (!found) return;
    const next = { ...found.day, ...patch };
    setArchive(
      (archive ?? []).map((item) =>
        item.date === date ? { date, day: next } : item,
      ),
    );
    writeDay(date, next);
  };

  const toggleFavorite = (kind: string, title: string, text: string) => {
    if (!viewDate) return;
    const id = `${viewDate}:${kind}`;
    const savedFavorites = favorite ?? [];
    const exists = savedFavorites.some((item) => item.id === id);
    const next = exists
      ? savedFavorites.filter((item) => item.id !== id)
      : [...savedFavorites, { id, date: viewDate, kind, title, text }];
    setFavorite(next);
    writeFavorites(next);
  };
  const isFavorite = (kind: string) =>
    Boolean(
      viewDate &&
        (favorite ?? []).some((item) => item.id === `${viewDate}:${kind}`),
    );
  const chooseReaction = (reaction: string) => {
    if (!viewDate || !day) return;
    updateDay(viewDate, { reaction });
    awardXp(viewDate, "react", XP.react);
  };
  const toggleChallenge = () => {
    if (!viewDate || !day || !isToday) return;
    updateDay(viewDate, { challengeDone: !day.challengeDone });
    if (!day.challengeDone) awardXp(viewDate, "challenge", XP.challenge);
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
    setReadStatus("Pip is reading this page aloud.");
  };
  const celebrate = (line?: string) => {
    setCatLine(line ?? null);
    setPurring(true);
    if (purrTimer.current) window.clearTimeout(purrTimer.current);
    purrTimer.current = window.setTimeout(() => {
      setPurring(false);
      setCatLine(null);
    }, 3200);
  };
  const petCat = () => celebrate("Purrrr… right behind the ears!");

  /* ---------- the game ---------- */
  const pushToast = (toast: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((queue) => [...queue, { ...toast, id }]);
  };
  // gameRef always holds the latest state, so two awards in one tick never clash.
  const commitGame = (next: GameState) => {
    gameRef.current = next;
    setGameState(next);
    writeGame(next);
  };
  const awardXp = (date: string, action: ActionId, amount: number) => {
    const g = gameRef.current;
    const dayGame: DayGame = g.days[date] ?? {};
    if (dayGame[action]) return; // each action pays out once per date
    const before = levelInfo(g.xp).level;
    const next: GameState = {
      ...g,
      xp: g.xp + amount,
      days: { ...g.days, [date]: { ...dayGame, [action]: true } },
    };
    commitGame(next);

    const after = levelInfo(next.xp);
    if (after.level > before) {
      pushToast({
        kind: "level",
        title: `Level ${after.level}: ${after.title}`,
        text: "You levelled up. Keep turning pages!",
      });
      celebrate("Level up! Look at you go!");
    }

    // Finishing the whole daily quest pays a bonus.
    if (date === today && action !== "bonus") {
      const d = next.days[date];
      const needsChallenge = Boolean(todayDay?.content.challenge);
      if (d.visit && d.quiz && (!needsChallenge || d.challenge) && !d.bonus) {
        pushToast({
          kind: "quest",
          title: "Quest complete!",
          text: `Bonus +${XP.bonus} XP. What a day.`,
        });
        celebrate("Quest complete! Treats for everyone!");
        awardXp(date, "bonus", XP.bonus);
      }
    }
  };
  const answerQuiz = (index: number) => {
    if (!viewDate || !day || answer !== null) return;
    const right = index === day.content.quiz.answerIndex;
    const g = gameRef.current;
    const dayGame: DayGame = g.days[viewDate] ?? {};
    commitGame({
      ...g,
      days: { ...g.days, [viewDate]: { ...dayGame, answer: index, right } },
    });
    awardXp(viewDate, "quiz", right ? XP.quizRight : XP.quizTry);
    if (right) celebrate("Purrfect answer!");
  };
  const jumpTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  const scrollRail = (dir: 1 | -1) => {
    railRef.current?.scrollBy({
      left: dir * (railRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) goOlder();
    else goNewer();
  };

  /* ---------- derived stats ---------- */
  const topicsLearned = Array.from(
    new Set([
      ...(todayDay ? [todayDay.content.topic] : []),
      ...(archive ?? []).map((item) => item.day.content.topic),
    ]),
  );
  const daysLearned = (archive ?? []).length + (todayDay ? 1 : 0);
  const challengesDone =
    (archive ?? []).filter((item) => item.day.challengeDone).length +
    (todayDay?.challengeDone ? 1 : 0);

  const lvl = levelInfo(game.xp);
  const questDay: DayGame = (today && game.days[today]) || {};
  const questHasChallenge = Boolean(todayDay?.content.challenge);
  const earnedCount = BADGES.filter((badge) => game.badges[badge.id]).length;

  // Reading today's page pays out once per day.
  useEffect(() => {
    if (today && todayDay) awardXp(today, "visit", XP.visit);
  }, [today, todayDay]);

  // Unlock stickers. If several unlock at once, they share one toast.
  useEffect(() => {
    if (!mounted || !today) return;
    const g = gameRef.current;
    const earned = earnedBadgeIds(g, {
      streak: streak ?? 0,
      pins: (favorite ?? []).length,
      topics: topicsLearned.length,
      challenges: challengesDone,
    });
    const fresh = earned.filter((id) => !g.badges[id]);
    if (!fresh.length) return;
    const badges = { ...g.badges };
    fresh.forEach((id) => (badges[id] = today));
    commitGame({ ...g, badges });
    const names = fresh
      .map((id) => BADGES.find((b) => b.id === id)?.title)
      .filter(Boolean);
    pushToast(
      fresh.length === 1
        ? {
            kind: "badge",
            title: `New sticker: ${names[0]}`,
            text: BADGES.find((b) => b.id === fresh[0])?.hint ?? "",
          }
        : {
            kind: "badge",
            title: `${fresh.length} new stickers!`,
            text: `${names.join(", ")}. See them in your sticker book.`,
          },
    );
    celebrate("A new sticker! I knew you could!");
  }, [mounted, game, streak, favorite, todayDay, archive]);

  // Show one toast at a time.
  const headToastId = toasts[0]?.id;
  useEffect(() => {
    if (headToastId === undefined) return;
    const timer = window.setTimeout(
      () => setToasts((queue) => queue.filter((t) => t.id !== headToastId)),
      4200,
    );
    return () => window.clearTimeout(timer);
  }, [headToastId]);

  if (!mounted || !today || !viewDate) {
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

  const viewObj = atNoon(viewDate);
  const railItems: ArchiveItem[] = [
    ...(todayDay ? [{ date: today, day: todayDay }] : []),
    ...(archive ?? []),
  ];

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
        <div
          className={`calendar-sheet ${teared ? "is-torn" : ""}`}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="spiral" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <div className="sheet-header">
            <span>NO. {String(viewObj.getDate()).padStart(2, "0")}</span>
            <span>YOUR POCKET ALMANAC</span>
            <span>VOL. 01</span>
          </div>
          <p className="weekday">
            {viewObj.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <div className="date-hero" key={viewDate}>
            <strong>{viewObj.getDate()}</strong>
            <div>
              <span>
                {viewObj.toLocaleDateString("en-US", { month: "long" })}
              </span>
              <em>{viewObj.getFullYear()}</em>
            </div>
          </div>
          <div className="hand-note">
            {day
              ? `${isToday ? "Today’s" : "That day’s"} wonder: ${day.content.topic}`
              : "A fresh little thing for your curious brain"}{" "}
            <span>↘</span>
          </div>
          <div className="streak-ribbon">
            {isToday
              ? `✳ DAY #${streak} OF YOUR LEARNING STREAK ✳`
              : "✳ A PAGE FROM THE PAST ✳"}
          </div>
          <div className="calendar-doodle" aria-hidden="true">
            ✳
          </div>
          {isToday ? (
            <button
              className="tear-button"
              onClick={() => setTeared((value) => !value)}
            >
              {teared
                ? "Page peeled! Tomorrow is waiting"
                : "Peel today’s page"}{" "}
              <span>↗</span>
            </button>
          ) : (
            <button className="tear-button" onClick={goToday}>
              Back to today <span>↗</span>
            </button>
          )}
          {teared && isToday && (
            <div className="tomorrow-note">
              <b>Tomorrow’s page is still tucked away.</b>
              <span>
                Come back when the date turns. Good things take a little time.
              </span>
            </div>
          )}

          <nav className="page-nav" aria-label="Browse pages">
            <button
              onClick={goOlder}
              disabled={!hasOlder}
              aria-label="Older page"
            >
              ‹ Older
            </button>
            <span className="page-count">
              PAGE {pageIndex + 1} / {Math.max(pageDates.length, 1)}
            </span>
            <button
              onClick={goNewer}
              disabled={!hasNewer}
              aria-label="Newer page"
            >
              Newer ›
            </button>
            {!isToday && (
              <button className="today-btn" onClick={goToday}>
                Today
              </button>
            )}
          </nav>
          <p className="page-hint">Swipe the page, or use ← → keys</p>
          <span className="sr-only" role="status">
            Showing the page for{" "}
            {viewObj.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
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
          <Cat purring={purring} onPet={petCat} />
          <div className="speech">
            {purring
              ? (catLine ?? "Purrrr…")
              : (day?.content.owlSays ?? "Ooh, this one’s a good one!")}
          </div>
        </div>
        <div className="read-knob-wrap">
          <button
            className="radio-knob"
            onClick={readAloud}
            aria-label="Read this page aloud"
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

      <section className="game-hud" aria-label="Your progress">
        <div className="level-card">
          <div className="level-badge" aria-hidden="true">
            {lvl.level}
          </div>
          <div className="level-meta">
            <span className="level-kicker">LEVEL {lvl.level}</span>
            <b className="level-title">{lvl.title}</b>
            <div
              className="xp-bar"
              role="progressbar"
              aria-label="Progress to the next level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={lvl.pct}
            >
              <span style={{ width: `${lvl.pct}%` }} />
            </div>
            <small className="xp-text">
              {lvl.maxed
                ? `${game.xp} XP · top level reached`
                : `${lvl.toNext} XP to ${lvl.nextTitle}`}
            </small>
          </div>
        </div>
        {isToday && day && !loading && (
          <div className="quest-card">
            <span className="quest-kicker">TODAY’S TINY QUEST</span>
            <ul className="quest-list">
              <li>
                <span
                  className={`quest-item ${questDay.visit ? "done" : ""}`}
                >
                  <span className="quest-box" aria-hidden="true">
                    {questDay.visit ? "✓" : ""}
                  </span>
                  <span className="quest-text">Read today’s page</span>
                  <i className="quest-xp">+{XP.visit}</i>
                </span>
              </li>
              <li>
                <button
                  className={`quest-item ${questDay.quiz ? "done" : ""}`}
                  onClick={() => jumpTo("quiz-title")}
                >
                  <span className="quest-box" aria-hidden="true">
                    {questDay.quiz ? "✓" : ""}
                  </span>
                  <span className="quest-text">Answer Pip’s quiz</span>
                  <i className="quest-xp">+{XP.quizRight}</i>
                </button>
              </li>
              {questHasChallenge && (
                <li>
                  <button
                    className={`quest-item ${questDay.challenge ? "done" : ""}`}
                    onClick={() => jumpTo("challenge-title")}
                  >
                    <span className="quest-box" aria-hidden="true">
                      {questDay.challenge ? "✓" : ""}
                    </span>
                    <span className="quest-text">Try the tiny challenge</span>
                    <i className="quest-xp">+{XP.challenge}</i>
                  </button>
                </li>
              )}
            </ul>
            <p className={`quest-note ${questDay.bonus ? "complete" : ""}`}>
              {questDay.bonus
                ? `Quest complete! Bonus +${XP.bonus} XP earned ★`
                : `Finish them all for a +${XP.bonus} XP bonus`}
            </p>
          </div>
        )}
      </section>

      {loading || !day ? (
        <div className="loading-card">
          <Cat />
          <div>
            <b>Pip is turning the pages…</b>
            <p>Just a moment while the glue dries.</p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`content-grid turn-${direction}`}
            key={`grid-${viewDate}`}
          >
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
                    onClick={() => answerQuiz(index)}
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
                    ? `Brilliant! Your brain gets a paper crown. +${XP.quizRight} XP`
                    : `Not quite — it’s ${day.content.quiz.options[day.content.quiz.answerIndex]}. Now you know! +${XP.quizTry} XP for trying`}
                </p>
              )}
            </section>
          </div>
          <section
            className={`reaction-strip turn-${direction}`}
            key={`react-${viewDate}`}
          >
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

          <div
            className={`extras-grid turn-${direction}`}
            key={`extras-${viewDate}`}
          >
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
                {isToday ? (
                  <button
                    className={`challenge-btn ${day.challengeDone ? "done" : ""}`}
                    onClick={toggleChallenge}
                    aria-pressed={Boolean(day.challengeDone)}
                  >
                    {day.challengeDone
                      ? "Done! Gold star earned ★"
                      : `I did it (+${XP.challenge} XP)`}
                  </button>
                ) : (
                  day.challengeDone && <p className="word-pos">Done ★</p>
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
            <div className="sticker-book">
              <div className="sticker-head">
                <b>Sticker book</b>
                <span>
                  {earnedCount} / {BADGES.length}
                </span>
              </div>
              <div className="sticker-grid">
                {BADGES.map((badge) => {
                  const earnedOn = game.badges[badge.id];
                  return (
                    <div
                      key={badge.id}
                      className={`sticker ${earnedOn ? "earned" : "locked"}`}
                      style={{ "--sticker": badge.color } as React.CSSProperties}
                    >
                      <span className="sticker-glyph" aria-hidden="true">
                        {earnedOn ? badge.glyph : "?"}
                      </span>
                      <b>{earnedOn ? badge.title : "Locked"}</b>
                      <small>
                        {earnedOn
                          ? `Earned ${atNoon(earnedOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : badge.hint}
                      </small>
                    </div>
                  );
                })}
              </div>
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
          <div className="rail-controls">
            <button onClick={() => scrollRail(-1)} aria-label="Scroll pages left">
              ←
            </button>
            <button onClick={() => scrollRail(1)} aria-label="Scroll pages right">
              →
            </button>
          </div>
        </div>
        {(archive ?? []).length ? (
          <div className="archive-rail" ref={railRef}>
            {railItems.map((item) => {
              const d = atNoon(item.date);
              const current = item.date === viewDate;
              return (
                <button
                  key={item.date}
                  className="rail-card"
                  aria-current={current ? "true" : undefined}
                  aria-label={`Open the page for ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
                  onClick={() => {
                    goTo(item.date, item.date < viewDate ? "older" : "newer");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span className="rail-month">
                    {item.date === today
                      ? "TODAY"
                      : d
                          .toLocaleDateString("en-US", { month: "short" })
                          .toUpperCase()}
                  </span>
                  <b className="rail-day">{d.getDate()}</b>
                  <small className="rail-topic">{item.day.content.topic}</small>
                  <em className="rail-fact">{item.day.content.fact}</em>
                </button>
              );
            })}
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

      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts[0] && (
          <button
            key={toasts[0].id}
            className={`toast toast-${toasts[0].kind}`}
            onClick={() => setToasts((queue) => queue.slice(1))}
          >
            <span className="toast-star" aria-hidden="true">
              ★
            </span>
            <span>
              <b>{toasts[0].title}</b>
              <small>{toasts[0].text}</small>
            </span>
          </button>
        )}
      </div>
    </main>
  );
}