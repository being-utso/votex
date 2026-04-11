import { useEffect, useMemo, useState } from "react";
import { listenToRoundVoteTotals } from "../services/voteService";

export function useRoundVoteTotals(roundNumber, enabled = true) {
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !roundNumber) {
      setTotals([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToRoundVoteTotals(
      roundNumber,
      (data) => {
        setTotals(data);
        setLoading(false);
      },
      (totalsError) => {
        setError(totalsError.message ?? "Failed to load vote totals.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roundNumber, enabled]);

  const countByDesignId = useMemo(
    () =>
      totals.reduce((map, totalDoc) => {
        const designId = totalDoc?.designId;
        const totalVotes = Number(totalDoc?.totalVotes ?? 0);
        if (!designId) {
          return map;
        }

        map[designId] = Number.isFinite(totalVotes) ? totalVotes : 0;
        return map;
      }, {}),
    [totals]
  );

  return { totals, countByDesignId, loading, error };
}
