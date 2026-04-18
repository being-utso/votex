const parseList = (value) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

export const FALLBACK_ADMIN_EMAILS = parseList(import.meta.env.VITE_ADMIN_EMAILS);

export const COLLECTIONS = {
  USERS: "users",
  DESIGNS: "designs",
  VOTES: "votes",
  VOTE_TOTALS: "voteTotals",
  COMMENTS: "comments",
  SETTINGS: "settings"
};

export const SETTINGS_DOC_ID = "global";

export const DEFAULT_SETTINGS = {
  currentRound: 1,
  maxVotes: 3,
  maxVotesPerUser: 3,
  votingOpen: false,
  showResults: false,
  resultsPublished: false,
  adminEmails: FALLBACK_ADMIN_EMAILS
};

export const MAX_COMMENT_LENGTH = 500;
