"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"

export const TextHover = ({
  text,
  className = "",
}: {text:string, className: string}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.div
        className="absolute inset-0 -m-8 rounded-3xl"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(255, 248, 220, 0.08) 0%, rgba(255, 215, 0, 0.04) 40%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <motion.div
        className="relative cursor-pointer select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
      >
        <div
          className="font-light text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            color: "#f8fafc",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          {text}
        </div>
        <motion.div
          className="absolute inset-0 font-light text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none pointer-events-none"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            background: "linear-gradient(135deg, #ffffff 0%, #fff8dc 50%, #ffd700 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered ? 0.9 : 0,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {text}
        </motion.div>
        <motion.div
          className="absolute inset-0 font-light text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none pointer-events-none"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            color: "rgba(255, 255, 255, 0.1)",
            filter: "blur(2px)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {text}
        </motion.div>
      </motion.div>
      <motion.div
        className="absolute -top-2 -left-2 w-1.5 h-1.5 rounded-full bg-linear-to-r from-primary-foreground to-primary"
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isHovered ? 0.6 : 0,
          scale: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
        }}
      />
      <motion.div
        className="absolute -bottom-2 -right-2 w-1.5 h-1.5 rounded-full bg-linear-to-r from-primary to-primary-foreground"
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isHovered ? 0.6 : 0,
          scale: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{
          boxShadow: "0 0 10px rgba(255, 215, 0, 0.4)",
        }}
      />
    </div>
  )
}