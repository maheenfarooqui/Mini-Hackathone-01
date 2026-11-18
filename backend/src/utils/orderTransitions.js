export function canTransitionOrder(currentStatus, nextStatus) {
  return (
    (currentStatus === "Pending" &&
      ["Processing", "Cancelled"].includes(nextStatus)) ||
    (currentStatus === "Processing" && nextStatus === "Completed")
  );
}
