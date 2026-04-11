import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS, SETTINGS_DOC_ID } from "../lib/constants";
import { getRoundKey, getUserDocIdFromEmail } from "../lib/formatters";

const ADMIN_BATCH_LIMIT = 400;

const clearVoteMetadataForUsers = async (userRefs) => {
  for (let index = 0; index < userRefs.length; index += ADMIN_BATCH_LIMIT) {
    const chunk = userRefs.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((userRef) => {
      batch.set(
        userRef,
        {
          votesUsedByRound: {},
          votedDesignIdsByRound: {},
          submittedRounds: {},
          submittedAtByRound: {},
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
  }
};

const deleteVoteRefsInChunks = async (voteRefs) => {
  for (let index = 0; index < voteRefs.length; index += ADMIN_BATCH_LIMIT) {
    const chunk = voteRefs.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((voteRef) => {
      batch.delete(voteRef);
    });

    await batch.commit();
  }
};

const updateVoteRefsInChunks = async (voteRefs, payload) => {
  for (let index = 0; index < voteRefs.length; index += ADMIN_BATCH_LIMIT) {
    const chunk = voteRefs.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((voteRef) => {
      batch.set(voteRef, payload, { merge: true });
    });

    await batch.commit();
  }
};

export const getVoteDocumentId = (roundKey, userId, designId) =>
  `${roundKey}_${userId}_${designId}`;
const getVoteTotalDocumentId = (roundKey, designId) =>
  `${roundKey}_${designId}`;

export async function toggleVote({
  user,
  designId,
  roundNumber,
  roundKey,
  maxVotesPerUser
}) {
  const userId = user?.uid;
  const userEmail = getUserDocIdFromEmail(user?.email);
  const userDocId = getUserDocIdFromEmail(user?.email, userId);
  const userName = (user?.name || user?.displayName || userEmail || "Anonymous Reviewer").trim();
  if (!userId) {
    throw new Error("You must be signed in to vote.");
  }

  const activeRound = Number(roundNumber) || 1;
  const activeRoundKey = roundKey || getRoundKey(activeRound);
  const voteDocId = getVoteDocumentId(activeRoundKey, userId, designId);

  return runTransaction(db, async (transaction) => {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
    const userRef = doc(db, COLLECTIONS.USERS, userDocId);
    const voteRef = doc(db, COLLECTIONS.VOTES, voteDocId);

    const settingsSnapshot = await transaction.get(settingsRef);
    const userSnapshot = await transaction.get(userRef);
    const voteSnapshot = await transaction.get(voteRef);

    if (!settingsSnapshot.exists()) {
      throw new Error("Voting settings are not configured.");
    }

    const settings = settingsSnapshot.data();
    if (!settings.votingOpen) {
      throw new Error("Voting is currently closed.");
    }

    const settingsRound = Number(settings.currentRound || 1);
    if (settingsRound !== activeRound) {
      throw new Error("Round changed. Refresh and vote again.");
    }

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    if (userData.isApproved !== true) {
      throw new Error("Waiting for approval.");
    }
    const votesUsedByRound = userData.votesUsedByRound ?? {};
    const votedDesignIdsByRound = userData.votedDesignIdsByRound ?? {};
    const submittedRounds = userData.submittedRounds ?? {};
    const currentUsedVotes = Number(votesUsedByRound[activeRoundKey] || 0);
    const voteLimit = Number(settings.maxVotesPerUser ?? maxVotesPerUser ?? 0);
    const votedDesignIds = Array.isArray(votedDesignIdsByRound[activeRoundKey])
      ? votedDesignIdsByRound[activeRoundKey]
      : [];
    const isRoundSubmitted = submittedRounds[activeRoundKey] === true;

    if (isRoundSubmitted) {
      throw new Error("Votes already submitted for this round.");
    }

    const voteExists = voteSnapshot.exists();
    if (voteExists && voteSnapshot.data()?.isSubmitted === true) {
      throw new Error("Submitted votes cannot be changed.");
    }

    if (!voteExists && voteLimit > 0 && currentUsedVotes >= voteLimit) {
      throw new Error("You have used all votes for this round.");
    }

    const nextUsedVotes = voteExists
      ? Math.max(currentUsedVotes - 1, 0)
      : currentUsedVotes + 1;
    const nextVotedDesignIds = voteExists
      ? votedDesignIds.filter((id) => id !== designId)
      : Array.from(new Set([...votedDesignIds, designId]));

    if (voteExists) {
      transaction.delete(voteRef);
    } else {
      transaction.set(voteRef, {
        userId,
        userEmail,
        userName,
        designId,
        round: activeRound,
        isSubmitted: false,
        createdAt: serverTimestamp()
      });
    }

    transaction.set(
      userRef,
      {
        votesUsedByRound: {
          ...votesUsedByRound,
          [activeRoundKey]: nextUsedVotes
        },
        votedDesignIdsByRound: {
          ...votedDesignIdsByRound,
          [activeRoundKey]: nextVotedDesignIds
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      action: voteExists ? "removed" : "added",
      nextUsedVotes,
      nextVotedDesignIds
    };
  });
}

export async function submitVotes({
  user,
  roundNumber,
  roundKey,
  maxVotesPerUser
}) {
  const userId = user?.uid;
  const userEmail = getUserDocIdFromEmail(user?.email);
  const userDocId = getUserDocIdFromEmail(user?.email, userId);
  const userName = (user?.name || user?.displayName || userEmail || "Anonymous Reviewer").trim();
  if (!userId) {
    throw new Error("You must be signed in to submit votes.");
  }

  const activeRound = Number(roundNumber) || 1;
  const activeRoundKey = roundKey || getRoundKey(activeRound);

  const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
  const userRef = doc(db, COLLECTIONS.USERS, userDocId);

  const [settingsSnapshot, userSnapshot] = await Promise.all([
    getDoc(settingsRef),
    getDoc(userRef)
  ]);

  if (!settingsSnapshot.exists()) {
    throw new Error("Voting settings are not configured.");
  }

  const settings = settingsSnapshot.data();
  if (!settings.votingOpen) {
    throw new Error("Voting is currently closed.");
  }

  if (Number(settings.currentRound || 1) !== activeRound) {
    throw new Error("Round changed. Refresh and submit again.");
  }

  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
  if (userData.isApproved !== true) {
    throw new Error("Waiting for approval.");
  }
  const submittedRounds = userData.submittedRounds ?? {};
  if (submittedRounds[activeRoundKey] === true) {
    throw new Error("Votes already submitted for this round.");
  }

  const votesQuery = query(
    collection(db, COLLECTIONS.VOTES),
    where("userId", "==", userId),
    where("round", "==", activeRound)
  );
  const legacyVotesQuery = query(
    collection(db, COLLECTIONS.VOTES),
    where("uid", "==", userId),
    where("roundNumber", "==", activeRound)
  );
  const [votesSnapshot, legacyVotesSnapshot] = await Promise.all([
    getDocs(votesQuery),
    getDocs(legacyVotesQuery)
  ]);
  const voteDocsById = new Map();
  votesSnapshot.docs.forEach((voteDoc) => voteDocsById.set(voteDoc.id, voteDoc));
  legacyVotesSnapshot.docs.forEach((voteDoc) => voteDocsById.set(voteDoc.id, voteDoc));
  const allVoteDocs = Array.from(voteDocsById.values());

  const votedDesignIds = Array.from(
    new Set(
      allVoteDocs
        .map((voteDoc) => voteDoc.data().designId)
        .filter(Boolean)
    )
  );
  const usedVotes = votedDesignIds.length;
  const voteLimit = Number(settings.maxVotesPerUser ?? maxVotesPerUser ?? 0);

  if (voteLimit > 0 && usedVotes > voteLimit) {
    throw new Error("Selected votes exceed the allowed limit.");
  }

  const batch = writeBatch(db);
  allVoteDocs.forEach((voteDoc) => {
    const voteData = voteDoc.data();
    if (voteData.isSubmitted !== true) {
      batch.update(voteDoc.ref, {
        userId,
        userEmail,
        userName,
        round: activeRound,
        isSubmitted: true,
        submittedAt: voteData.submittedAt ?? serverTimestamp()
      });
    }
  });

  const votesUsedByRound = userData.votesUsedByRound ?? {};
  const votedDesignIdsByRound = userData.votedDesignIdsByRound ?? {};
  const submittedAtByRound = userData.submittedAtByRound ?? {};

  batch.set(
    userRef,
    {
      votesUsedByRound: {
        ...votesUsedByRound,
        [activeRoundKey]: usedVotes
      },
      votedDesignIdsByRound: {
        ...votedDesignIdsByRound,
        [activeRoundKey]: votedDesignIds
      },
      submittedRounds: {
        ...submittedRounds,
        [activeRoundKey]: true
      },
      submittedAtByRound: {
        ...submittedAtByRound,
        [activeRoundKey]: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await batch.commit();

  return {
    submittedCount: usedVotes,
    usedVotes,
    votedDesignIds
  };
}

export function listenToRoundVotes(roundNumber, onData, onError) {
  const activeRound = Number(roundNumber) || 0;
  if (!activeRound) {
    onData([]);
    return () => {};
  }

  const votesQuery = query(
    collection(db, COLLECTIONS.VOTES),
    where("round", "==", activeRound),
    where("isSubmitted", "==", true)
  );

  return onSnapshot(
    votesQuery,
    (snapshot) => {
      const votes = snapshot.docs.map((voteDoc) => ({
        id: voteDoc.id,
        ...voteDoc.data()
      }));
      onData(votes);
    },
    (error) => onError?.(error)
  );
}

export function listenToRoundVoteTotals(roundNumber, onData, onError) {
  const activeRound = Number(roundNumber) || 0;
  if (!activeRound) {
    onData([]);
    return () => {};
  }

  const totalsQuery = query(
    collection(db, COLLECTIONS.VOTE_TOTALS),
    where("round", "==", activeRound)
  );

  return onSnapshot(
    totalsQuery,
    (snapshot) => {
      const totals = snapshot.docs.map((totalDoc) => ({
        id: totalDoc.id,
        ...totalDoc.data()
      }));
      onData(totals);
    },
    (error) => onError?.(error)
  );
}

export async function publishRoundVoteTotals(roundNumber) {
  const activeRound = Number(roundNumber) || 0;
  if (!activeRound) {
    throw new Error("Missing round number.");
  }

  const roundKey = getRoundKey(activeRound);

  const [designsSnapshot, votesSnapshot, existingTotalsSnapshot] = await Promise.all([
    getDocs(
      query(
        collection(db, COLLECTIONS.DESIGNS),
        where("roundId", "==", activeRound)
      )
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.VOTES),
        where("round", "==", activeRound),
        where("isSubmitted", "==", true)
      )
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.VOTE_TOTALS),
        where("round", "==", activeRound)
      )
    )
  ]);

  const submittedCountByDesignId = {};
  votesSnapshot.docs.forEach((voteDoc) => {
    const voteData = voteDoc.data();
    const designId = voteData?.designId;
    if (!designId) {
      return;
    }

    submittedCountByDesignId[designId] = (submittedCountByDesignId[designId] || 0) + 1;
  });

  const roundDesignIds = new Set(designsSnapshot.docs.map((designDoc) => designDoc.id));
  Object.keys(submittedCountByDesignId).forEach((designId) => roundDesignIds.add(designId));

  const existingTotalRefsByDesignId = new Map();
  existingTotalsSnapshot.docs.forEach((totalDoc) => {
    const totalData = totalDoc.data();
    const designId = totalData?.designId;
    if (!designId) {
      return;
    }

    existingTotalRefsByDesignId.set(designId, totalDoc.ref);
  });

  const staleTotalRefs = [];
  existingTotalRefsByDesignId.forEach((totalRef, designId) => {
    if (!roundDesignIds.has(designId)) {
      staleTotalRefs.push(totalRef);
    }
  });

  const totalUpserts = Array.from(roundDesignIds).map((designId) => ({
    ref: doc(db, COLLECTIONS.VOTE_TOTALS, getVoteTotalDocumentId(roundKey, designId)),
    payload: {
      round: activeRound,
      roundKey,
      designId,
      totalVotes: submittedCountByDesignId[designId] || 0,
      updatedAt: serverTimestamp()
    }
  }));

  for (let index = 0; index < totalUpserts.length; index += ADMIN_BATCH_LIMIT) {
    const upsertChunk = totalUpserts.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);

    upsertChunk.forEach(({ ref, payload }) => {
      batch.set(ref, payload, { merge: true });
    });

    await batch.commit();
  }

  for (let index = 0; index < staleTotalRefs.length; index += ADMIN_BATCH_LIMIT) {
    const deleteChunk = staleTotalRefs.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);
    deleteChunk.forEach((totalRef) => {
      batch.delete(totalRef);
    });

    await batch.commit();
  }

  return {
    round: activeRound,
    submittedVotes: votesSnapshot.size,
    updatedTotals: totalUpserts.length,
    removedTotals: staleTotalRefs.length
  };
}

export async function resetAllVotes() {
  const [votesSnapshot, usersSnapshot, voteTotalsSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.VOTES)),
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.VOTE_TOTALS))
  ]);

  const voteRefs = votesSnapshot.docs.map((voteDoc) => voteDoc.ref);
  await deleteVoteRefsInChunks(voteRefs);
  const voteTotalRefs = voteTotalsSnapshot.docs.map((totalDoc) => totalDoc.ref);
  await deleteVoteRefsInChunks(voteTotalRefs);

  const userRefs = usersSnapshot.docs.map((userDoc) => userDoc.ref);
  await clearVoteMetadataForUsers(userRefs);

  return {
    deletedVotes: votesSnapshot.size,
    deletedVoteTotals: voteTotalsSnapshot.size,
    clearedUsers: usersSnapshot.size
  };
}

