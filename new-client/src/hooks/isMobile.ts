const isMobile = window.innerWidth <= 768;

export function useIsMobile(): { isMobile: boolean } {
  return { isMobile };
}
