export default () => {
  const minLines = 40;
  const maxLines = 180;

  const lineHeight = 19;
  const screenHeight = window.screen.availHeight;
  const twoScreenfulls = Math.floor((screenHeight / lineHeight) * 2);

  return Math.min(Math.max(twoScreenfulls, minLines), maxLines);
};
