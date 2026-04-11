import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../lib/constants";

export function listenToUsers(onData, onError) {
  const usersQuery = query(
    collection(db, COLLECTIONS.USERS),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data()
      }));
      onData(users);
    },
    (error) => onError?.(error)
  );
}

export async function approveUser(userId) {
  if (!userId) {
    throw new Error("Missing user id.");
  }

  await setDoc(
    doc(db, COLLECTIONS.USERS, userId),
    {
      isApproved: true,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function deleteUser(userId) {
  if (!userId) {
    throw new Error("Missing user id.");
  }

  await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
}

export async function deleteUserAndVotes(user) {
  const userDocId = user?.id || user?.uid;
  const userUid = user?.uid || "";
  if (!userDocId && !userUid) {
    throw new Error("Missing user id.");
  }

  const email = user?.email?.trim() ?? "";
  const normalizedEmail = email.toLowerCase();
  const votesCollectionRef = collection(db, COLLECTIONS.VOTES);

  const voteQueries = [];
  if (userUid) {
    voteQueries.push(query(votesCollectionRef, where("userId", "==", userUid)));
    voteQueries.push(query(votesCollectionRef, where("uid", "==", userUid)));
  }
  if (userDocId && userDocId !== userUid) {
    voteQueries.push(query(votesCollectionRef, where("userId", "==", userDocId)));
    voteQueries.push(query(votesCollectionRef, where("uid", "==", userDocId)));
  }

  if (email) {
    voteQueries.push(query(votesCollectionRef, where("userEmail", "==", email)));
  }

  if (normalizedEmail && normalizedEmail !== email) {
    voteQueries.push(query(votesCollectionRef, where("userEmail", "==", normalizedEmail)));
  }

  const snapshots = await Promise.all(voteQueries.map((votesQuery) => getDocs(votesQuery)));
  const voteDocsById = new Map();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((voteDoc) => {
      voteDocsById.set(voteDoc.id, voteDoc);
    });
  });

  const voteRefs = Array.from(voteDocsById.values()).map((voteDoc) => voteDoc.ref);
  const maxDeletesPerBatch = 400;
  for (let index = 0; index < voteRefs.length; index += maxDeletesPerBatch) {
    const chunk = voteRefs.slice(index, index + maxDeletesPerBatch);
    const batch = writeBatch(db);
    chunk.forEach((voteRef) => {
      batch.delete(voteRef);
    });
    await batch.commit();
  }

  if (userDocId) {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userDocId));
  }

  return {
    deletedVotes: voteRefs.length
  };
}
