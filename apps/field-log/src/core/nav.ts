/** Home is the single root of the stack: leave a screen by popping, never by pushing or replacing '/'. */
export function homeAction(canGoBack: boolean): 'back' | 'replaceHome' {
  return canGoBack ? 'back' : 'replaceHome';
}
