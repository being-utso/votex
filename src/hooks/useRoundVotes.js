import { useEffect, useMemo, useState } from "react";
import { listenToRoundVotes } from "../services/voteService";

export function useRoundVotes(roundNumber, enabled = true) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !roundNumber) {
      setVotes([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToRoundVotes(
      roundNumber,
      (data) => {
        setVotes(data);
        setLoading(false);
      },
      (voteError) => {
        setError(voteError.message ?? "Failed to load votes.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roundNumber, enabled]);

  const countByDesignId = useMemo(
    () =>
      votes.reduce((map, vote) => {
        const designId = vote?.designId;
        const voteRound = Number(vote?.round);
        const isSubmitted = vote?.isSubmitted === true;

        if (!designId || !isSubmitted || voteRound !== Number(roundNumber)) {
          return map;
        }

        map[designId] = (map[designId] || 0) + 1;
        return map;
      }, {}),
    [votes, roundNumber]
  );

  return { votes, countByDesignId, loading, error };
}
