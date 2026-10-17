import { motion } from 'framer-motion';
import { pageVariants } from '../../utils/animations';

/**
 * Unified PageContainer for College ERP
 * Provides consistent entering and exiting page transitions across all routes:
 * - Entering: Fades in while moving slightly upward into its normal position (250ms)
 * - Exiting: Fades out while moving slightly upward (220ms)
 * - Restrained scale change (0.995 -> 1)
 * - Does not animate fixed Topbar or Sidebar
 */
export default function PageContainer({ children, className = 'p-4 sm:p-6 space-y-6' }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
