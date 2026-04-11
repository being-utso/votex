import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS, MAX_COMMENT_LENGTH } from "../lib/constants";

export function listenToComments(designId, onData, onError) {
  if (!designId) {
    onData([]);
    return () => {};
  }

  const commentsQuery = query(
    collection(db, COLLECTIONS.COMMENTS),
    where("designId", "==", designId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((commentDoc) => ({
        id: commentDoc.id,
        ...commentDoc.data()
      }));
      onData(comments);
    },
    (error) => onError?.(error)
  );
}

export async function createComment({ designId, user, text }) {
  if (!user?.uid) {
    throw new Error("You must be signed in to comment.");
  }

  const content = text?.trim() ?? "";
  if (!content) {
    throw new Error("Please write a comment first.");
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
  }

  await addDoc(collection(db, COLLECTIONS.COMMENTS), {
    designId,
    uid: user.uid,
    userName: user.displayName || user.email || "Anonymous",
    userPhotoURL: user.photoURL || "",
    text: content,
    createdAt: serverTimestamp()
  });
}