export async function clearVotesForUser(userId) {
  if (!userId) {
    throw new Error("Missing user id.");
  }

  const votesCollection = collection(db, COLLECTIONS.VOTES);
  const [userVotesSnapshot, legacyVotesSnapshot] = await Promise.all([
    getDocs(query(votesCollection, where("userId", "==", userId))),
    getDocs(query(votesCollection, where("uid", "==", userId)))
  ]);

  const voteDocById = new Map();
  userVotesSnapshot.docs.forEach((voteDoc) => {
    voteDocById.set(voteDoc.id, voteDoc);
  });
  legacyVotesSnapshot.docs.forEach((voteDoc) => {
    voteDocById.set(voteDoc.id, voteDoc);
  });

  const voteRefs = Array.from(voteDocById.values()).map((voteDoc) => voteDoc.ref);
  await deleteVoteRefsInChunks(voteRefs);
  await clearVoteMetadataForUsers([doc(db, COLLECTIONS.USERS, userId)]);

  return {
    deletedVotes: voteRefs.length
  };
}

export async function reopenVotingSubmissions() {
  const [votesSnapshot, usersSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.VOTES)),
    getDocs(collection(db, COLLECTIONS.USERS))
  ]);

  const voteRefs = votesSnapshot.docs.map((voteDoc) => voteDoc.ref);
  await updateVoteRefsInChunks(voteRefs, {
    isSubmitted: false,
    updatedAt: serverTimestamp()
  });

  const userRefs = usersSnapshot.docs.map((userDoc) => userDoc.ref);
  for (let index = 0; index < userRefs.length; index += ADMIN_BATCH_LIMIT) {
    const chunk = userRefs.slice(index, index + ADMIN_BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((userRef) => {
      batch.set(
        userRef,
        {
          submittedRounds: {},
          submittedAtByRound: {},
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
  }

  return {
    reopenedVotes: votesSnapshot.size,
    unlockedUsers: usersSnapshot.size
  };
}

export async function fetchDesignVotesForAdmin({ designId, roundNumber }) {
  if (!designId) {
    throw new Error("Missing design id.");
  }

  const activeRound = Number(roundNumber) || 0;
  if (!activeRound) {
    return [];
  }

  const votesSnapshot = await getDocs(
    query(collection(db, COLLECTIONS.VOTES), where("designId", "==", designId))
  );

  const voteDocs = votesSnapshot.docs.filter((voteDoc) => {
    const vote = voteDoc.data();
    const voteRound = Number(vote.round ?? vote.roundNumber ?? 0);
    return voteRound === activeRound && vote.isSubmitted === true;
  });

  const userIdsNeedingLookup = new Set();
  const userEmailById = new Map();
  const normalizedVotes = voteDocs.map((voteDoc) => {
    const vote = voteDoc.data();
    const userId = vote.userId || vote.uid || "";
    const userEmail = (vote.userEmail || "").trim().toLowerCase();
    const userName = (vote.userName || "").trim();

    if (userId) {
      userIdsNeedingLookup.add(userId);
      if (userEmail) {
        userEmailById.set(userId, userEmail);
      }
    }

    return {
      id: voteDoc.id,
      userId,
      userName,
      userEmail
    };
  });

  const userFallbackById = new Map();
  await Promise.all(
    Array.from(userIdsNeedingLookup).map(async (userId) => {
      try {
        let userSnapshot = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (!userSnapshot.exists()) {
          const userEmailDocId = getUserDocIdFromEmail(userEmailById.get(userId));
          if (userEmailDocId) {
            userSnapshot = await getDoc(doc(db, COLLECTIONS.USERS, userEmailDocId));
          }
        }
        if (!userSnapshot.exists()) {
          return;
        }

        const userData = userSnapshot.data();
        userFallbackById.set(userId, {
          userName: (userData.name || userData.displayName || "").trim(),
          userEmail: (userData.email || "").trim().toLowerCase()
        });
      } catch {
        // If a lookup fails, we still return available vote data.
      }
    })
  );

  const uniqueVotesByUser = new Map();
  normalizedVotes.forEach((vote) => {
    const fallback = vote.userId ? userFallbackById.get(vote.userId) : null;
    const resolvedName = fallback?.userName || vote.userName || "Unknown User";
    const resolvedEmail = fallback?.userEmail || vote.userEmail || "No email";
    const dedupeKey = vote.userId || resolvedEmail.toLowerCase() || vote.id;

    if (!uniqueVotesByUser.has(dedupeKey)) {
      uniqueVotesByUser.set(dedupeKey, {
        userId: vote.userId || dedupeKey,
        userName: resolvedName,
        userEmail: resolvedEmail
      });
    }
  });

  return Array.from(uniqueVotesByUser.values()).sort((left, right) =>
    left.userName.localeCompare(right.userName)
  );
}
