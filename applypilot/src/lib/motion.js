// src/lib/motion.ts - ApplyPilot v2 Motion System
export const spring = { stiffness: 280, damping: 22 };
export const springSnappy = { stiffness: 400, damping: 30 };
export const springBounce = { stiffness: 300, damping: 16 };
export const pageEnter = {
    initial: { y: 12, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.32, ease: "easeOut" } },
};
export const cardEntrance = (i) => ({
    initial: { x: 40, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { delay: Math.min(i * 0.04, 0.48), type: "spring", ...spring } },
});
export const cardHover = {
    whileHover: { translateZ: 8, rotateX: -4, transition: { type: "spring", ...spring } },
};
export const cardFlip = {
    initial: { rotateY: 0 },
    flipped: { rotateY: 180, transition: { duration: 0.4, ease: "easeInOut" } },
};
export const pillEntrance = (i) => ({
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { delay: i * 0.03, type: "spring", stiffness: 300 } },
});
export const staggerContainer = {
    animate: { transition: { staggerChildren: 0.04 } },
};
export const bulletRow = {
    initial: { x: -16, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.24, ease: "easeOut" } },
};
