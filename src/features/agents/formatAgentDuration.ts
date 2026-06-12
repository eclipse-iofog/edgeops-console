export const formatAgentDuration = (milliseconds: number): string => {
  if (!milliseconds || milliseconds <= 0) return "N/A";

  const totalSeconds = Math.floor(milliseconds / 1000);

  const days = Math.floor(totalSeconds / (24 * 3600));
  const remainingHours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d${remainingHours}h`;
  }

  if (remainingHours > 0) {
    return `${remainingHours}h${remainingMinutes}m`;
  }

  if (remainingMinutes > 0) {
    return `${remainingMinutes}m${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};
