"use client";

import { motion } from "framer-motion";

/**
 * Componentes de Carregamento Progressivo (Skeleton Loaders)
 * Padrão Apple / Vercel: alto contraste, shimmer sutil, bordas precisas e zero layout shift.
 */

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/70 ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 space-y-4 shadow-xs ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-4/5 h-3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/60 shadow-xs">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {/* Linhas */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3 w-1/4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 w-1/5" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        <Skeleton className="w-28 h-3.5" />
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-36 h-3.5" />
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
      <Skeleton className="w-full h-10 rounded-lg pt-2" />
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <Skeleton className="w-32 h-5" />
        <div className="flex gap-2">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 pt-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
