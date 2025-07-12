"use client"
import type { User as PrismaUser } from "@prisma/client"
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Toast from "../signup/component/toast";
import Modal from "../signup/component/modal";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
    //   if (!session?.user?.hasOnboarded) {
    //     // First time login: show toast and modal
    //     setShowToast(true);
    //     timer.current = setTimeout(() => {
    //       setShowToast(false);
    //       setShowModal(true);
    //     }, 2000);
    //   } else {
    //     // Already onboarded: skip straight to dashboard
    //     router.push("/dashboard");
    //   }
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [status, session]);

  const handleModalCreate = async () => {
    await fetch("/api/user/onboard", {
      method: "PATCH",
    });
    router.push("/dashboard/create");
  };

  const handleModalClose = async () => {
    await fetch("/api/user/onboard", {
      method: "PATCH",
    });
    router.push("/dashboard");
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
