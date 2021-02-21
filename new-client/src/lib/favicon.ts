import Favico from 'favico.js';

const DEFAULT_FAVICON =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QB0RXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAABIAAAAAQAAAEgAAAABAAKgAgAEAAAAAQAAACCgAwAEAAAAAQAAACAAAAAA/8AAEQgAIAAgAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwQDAwMEBQQEBAQFBwUFBQUFBwgHBwcHBwcICAgICAgICAoKCgoKCgsLCwsLDQ0NDQ0NDQ0NDf/bAEMBAgICAwMDBgMDBg0JBwkNDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDf/dAAQAAv/aAAwDAQACEQMRAD8A0tX1fUte1K41jWLiS7vLuRpZppWLMzMcnk/oO1a954J8Waf4ctvF97pdxDo144SC9Zf3UjNuwAffY35Vy1foJqsK6v8AAG38BMN0yeCbXxLar3U2VyXnI9S0bgfSv7Rz7OZZW8NClBcs5qL8o9WrdvyP4X4dyOObLFTrTfNCDkv70+id++q9bHxJZeCfFmo+HLrxdY6XcTaNZOUuL1V/dRsu3IJ9t6/nWRpGr6loOpW+saPcSWl5aSLLDNExVlZTkcj9R3r7v8PxrpvwA1DwKOJf+EKuPElwB/E19cO8RPusUQx7Gvz+p5FnEszliadaC5YTcV5xto3fv+QuIckjlUcJVozfNOCk/wC7O+qVu35n/9Ar7i13xVpfgb4gfCseIJPK0f8A4QSystSO1mH2e8imiclVDMcMFYgAnivi/V9I1LQdSuNH1i3ktLy0kaKaGVSrKynB4P6HvVjXPEeueJZre4128lvZLS2js4GlOTHbxZ2RjgfKuTj61/a+bZRDM5Um5fu+Wadt3zxsmntpq7n8IZNnU8qhVio/veaDV9lyS5mpLfXRW9T7J8L+JtK8Z+OfipB4elM2kHwNdWWmnayg21jDFAhCsFYZJLYIB56V8OVt6F4k13wzPcXOg3stlLd20lnO0RwZLeXG+M5B+Vtoz9KraRpGpa9qVvo+j28l3eXcixQwxKWZmY4HA/U9qMpyiOWzqzUv3bjBK+65I2bb0WujuGcZ1LNadGDj+8Upt22fPLmSitXpdq3of//Z';

let faviconLabel: Favico;

export function setFavicon(): void {
  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
  }

  link.href = DEFAULT_FAVICON;

  if (!link) {
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  console.log('set!');
}

export function setUnreadMessageCountBadge(unreadMessages: number): void {
  if (!faviconLabel) {
    setFavicon();

    faviconLabel = new Favico({
      animation: 'slide'
    });
  }

  try {
    unreadMessages === 0 ? faviconLabel.reset() : faviconLabel.badge(unreadMessages);
  } catch {
    // TODO: Send rollbar
  }
}
