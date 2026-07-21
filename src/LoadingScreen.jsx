import React from 'react'
import { motion } from 'framer-motion'

/**
 * LoadingScreen Component for PolyNet
 * 
 * @param {string} message - Custom message to display below the spinner (default: "Loading PolyNet...")
 * @param {boolean} fullScreen - Whether to take up the full viewport or fit inside a parent container (default: true)
 */
export default function LoadingScreen({ message = "Loading PolyNet...", fullScreen = true }) {
  
  // Dynamic styles based on fullScreen prop
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justify: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
  } : {
    width: '100%',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justify: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '24px',
  }

  return (
    <div style={containerStyle}>
      {/* Background Soft Glow (Full Screen Mode Only) */}
      {fullScreen && (
        <div
          style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
        
        {/* Pulsing Logo Container */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ marginBottom: '20px', position: 'relative' }}
        >
          <img
            src="/logo.png"
            alt="Loading..."
            onError={(e) => {
              // Graceful fallback if image URL fails
              e.target.style.display = 'none'
            }}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              objectFit: 'contain',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.18)',
            }}
          />
        </motion.div>

        {/* Animated Bouncing Dots */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -8, 0],
                backgroundColor: ['#CBD5E1', '#7C3AED', '#CBD5E1'],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
              }}
            />
          ))}
        </div>

        {/* Loading Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.2px',
            textAlign: 'center',
          }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  )
}