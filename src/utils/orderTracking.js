export const addTrackingHistory = (
  order,
  {
    status,
    courierStatus = null,
    message = "",
  }
) => {
  const lastEvent =
    order.trackingHistory?.[
      order.trackingHistory.length - 1
    ];

  // Same status repeatedly save করবে না
  if (
    lastEvent &&
    lastEvent.status === status &&
    lastEvent.courierStatus ===
      courierStatus
  ) {
    return;
  }

  order.trackingHistory.push({
    status,
    courierStatus,
    message,
    timestamp: new Date(),
  });
};