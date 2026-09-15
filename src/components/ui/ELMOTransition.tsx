"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ELMOTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  type?: "fade" | "scale" | "slide-up";
}

export function ELMOTransition({
  show,
  children,
  className,
  type = "fade",
}: ELMOTransitionProps) {
  if (!show) return null;

  const animationClass = {
    fade: "animate-in fade-in duration-300",
    scale: "animate-in fade-in zoom-in-95 duration-300",
    "slide-up": "animate-in fade-in slide-in-from-bottom-6 duration-300",
  }[type];

  return <div className={cn(animationClass, className)}>{children}</div>;
}
