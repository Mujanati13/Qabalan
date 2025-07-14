// Simple notification sound utility
// You can replace this with a real audio file in the public directory

export const createNotificationSound = () => {
  // Create a simple beep sound using Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playSound = () => {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      return Promise.reject(error);
    }
  };
  
  return { play: playSound };
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
