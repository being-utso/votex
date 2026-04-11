export const normalizeEmails = (emails = []) =>
  emails.map((email) => email?.trim().toLowerCase()).filter(Boolean);

export const getUserDocIdFromEmail = (email, fallback = "") =>
  email?.trim().toLowerCase() || fallback;

export const getRoundKey = (roundNumber) => `round_${Number(roundNumber) || 1}`;

export const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return "Just now";
  }

  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};
