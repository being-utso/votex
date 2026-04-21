import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS, MAX_COMMENT_LENGTH } from "../lib/constants";

const normalizeLikedBy = (likedByValue) => {
  if (!Array.isArray(likedByValue)) {
    return [];
  }

  const seenUids = new Set();

  return likedByValue
    .filter((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const uid = typeof entry.uid === "string" ? entry.uid.trim() : "";
      if (!uid || seenUids.has(uid)) {
        return false;
      }

      seenUids.add(uid);
      return true;
    })
    .map((entry) => {
      const uid = entry.uid.trim();
      const rawName = typeof entry.name === "string" ? entry.name.trim() : "";

      return {
        uid,
        name: rawName || "User"
      };
    });
};

const normalizeComment = (commentDoc) => {
  const data = commentDoc.data() ?? {};
  const likedBy = normalizeLikedBy(data.likedBy);

  return {
    id: commentDoc.id,
    ...data,
    parentId: data.parentId ?? null,
    userName: data.userName || "Anonymous",
    hidden: data.hidden === true,
    likedBy,
    likes: likedBy.length
  };
};

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
      const comments = snapshot.docs.map((commentDoc) => normalizeComment(commentDoc));
      onData(comments);
    },
    (error) => onError?.(error)
  );
}

export async function createComment({ designId, user, text, parentId = null }) {
  if (!user?.uid) {
    throw new Error("You must be signed in to comment.");
  }

  if (!designId) {
    throw new Error("Missing design id.");
  }

  const content = text?.trim() ?? "";
  if (!content) {
    throw new Error("Please write a comment first.");
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
  }

  const normalizedParentId =
    typeof parentId === "string" && parentId.trim() ? parentId.trim() : null;
  const rawUserName = user?.name || user?.displayName || user?.email || "Anonymous";
  const normalizedUserName =
    typeof rawUserName === "string" && rawUserName.trim() ? rawUserName.trim() : "Anonymous";

  await addDoc(collection(db, COLLECTIONS.COMMENTS), {
    designId,
    uid: user.uid,
    userName: normalizedUserName,
    userPhotoURL: user?.photoURL || "",
    text: content,
    parentId: normalizedParentId,
    hidden: false,
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function toggleLike(comment, user) {
  if (!user?.uid) {
    throw new Error("You must be signed in to like comments.");
  }

  if (!comment?.id) {
    throw new Error("Missing comment id.");
  }

  const commentRef = doc(db, COLLECTIONS.COMMENTS, comment.id);
  const rawUserName = user?.name || user?.displayName || user?.email || "User";
  const normalizedUserName =
    typeof rawUserName === "string" && rawUserName.trim() ? rawUserName.trim() : "User";

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(commentRef);
    if (!snapshot.exists()) {
      throw new Error("Comment not found.");
    }

    const commentData = snapshot.data() ?? {};
    const likedBy = normalizeLikedBy(commentData.likedBy);
    const hasLiked = likedBy.some((entry) => entry.uid === user.uid);

    const nextLikedBy = hasLiked
      ? likedBy.filter((entry) => entry.uid !== user.uid)
      : [
          ...likedBy,
          {
            uid: user.uid,
            name: normalizedUserName
          }
        ];

    transaction.update(commentRef, {
      likedBy: nextLikedBy,
      likes: nextLikedBy.length,
      updatedAt: serverTimestamp()
    });

    return {
      liked: !hasLiked,
      likes: nextLikedBy.length,
      likedBy: nextLikedBy
    };
  });
}

export async function deleteComment(commentId) {
  if (!commentId) {
    throw new Error("Missing comment id.");
  }

  const commentsRef = collection(db, COLLECTIONS.COMMENTS);
  const childRepliesSnapshot = await getDocs(
    query(commentsRef, where("parentId", "==", commentId))
  );

  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTIONS.COMMENTS, commentId));
  childRepliesSnapshot.docs.forEach((replyDoc) => {
    batch.delete(replyDoc.ref);
  });

  await batch.commit();
}

export async function toggleHideComment(comment) {
  if (!comment?.id) {
    throw new Error("Missing comment id.");
  }

  const commentRef = doc(db, COLLECTIONS.COMMENTS, comment.id);

  await updateDoc(commentRef, {
    hidden: comment.hidden !== true,
    updatedAt: serverTimestamp()
  });
}
