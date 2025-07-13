"use client"
import type { User as PrismaUser } from "@prisma/client"
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

// Extend the User type from NextAuth to include hasOnboarded
type SessionUser = PrismaUser & { hasOnboarded?: boolean };
import { useRouter } from "next/navigation";
import Toast from "../../(auth)/signup/component/toast";
import Modal from "../../(auth)/signup/component/modal";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") {
      if (!(session?.user as SessionUser)?.hasOnboarded) {
      
        // First time login: show toast and modal
        setShowToast(true);
        timer.current = setTimeout(() => {
          setShowToast(false);
          setShowModal(true);
        }, 2000);
      } else {
        // Already onboarded: skip straight to dashboard
        router.push("/");
      }
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [status, session]);

  const handleModalCreate = async () => {
    await fetch("/api/auth/onboard", {
      method: "PATCH",
    });
    router.push("/onboarding");
  };

  const handleModalClose = async () => {
    await fetch("/api/auth/onboard", {
      method: "PATCH",
    });
    router.push("/");
  };

  return (
    <>
      {showToast && <Toast message="Account created successfully, Please wait...!" />}
      <Modal
        show={showModal}
        onClose={handleModalClose}
        onCreate={handleModalCreate}
      />
    </>
  );
}
