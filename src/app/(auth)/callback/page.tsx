"use client"
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                router.push('/login?error=' + error);
                return;
            }

            if (!code) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch('/api/auth/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                });

                if (response.ok) {
                    router.push('/dashboard');
                } else {
                    router.push('/login?error=auth_failed');
                }
            } catch (error) {
                router.push('/login?error=server_error');
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return <div>Authenticating...</div>;
}

export default function CallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}