"use client";

import { motion } from "framer-motion";

export function SkeletonItem({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-200/60 dark:bg-zinc-800/40 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 dark:before:via-white/5 before:to-transparent ${className}`}
    />
  );
}

export function SkeletonCard({ count = 1 }) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl bg-white/60 dark:bg-[#0d0d0d]/60 backdrop-blur-xl border border-zinc-200/70 dark:border-white/5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-4">
            <SkeletonItem className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonItem className="h-4 w-1/3" />
              <SkeletonItem className="h-3 w-1/2" />
            </div>
          </div>
          <SkeletonItem className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-[#0d0d0d]/60 backdrop-blur-xl border border-zinc-200/70 dark:border-white/5 space-y-5 w-full">
      <div className="flex justify-between items-center">
        <SkeletonItem className="h-5 w-32" />
        <div className="flex gap-2">
          <SkeletonItem className="w-8 h-8 rounded-lg" />
          <SkeletonItem className="w-8 h-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <SkeletonItem key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonSlots() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonItem key={i} className="h-11 rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white/60 dark:bg-[#0d0d0d]/60 backdrop-blur-xl border border-zinc-200/70 dark:border-white/5 space-y-3"
        >
          <SkeletonItem className="w-8 h-8 rounded-xl" />
          <SkeletonItem className="h-4 w-1/2" />
          <SkeletonItem className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}
