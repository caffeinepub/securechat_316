import { Principal } from "@dfinity/principal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  decryptMessage,
  deriveDirectChatKey,
  encryptMessage,
  exportKeyPairAsJwk,
  exportPublicKey,
  generateKeyPair,
  importKeyPairFromJwk,
  importPublicKey,
  isEncryptedMessage,
  unwrapGroupKey,
  wrapGroupKey,
} from "../utils/e2ee";
import { getKeyPair, saveKeyPair } from "../utils/keyStore";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import type { ConversationPreview, Message } from "./useQueries";
import { ConversationType } from "./useQueries";

interface UseE2EEResult {
  encryptionReady: boolean;
  isInitializing: boolean;
  encrypt: (plaintext: string) => Promise<string>;
  decryptMessages: (messages: Message[]) => Promise<Map<bigint, string>>;
  myPublicKeyRaw: Uint8Array | null;
}

export function useE2EE(
  conversation: ConversationPreview | null,
): UseE2EEResult {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const [encryptionReady, setEncryptionReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [myPublicKeyRaw, setMyPublicKeyRaw] = useState<Uint8Array | null>(null);
  const conversationKeyRef = useRef<CryptoKey | null>(null);

  const isGroup = conversation?.conversationType === ConversationType.Group;

  // Initialize: ensure we have a key pair and derive/fetch conversation key
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!actor || !myPrincipal || !conversation) {
      setIsInitializing(false);
      return;
    }

    // Reset on conversation change
    conversationKeyRef.current = null;
    setEncryptionReady(false);
    setIsInitializing(true);

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let keyPairCache: CryptoKeyPair | null = null;

    const ensureKeyPair = async (): Promise<CryptoKeyPair> => {
      if (keyPairCache) return keyPairCache;

      let myKeyPair: CryptoKeyPair;

      // Check IndexedDB
      const storedKp = await getKeyPair(myPrincipal);
      if (storedKp) {
        myKeyPair = await importKeyPairFromJwk(storedKp);
      } else {
        // Generate new key pair
        myKeyPair = await generateKeyPair();
        const jwk = await exportKeyPairAsJwk(myKeyPair);
        await saveKeyPair(myPrincipal, jwk);
      }

      const pubRaw = await exportPublicKey(myKeyPair.publicKey);
      setMyPublicKeyRaw(pubRaw);

      // Publish our public key to backend
      try {
        await actor.publishPublicKey(pubRaw);
      } catch {
        // May fail if already published — acceptable
      }

      keyPairCache = myKeyPair;
      return myKeyPair;
    };

    const deriveDirectKey = async (
      conv: ConversationPreview,
      myKeyPair: CryptoKeyPair,
    ): Promise<boolean> => {
      if (!conv.members || conv.members.length === 0) return false;

      const peerPrincipal = conv.members[0].principal.toString();
      const peerKeyBlob = await actor.getPublicKey(
        Principal.fromText(peerPrincipal),
      );
      if (!peerKeyBlob) return false;

      const peerPubKey = await importPublicKey(new Uint8Array(peerKeyBlob));
      const convKey = await deriveDirectChatKey(
        myKeyPair.privateKey,
        peerPubKey,
      );
      conversationKeyRef.current = convKey;
      return true;
    };

    const deriveGroupKey = async (
      conv: ConversationPreview,
      myKeyPair: CryptoKeyPair,
    ): Promise<boolean> => {
      const wrappedResult = await actor.getMyGroupKey(conv.id);
      if (!wrappedResult) return false;

      const wrapped = wrappedResult as {
        encryptedKey: Uint8Array;
        wrappedBy: Principal;
      };
      const wrapperKeyBlob = await actor.getPublicKey(
        Principal.fromText(wrapped.wrappedBy.toString()),
      );
      if (!wrapperKeyBlob) return false;

      const wrapperPubKey = await importPublicKey(
        new Uint8Array(wrapperKeyBlob),
      );
      const pairwiseKey = await deriveDirectChatKey(
        myKeyPair.privateKey,
        wrapperPubKey,
      );
      const groupKey = await unwrapGroupKey(
        new Uint8Array(wrapped.encryptedKey),
        pairwiseKey,
      );
      conversationKeyRef.current = groupKey;

      // If admin, re-distribute group key to members who may have been
      // missed during initial creation (their public key wasn't published yet)
      const adminPrincipal = conv.groupInfo?.admin?.toString();
      if (adminPrincipal === myPrincipal) {
        distributeToMissingMembers(conv, myKeyPair, groupKey).catch(() => {});
      }

      return true;
    };

    // Wrap and publish the group key for all members whose public keys
    // are available. Idempotent — safe to call even if keys already exist.
    const distributeToMissingMembers = async (
      conv: ConversationPreview,
      myKeyPair: CryptoKeyPair,
      groupKey: CryptoKey,
    ) => {
      const memberPrincipals = conv.members.map((m) => m.principal.toString());
      if (memberPrincipals.length === 0) return;

      const pubKeys = await actor.getPublicKeys(
        memberPrincipals.map((p) => Principal.fromText(p)),
      );
      if (pubKeys.length === 0) return;

      const wrappedKeys: [Principal, Uint8Array][] = [];
      for (const [principal, keyBlob] of pubKeys) {
        const memberPubKey = await importPublicKey(
          new Uint8Array(keyBlob as any),
        );
        const pairwiseKey = await deriveDirectChatKey(
          myKeyPair.privateKey,
          memberPubKey,
        );
        const wrapped = await wrapGroupKey(groupKey, pairwiseKey);
        wrappedKeys.push([principal, wrapped]);
      }

      if (wrappedKeys.length > 0) {
        await actor.publishGroupKeys(conv.id, wrappedKeys);
      }
    };

    let distributeInterval: ReturnType<typeof setInterval> | null = null;

    const attempt = async () => {
      try {
        const myKeyPair = await ensureKeyPair();
        if (cancelled) return;

        const ready = isGroup
          ? await deriveGroupKey(conversation, myKeyPair)
          : await deriveDirectKey(conversation, myKeyPair);

        if (cancelled) return;

        if (ready) {
          setEncryptionReady(true);

          // If admin of a group, periodically distribute group key to members
          // whose public keys weren't available during initial distribution
          const adminPrincipal = conversation.groupInfo?.admin?.toString();
          if (
            isGroup &&
            adminPrincipal === myPrincipal &&
            conversationKeyRef.current
          ) {
            const groupKey = conversationKeyRef.current;
            distributeInterval = setInterval(() => {
              if (!cancelled) {
                distributeToMissingMembers(
                  conversation,
                  myKeyPair,
                  groupKey,
                ).catch(() => {});
              }
            }, 5000);
          }
        } else {
          // Peer key not available yet — retry in 3s
          retryTimer = setTimeout(attempt, 3000);
        }
      } catch (err) {
        console.error("E2EE init failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    attempt();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (distributeInterval) clearInterval(distributeInterval);
    };
  }, [actor, myPrincipal, conversation?.id, isGroup]);

  const encrypt = useCallback(async (plaintext: string): Promise<string> => {
    if (!conversationKeyRef.current) return plaintext;
    return encryptMessage(plaintext, conversationKeyRef.current);
  }, []);

  const decryptMessages = useCallback(
    async (messages: Message[]): Promise<Map<bigint, string>> => {
      const result = new Map<bigint, string>();
      const key = conversationKeyRef.current;

      for (const msg of messages) {
        if (isEncryptedMessage(msg.content) && key) {
          try {
            const decrypted = await decryptMessage(msg.content, key);
            result.set(msg.id, decrypted);
          } catch {
            result.set(msg.id, "[Unable to decrypt]");
          }
        } else {
          result.set(msg.id, msg.content);
        }
      }
      return result;
    },
    [],
  );

  return {
    encryptionReady,
    isInitializing,
    encrypt,
    decryptMessages,
    myPublicKeyRaw,
  };
}
