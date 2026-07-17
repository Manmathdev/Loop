export type Rating = "again" | "hard" | "good" | "easy";

export interface ReelWithCounts {
  id: number;
  url: string;
  platform: string | null;
  videoId: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  status: string;
  title: string | null;
  summary: string | null;
  keyPoints: string[] | null;
  tags: string[] | null;
  errorMessage: string | null;
  createdAt: Date;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
}

export interface ReviewQueueCard {
  cardId: number;
  front: string;
  back: string;
  reelId: number;
  reelTitle: string | null;
  platform: string | null;
  ease: number;
  repetitions: number;
  intervalDays: number;
}

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];
