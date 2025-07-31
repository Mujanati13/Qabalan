// Enhanced notification sound utility for new orders
// Creates a distinctive audio alert that's pleasant but attention-grabbing

export const createNotificationSound = () => {
  // Create a pleasant notification sound using Web Audio API
  let audioContext;
  let isPlaying = false;
  
  const initAudioContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  };
  
  const playSound = () => {
    // Prevent overlapping sounds
    if (isPlaying) {
      return Promise.resolve();
    }
    
    try {
      const ctx = initAudioContext();
      isPlaying = true;
      
      // Create a pleasant two-tone notification sound
      const playTone = (frequency, startTime, duration, volume = 0.3) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Smooth attack and decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(volume * 0.7, startTime + duration * 0.7);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
        
        return oscillator;
      };
      
      const now = ctx.currentTime;
      
      // First tone (higher pitch)
      playTone(880, now, 0.3, 0.25);
      
      // Second tone (lower pitch) - slight overlap for harmony
      playTone(660, now + 0.15, 0.4, 0.2);
      
      // Reset playing flag after sound completes
      setTimeout(() => {
        isPlaying = false;
      }, 600);
      
      return Promise.resolve();
    } catch (error) {
      isPlaying = false;
      console.error('Failed to play notification sound:', error);
      return Promise.reject(error);
    }
  };
  
  return { 
    play: playSound,
    isPlaying: () => isPlaying
  };
};

// Alternative: Use HTML5 Audio with data URL
export const createBeepSound = () => {
  // Create a simple beep sound as data URL
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.3; // 300ms
  const frequency = 800; // 800Hz
  
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
  }
  
  const playSound = () => {
    try {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to play beep sound:', error);
      return Promise.reject(error);
    }
  };
  
  return { play: playSound };
};
