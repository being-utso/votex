import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";

export function listenToDesigns(roundNumber, onData, onError) {
  if (!roundNumber) {
    onData([]);
    return () => {};
  }

  const designsQuery = query(
    collection(db, COLLECTIONS.DESIGNS),
    where("roundId", "==", Number(roundNumber)),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    designsQuery,
    (snapshot) => {
      const designs = snapshot.docs.map((designDoc) => ({
        id: designDoc.id,
        ...designDoc.data()
      }));
      onData(designs);
    },
    (error) => onError?.(error)
  );
}

const isValidImageUrl = (value) => {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

export async function uploadDesign({ imageUrl, title, creatorName, roundNumber }) {
  const normalizedImageUrl = imageUrl?.trim();
  const normalizedTitle = title?.trim();
  const normalizedCreatorName = creatorName?.trim();

  if (!normalizedImageUrl || !isValidImageUrl(normalizedImageUrl)) {
    throw new Error("Please enter a valid image URL.");
  }

  if (!normalizedTitle) {
    throw new Error("Please enter title.");
  }

  if (!normalizedCreatorName) {
    throw new Error("Please enter creator name.");
  }

  const document = await addDoc(collection(db, COLLECTIONS.DESIGNS), {
    imageUrl: normalizedImageUrl,
    title: normalizedTitle,
    creatorName: normalizedCreatorName,
    roundId: Number(roundNumber),
    createdAt: serverTimestamp()
  });

  return document.id;
}

export async function deleteDesignAndVotes(designId) {
  if (!designId) {
    throw new Error("Missing design id.");
  }

  const designRef = doc(db, COLLECTIONS.DESIGNS, designId);
  const votesQuery = query(
    collection(db, COLLECTIONS.VOTES),
    where("designId", "==", designId)
  );
  const voteTotalsQuery = query(
    collection(db, COLLECTIONS.VOTE_TOTALS),
    where("designId", "==", designId)
  );
  const [votesSnapshot, voteTotalsSnapshot] = await Promise.all([
    getDocs(votesQuery),
    getDocs(voteTotalsQuery)
  ]);
  const voteRefs = votesSnapshot.docs.map((voteDoc) => voteDoc.ref);
  const voteTotalRefs = voteTotalsSnapshot.docs.map((totalDoc) => totalDoc.ref);
  const maxDeletesPerBatch = 400;

  for (let index = 0; index < voteRefs.length; index += maxDeletesPerBatch) {
    const chunk = voteRefs.slice(index, index + maxDeletesPerBatch);
    const batch = writeBatch(db);

    chunk.forEach((voteRef) => {
      batch.delete(voteRef);
    });

    await batch.commit();
  }

  for (let index = 0; index < voteTotalRefs.length; index += maxDeletesPerBatch) {
    const chunk = voteTotalRefs.slice(index, index + maxDeletesPerBatch);
    const batch = writeBatch(db);

    chunk.forEach((voteTotalRef) => {
      batch.delete(voteTotalRef);
    });

    await batch.commit();
  }

  const deleteDesignBatch = writeBatch(db);
  deleteDesignBatch.delete(designRef);
  await deleteDesignBatch.commit();

  return {
    deletedVoteCount: votesSnapshot.size,
    deletedVoteTotalCount: voteTotalsSnapshot.size
  };
}
