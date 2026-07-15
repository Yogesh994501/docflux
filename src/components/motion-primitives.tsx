'use client'

import { motion, useInView, useMotionValue, useSpring, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── AnimatedCounter — React Bits style count-up ──────────────────────────────

export function AnimatedCounter({
  value,
  duration = 1.2,
  format = (n: number) => n.toLocaleString(),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf: number
    const start = performance.now()
    const from = 0
    const animate = (now: number) => {
      const elapsed = (now - start) / 1000
      const t = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  )
}

// ─── SpotlightCard — mouse-follow glow (React Bits) ───────────────────────────

export function SpotlightCard({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'> & { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set(e.clientX - rect.left)
    y.set(e.clientY - rect.top)
    ref.current?.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    ref.current?.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn('spotlight-card premium-card rounded-[14px]', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ─── FadeInUp — staggered entrance ────────────────────────────────────────────

export function FadeInUp({
  children,
  delay = 0,
  className,
  y = 16,
}: {
  children: ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── StaggerContainer + StaggerItem — for lists ───────────────────────────────

export function StaggerContainer({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode
  className?: string
  stagger?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 20,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── TiltCard — 3D tilt on hover (React Bits) ─────────────────────────────────

export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(0, { stiffness: 300, damping: 20 })
  const rotateY = useSpring(0, { stiffness: 300, damping: 20 })

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    rotateY.set(px * max)
    rotateX.set(-py * max)
  }

  const handleLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      className={cn('premium-card rounded-[14px]', className)}
    >
      <div style={{ transform: 'translateZ(20px)' }}>{children}</div>
    </motion.div>
  )
}

// ─── AuroraText — animated gradient text ──────────────────────────────────────

export function AuroraText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('aurora-text', className)}>{children}</span>
}

// ─── PageTransition — section switch animation ────────────────────────────────

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── ScaleIn — for modals, cards ──────────────────────────────────────────────

export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
