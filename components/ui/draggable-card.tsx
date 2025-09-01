/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { cn } from "../../lib/utils";
import React from "react";
import { motion } from "framer-motion";
 
export const DraggableCardBody = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative min-h-96 w-80 overflow-hidden rounded-md bg-neutral-100 p-6 shadow-2xl [transform-style:preserve-3d] dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};
 
export const DraggableCardContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center [perspective:1000px]",
        className,
      )}
    >
      {children}
    </div>
  );
};