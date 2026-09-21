export const mapCourierStatus = (
  courierStatus = ""
) => {
  const status =
    String(courierStatus)
      .toLowerCase()
      .trim();

  if (
    status.includes("pending") ||
    status.includes("created")
  ) {
    return "Ready To Ship";
  }

  if (
    status.includes("delivered")
  ) {
    return "Delivered";
  }

  if (
    status.includes("cancel")
  ) {
    return "Cancelled";
  }

  if (
    status.includes("return") ||
    status.includes("reversed")
  ) {
    return "Returned";
  }

  if (
    status.includes("failed")
  ) {
    return "Failed";
  }

  if (
    status.includes("rider") ||
    status.includes("assigned") ||
    status.includes("out for delivery") ||
    status.includes("transit") ||
    status.includes("warehouse") ||
    status.includes("hub") ||
    status.includes("received") ||
    status.includes("dispatch")
  ) {
    return "Shipped";
  }

  return "Shipped";
};