'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';

/**
 * Custom install button for Android/Chrome (beforeinstallprompt)
 * and an iOS Safari hint (Share → Add to Home Screen).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed or dismissed? Don't show.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('install-dismissed')) return;

    // Android / Chrome: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari detection
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA Install]', outcome);
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  }, [deferredPrompt]);

  const dismiss = () => {
    setDismissed(true);
    setShowAndroidPrompt(false);
    setShowIOSHint(false);
    sessionStorage.setItem('install-dismissed', '1');
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {/* Android / Chrome: custom install button */}
      {showAndroidPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 bg-slate-900/95 border border-yellow-500/40 backdrop-blur-lg rounded-2xl p-4 shadow-2xl flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-lg shrink-0">
            N
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Install NextStation</div>
            <div className="text-[11px] text-slate-400">Add to home screen for the full experience</div>
          </div>
          <button
            onClick={handleInstall}
            className="min-h-[40px] bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shrink-0 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
          <button onClick={dismiss} className="p-1 text-slate-500 hover:text-slate-300 transition">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* iOS Safari: Share → Add to Home Screen hint */}
      {showIOSHint && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 bg-slate-900/95 border border-slate-700 backdrop-blur-lg rounded-2xl p-4 shadow-2xl flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-lg shrink-0">
            N
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Install NextStation</div>
            <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
              Tap <Share className="w-3 h-3 inline-block text-blue-400 -mt-0.5" /> <strong>Share</strong> in Safari, then <strong>&quot;Add to Home Screen&quot;</strong> to install.
            </div>
          </div>
          <button onClick={dismiss} className="p-1 text-slate-500 hover:text-slate-300 transition shrink-0">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
