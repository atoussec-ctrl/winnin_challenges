"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

export interface AnimatedNumberProps {
  readonly format?: (value: number) => string;
  readonly value: number;
}

const defaultFormat = (value: number): string => String(Math.round(value));

export function AnimatedNumber({ format = defaultFormat, value }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const formatRef = useRef(format);
  formatRef.current = format;
  const formatted = useTransform(motionValue, (latest) => formatRef.current(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.7, ease: "easeOut" });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span>{formatted}</motion.span>;
}
