import { PADDLE_TOKEN } from '@/lib/constants';

let paddleInitialized = false;

export function initPaddle(): Promise<void> {
  return new Promise((resolve) => {
    if (paddleInitialized || typeof window === 'undefined') { resolve(); return; }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({ 
          token: PADDLE_TOKEN,
          eventCallback: (event: PaddleEvent) => {
            if (event.name === 'checkout.completed') {
              window.dispatchEvent(new CustomEvent('paddle:checkout-complete', { detail: event.data }));
            }
          }
        });
        paddleInitialized = true;
      }
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export function openCheckout(priceId: string, customData?: Record<string, string>) {
  if (!window.Paddle) return;
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData,
  });
}

// Type declarations
interface PaddleEvent { name: string; data: Record<string, unknown>; }
declare global {
  interface Window {
    Paddle: {
      Initialize: (config: Record<string, unknown>) => void;
      Checkout: { open: (config: Record<string, unknown>) => void };
    };
  }
}
