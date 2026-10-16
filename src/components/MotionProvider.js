"use client";

import { MotionConfig } from "framer-motion";

// Respeita a preferência "reduzir movimento" do sistema em todas as animações do framer-motion
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
