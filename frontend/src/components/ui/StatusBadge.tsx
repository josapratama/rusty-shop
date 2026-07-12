import { getOrderStatusColor, getOrderStatusLabel } from "../../utils/format";
import type { OrderStatus } from "../../types";

interface Props {
  status: OrderStatus;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(status)}`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}
