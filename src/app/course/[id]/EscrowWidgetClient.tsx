'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  courseId: string;
  isOwner: boolean;
  isPaid: boolean;
  priceAda: number | null;
  initialGrossAda?: number | null;
  showFaucetLink?: boolean;
};

export default function EscrowWidgetClient(props: Props) {
  const [Comp, setComp] = useState<React.ComponentType<Props> | null>(null);

  useEffect(() => {
    let mounted = true;
    import('./EscrowWidget').then((mod) => {
      if (mounted) setComp(() => mod.EscrowWidget);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) return null;
  return <Comp {...props} />;
}
