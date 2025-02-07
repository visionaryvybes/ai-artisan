import sharp from 'sharp';

// Configure Sharp globally
export function configureSharp() {
  try {
    // Reset any existing configuration
    sharp.cache(false);
    sharp.concurrency(1);
    
    // Basic configuration
    sharp.cache({ files: 0 });  // Disable file cache
    sharp.cache({ items: 20 }); // Reduce items cache for better stability
    sharp.concurrency(2);       // Limit concurrent operations
    
    // Enable hardware acceleration if available
    const simdEnabled = sharp.simd();
    
    // Set resource limits
    sharp.queue.on('change', function(queueLength) {
      if (queueLength > 5) {
        console.warn(`Sharp queue length high: ${queueLength}`);
      }
    });

    // Log configuration
    const sharpInfo = {
      version: sharp.versions.sharp,
      libvips: sharp.versions.vips,
      memory: sharp.cache(),
      concurrency: sharp.concurrency(),
      simd: simdEnabled
    };
    console.log('Sharp configuration:', sharpInfo);

    return true;
  } catch (error) {
    console.error('Error configuring Sharp:', error);
    // Try to reset to default configuration
    try {
      sharp.cache(false);
      sharp.concurrency(1);
    } catch (resetError) {
      console.error('Failed to reset Sharp configuration:', resetError);
    }
    throw new Error(`Failed to configure Sharp: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cleanup Sharp resources
export function cleanupSharp() {
  try {
    sharp.cache(false);
    sharp.concurrency(0);
    
    if (global.gc) {
      global.gc();
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up Sharp:', error);
    return false;
  }
} 