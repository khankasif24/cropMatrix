import { useState, useRef, useCallback, useEffect } from 'react';
import { speechToText } from '../services/api';

/**
 * Custom hook for speech-to-text using Azure Cognitive Services.
 * 
 * Records audio as raw PCM WAV (Azure-compatible) using AudioContext,
 * sends to backend /api/speech-to-text, which forwards to Azure.
 */

const MAX_RECORDING_MS = 15000; // 15 seconds max

/**
 * Convert Float32 PCM samples to a WAV Blob (16-bit PCM, mono, 16kHz)
 */
function encodeWAV(samples, sampleRate) {
  // Downsample to 16kHz if needed
  let outputSamples = samples;
  if (sampleRate !== 16000) {
    const ratio = sampleRate / 16000;
    const newLength = Math.round(samples.length / ratio);
    outputSamples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      outputSamples[i] = samples[Math.round(i * ratio)];
    }
    sampleRate = 16000;
  }

  const buffer = new ArrayBuffer(44 + outputSamples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + outputSamples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);   // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, outputSamples.length * 2, true);

  // Convert float32 to int16
  for (let i = 0; i < outputSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, outputSamples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function useSpeechRecognition({
  lang = 'en-IN',
  onResult,
  onError,
  maxDuration = MAX_RECORDING_MS,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const langRef = useRef(lang);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const isSupported = typeof navigator !== 'undefined'
    && navigator.mediaDevices
    && (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined');

  /**
   * Process recorded PCM samples → WAV blob → Azure API
   */
  const processAudio = useCallback(async (chunks, sampleRate) => {
    if (chunks.length === 0) {
      setError('No audio recorded');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Merge all chunks into a single Float32Array
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Encode as WAV (16-bit PCM, mono, 16kHz)
      const wavBlob = encodeWAV(merged, sampleRate);

      console.log(`[STT] Sending WAV: ${(wavBlob.size / 1024).toFixed(1)}KB, sampleRate=${sampleRate}, lang=${langRef.current}`);

      // Send to backend → Azure
      const result = await speechToText(wavBlob, langRef.current);

      console.log('[STT] Result:', result);

      if (result.text) {
        if (onResultRef.current) {
          onResultRef.current(result.text);
        }
        setError(null);
      } else if (result.status === 'no_match' || result.status === 'silence') {
        const errMsg = result.error || 'Could not recognize speech. Please try again.';
        setError(errMsg);
        if (onErrorRef.current) onErrorRef.current(errMsg);
      }
    } catch (err) {
      console.error('[STT] Error:', err);
      const errMsg = err?.message || 'Speech recognition failed. Please try again.';
      setError(errMsg);
      if (onErrorRef.current) onErrorRef.current(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Cleanup all audio resources
   */
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (_) {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Start recording audio from microphone as raw PCM
   */
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser.');
      return;
    }
    if (isProcessing) return;

    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM data
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the data (it gets reused by the audio system)
        chunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        stopListeningInternal();
      }, maxDuration);

    } catch (err) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Could not access microphone: ${err.message}`);
      }
      setIsListening(false);
      cleanup();
    }
  }, [isSupported, isProcessing, maxDuration, cleanup]);

  /**
   * Internal stop that triggers processing
   */
  const stopListeningInternal = useCallback(() => {
    const sampleRate = audioContextRef.current?.sampleRate || 16000;
    const chunks = [...chunksRef.current];

    setIsListening(false);
    cleanup();

    if (chunks.length > 0) {
      processAudio(chunks, sampleRate);
    }
  }, [cleanup, processAudio]);

  const stopListening = useCallback(() => {
    stopListeningInternal();
  }, [stopListeningInternal]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    isListening,
    isProcessing,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}

export default useSpeechRecognition;
