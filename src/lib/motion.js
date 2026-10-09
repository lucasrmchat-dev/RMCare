/**
 * Configurações e Variantes do Framer Motion baseadas em Física (Spring)
 * Padrão Apple / Vercel / Awwwards (Craft Dev Standards)
 * 
 * - Molas físicas reais (stiffness: 260, damping: 26)
 * - Anima apenas propriedades aceleradas por GPU (transform e opacity)
 * - Stagger sequencial suave (40ms - 60ms)
 * - Compatível com prefers-reduced-motion
 */

export const springPhysics = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 1,
};

export const springSnappy = {
  type: "spring",
  stiffness: 350,
  damping: 28,
};

export const springGentle = {
  type: "spring",
  stiffness: 180,
  damping: 22,
};

// Container pai com stagger progressivo dos filhos
export const staggerContainer = (staggerDelay = 0.05, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: delayChildren,
    },
  },
});

// Elementos filhos com entrada fluida em Y
export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springPhysics,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: "easeOut" },
  },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springPhysics,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15, ease: "easeOut" },
  },
};
