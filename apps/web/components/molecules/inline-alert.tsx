"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { toneClasses } from "../atoms/tone-classes";

export interface InlineAlertProps {
  readonly message: string | null;
  readonly tone: "error" | "success";
}

export function InlineAlert({ message, tone }: InlineAlertProps) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p
            className={cn(
              "rounded-md border p-3 text-sm",
              toneClasses[tone === "error" ? "danger" : "success"]
            )}
            role={tone === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
