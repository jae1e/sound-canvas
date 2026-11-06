import { homeAction } from '../core';

interface RouterLike {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
}

/** Returns to Home by popping the stack (replaces only when there is nothing to pop to). */
export function goHome(router: RouterLike): void {
  if (homeAction(router.canGoBack()) === 'back') router.back();
  else router.replace('/');
}
