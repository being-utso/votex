import { useEffect, useState } from "react";
import { listenToUsers } from "../services/userService";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshUsers = () => {
    setRefreshToken((token) => token + 1);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = listenToUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message ?? "Failed to load users.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [refreshToken]);

  return { users, loading, error, refreshUsers };
}

