"use client";

import { ShaderBackground } from "@/components/ui/digital-aurora";

export function NetworkBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <ShaderBackground />
    </div>
  );
}
