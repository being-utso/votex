import { useCallback, useEffect, useMemo, useState } from "react";
import { listenToDesigns } from "../services/designService";

export function useDesigns(roundNumber) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshDesigns = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = listenToDesigns(
      roundNumber,
      (data) => {
        setDesigns(data);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message ?? "Failed to load designs.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roundNumber, refreshToken]);

  const byId = useMemo(
    () =>
      designs.reduce((map, design) => {
        map[design.id] = design;
        return map;
      }, {}),
    [designs]
  );

  return { designs, byId, loading, error, refreshDesigns };
}
